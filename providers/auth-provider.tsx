'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants/api';
import { isSuperadminDomain, getPlayerFrontendUrl } from '@/lib/utils/domain';
import {
  PROJECT_UUID_MANUAL_TTL_MS,
  clearCachedProjectUuid,
  isValidProjectUuid,
  readCachedProjectUuid,
  writeCachedProjectUuid,
} from '@/lib/utils/project-uuid';
import type { AuthUser, LoginRequest } from '@/types';

export interface LoginOptions {
  /** Omit the project UUID and require a superadmin account. */
  superadmin?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFetchingUuid: boolean;
  uuidFetchError: string | null;
  login: (credentials: LoginRequest, options?: LoginOptions) => Promise<void>;
  logout: () => void;
  refetchUuid: () => Promise<string | undefined>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingUuid, setIsFetchingUuid] = useState(false);
  const [uuidFetchError, setUuidFetchError] = useState<string | null>(null);
  const router = useRouter();

  const fetchAndStoreProjectUuid = useCallback(async (forceRefresh = false) => {
    try {
      setUuidFetchError(null);

      if (forceRefresh) {
        clearCachedProjectUuid();
      } else {
        const existingUuid = readCachedProjectUuid();
        if (existingUuid) {
          console.log(' Using cached project UUID:', existingUuid);
          return existingUuid;
        }
        // Drop legacy/expired/mismatched entries so other readers cannot use them.
        clearCachedProjectUuid();
      }

      setIsFetchingUuid(true);

      console.log('🔄 Fetching project UUID via /api/auth/dashboard-games proxy...');
      const response = await authApi.fetchProjectUuid();

      console.log('📦 Response received:', response);

      // Try multiple possible field names - check nested data first
      const rawUuid =
        response.data?.whitelabel_admin_uuid ||
        response.data?.project_uuid ||
        response.data?.uuid ||
        response.whitelabel_admin_uuid ||
        response.project_uuid ||
        response.uuid;
      const uuid = typeof rawUuid === 'string' ? rawUuid.trim() : undefined;

      if (!isValidProjectUuid(uuid)) {
        throw new Error('No valid project UUID found in response');
      }

      writeCachedProjectUuid(uuid);
      console.log(' Project UUID fetched and stored successfully:', uuid);
      return uuid;
    } catch (error: unknown) {
      console.error('❌ Failed to fetch project UUID:', error);
      const message =
        error instanceof Error && error.message.startsWith('No project found')
          ? error.message
          : 'Failed to fetch project configuration. Please try again or enter manually.';
      setUuidFetchError(message);
      throw error;
    } finally {
      setIsFetchingUuid(false);
    }
  }, []);

  const loadUser = useCallback(() => {
    const token = storage.get(TOKEN_KEY);
    const userData = storage.get('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        
        // Check if superadmin is on wrong domain
        if (parsedUser.role === 'superadmin' && !isSuperadminDomain()) {
          console.warn('🚫 Superadmin detected on wrong domain - clearing session');
          storage.clear();
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        setUser(parsedUser);
      } catch {
        storage.clear();
      }
    }
    
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Skip UUID fetching for superadmin domain
    if (!isSuperadminDomain()) {
      // Fetch UUID in background (non-blocking)
      fetchAndStoreProjectUuid().catch(err => {
        console.log('UUID fetch failed silently:', err);
      });
    }
    
    // Load user immediately
    loadUser();
  }, [loadUser, fetchAndStoreProjectUuid]);

  const login = async (credentials: LoginRequest, options?: LoginOptions) => {
    try {
      const onSuperadminDomain = isSuperadminDomain();
      const superadminLogin = options?.superadmin === true;

      if (superadminLogin && !onSuperadminDomain) {
        throw new Error(
          'SUPERADMIN_DOMAIN_RESTRICTION: Access restricted. Superadmin login is only allowed from authorized domains.'
        );
      }

      // Resolve the project scope before calling the backend. Normal logins
      // must never fall through to an unscoped email/username lookup.
      let projectUuid: string | undefined;

      if (!superadminLogin) {
        const manualUuid = credentials.whitelabel_admin_uuid?.trim();
        if (manualUuid) {
          if (!isValidProjectUuid(manualUuid)) {
            throw new Error('Invalid project UUID. Please check the value and try again.');
          }
          projectUuid = manualUuid;
          // Only persist manual entries where the host cannot provide one. On a
          // normal project domain a manual override should not mask a later
          // domain-resolution fix.
          if (onSuperadminDomain) {
            writeCachedProjectUuid(manualUuid, { ttlMs: PROJECT_UUID_MANUAL_TTL_MS });
          }
        } else {
          projectUuid = readCachedProjectUuid() ?? undefined;
        }

        // A normal project domain can derive the UUID from the host. A
        // superadmin domain cannot, so a manual/cached UUID is required there.
        if (!projectUuid && !onSuperadminDomain) {
          console.log('🔄 No UUID found, attempting to fetch before login...');
          await fetchAndStoreProjectUuid();
          projectUuid = readCachedProjectUuid() ?? undefined;
        }

        if (!projectUuid) {
          throw new Error(
            onSuperadminDomain
              ? 'Project UUID is required for company login on this domain. Enter the company project UUID.'
              : 'Failed to load project configuration. Please retry or enter the project UUID manually.'
          );
        }
      }

      const loginData: LoginRequest = {
        username: credentials.username,
        password: credentials.password,
        whitelabel_admin_uuid: superadminLogin ? undefined : projectUuid,
      };

      console.log('🔐 Attempting login with:', { 
        username: loginData.username,
        hasPassword: !!loginData.password,
        hasUuid: !!loginData.whitelabel_admin_uuid,
        uuid: loginData.whitelabel_admin_uuid || 'none',
        uuidSource: superadminLogin
          ? 'superadmin'
          : credentials.whitelabel_admin_uuid
            ? 'manual'
            : 'stored',
      });

      const response = await authApi.login(loginData);
      
      console.log('Login successful:', { 
        username: response.username, 
        role: response.role 
      });
      
      // Check if superadmin is trying to login from wrong domain
      if (response.role === 'superadmin' && !onSuperadminDomain) {
        // Clear any stored data
        storage.clear();
        setUser(null);
        throw new Error('SUPERADMIN_DOMAIN_RESTRICTION: Access restricted. Superadmin login is only allowed from authorized domains.');
      }

      if (!superadminLogin && response.role === 'superadmin') {
        throw new Error('This is a superadmin account. Enable "Sign in as superadmin" and try again.');
      }

      if (superadminLogin && response.role !== 'superadmin') {
        throw new Error('This account is not a superadmin. Turn off "Sign in as superadmin" and try again.');
      }
      
      // Check if user is a player - redirect to player frontend site without logging in
      if (response.role === 'player') {
        const playerUrl = getPlayerFrontendUrl();
        if (playerUrl) {
          console.log('🎮 Player detected - redirecting to player frontend without admin login:', playerUrl);
          // Clear any stored data - players should not be logged into admin panel
          storage.clear();
          setUser(null);
          // Redirect to player frontend site
          window.location.href = playerUrl;
          return;
        }
        // If no mapping found, clear data and show error
        storage.clear();
        setUser(null);
        throw new Error('PLAYER_REDIRECT_ERROR: Player login is not available on this domain. Please use the player frontend site.');
      }
      
      storage.set(TOKEN_KEY, response.auth_token.access);
      storage.set(REFRESH_TOKEN_KEY, response.auth_token.refresh);
      
      const authUser: AuthUser = {
        id: response.pk,
        username: response.username,
        role: response.role,
        lastLogin: response.last_login,
      };
      
      storage.set('user', JSON.stringify(authUser));
      setUser(authUser);
      
      router.push('/dashboard');
    } catch (error: unknown) {
      console.error('Login failed:', error);

      const apiError = error as
        | { message?: unknown; detail?: unknown; error?: unknown }
        | null
        | undefined;
      const message =
        typeof apiError?.message === 'string' ? apiError.message : undefined;

      // Provide more user-friendly error messages
      if (message?.includes('Failed to fetch') || message?.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please check if the API server is running.');
      }

      if (message) {
        throw new Error(message);
      }

      if (typeof apiError?.detail === 'string') {
        throw new Error(apiError.detail);
      }

      if (typeof apiError?.error === 'string') {
        throw new Error(apiError.error);
      }

      throw new Error('Login failed. Please check your credentials and try again.');
    }
  };

  const refetchUuid = useCallback(async () => {
    if (isSuperadminDomain()) {
      const message = 'Project UUID cannot be fetched on a superadmin domain. Enter it manually.';
      setUuidFetchError(message);
      throw new Error(message);
    }

    try {
      return await fetchAndStoreProjectUuid(true);
    } catch (error) {
      console.error('Failed to refresh UUID:', error);
      throw error;
    }
  }, [fetchAndStoreProjectUuid]);

  const logout = () => {
    storage.clear();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        isLoading, 
        isAuthenticated: !!user,
        isFetchingUuid,
        uuidFetchError,
        login, 
        logout,
        refetchUuid
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

