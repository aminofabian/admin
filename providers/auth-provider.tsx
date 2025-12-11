'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, PROJECT_UUID_KEY } from '@/lib/constants/api';
import { isSuperadminDomain } from '@/lib/utils/domain';
import type { AuthUser, LoginRequest } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isFetchingUuid: boolean;
  uuidFetchError: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
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
    // Skip UUID fetching for superadmin domain
    if (isSuperadminDomain()) {
      console.log('🔐 Superadmin domain detected - skipping UUID fetch');
      return undefined;
    }

    try {
      const existingUuid = storage.get(PROJECT_UUID_KEY);
      if (existingUuid && !forceRefresh) {
        console.log(' Using cached project UUID:', existingUuid);
        return existingUuid;
      }

      setIsFetchingUuid(true);
      setUuidFetchError(null);
      
      console.log('🔄 Fetching project UUID from https://serverhub.biz/users/dashboard-games/');
      const response = await authApi.fetchProjectUuid();
      
      console.log('📦 Response received:', response);
      
      // Try multiple possible field names - check nested data first
      const uuid = response.data?.whitelabel_admin_uuid || 
                   response.data?.project_uuid || 
                   response.data?.uuid ||
                   response.whitelabel_admin_uuid || 
                   response.project_uuid || 
                   response.uuid;
      
      if (uuid) {
        console.log(' Project UUID fetched and stored successfully:', uuid);
        storage.set(PROJECT_UUID_KEY, uuid);
        return uuid;
      }
      
      throw new Error('No UUID found in response');
    } catch (error: any) {
      console.error('❌ Failed to fetch project UUID:', error);
      setUuidFetchError('Failed to fetch project configuration. Please try again or enter manually.');
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
        setUser(JSON.parse(userData));
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

  const login = async (credentials: LoginRequest) => {
    try {
      // Skip UUID fetching for superadmin domain
      const isSuperadmin = isSuperadminDomain();
      
      let finalStoredUuid: string | undefined;
      if (!isSuperadmin) {
        // Try to fetch UUID one more time before login if not cached
        const storedUuid = storage.get(PROJECT_UUID_KEY);
        if (!storedUuid && !credentials.whitelabel_admin_uuid) {
          console.log('🔄 No UUID found, attempting to fetch before login...');
          await fetchAndStoreProjectUuid();
        }
        finalStoredUuid = storage.get(PROJECT_UUID_KEY);
      }
      
      const loginData: LoginRequest = {
        username: credentials.username,
        password: credentials.password,
        whitelabel_admin_uuid: isSuperadmin ? undefined : (credentials.whitelabel_admin_uuid || finalStoredUuid || undefined),
      };

      console.log('🔐 Attempting login with:', { 
        username: loginData.username,
        hasPassword: !!loginData.password,
        hasUuid: !!loginData.whitelabel_admin_uuid,
        uuid: loginData.whitelabel_admin_uuid || 'none',
        uuidSource: loginData.whitelabel_admin_uuid 
          ? (credentials.whitelabel_admin_uuid ? 'manual' : 'stored') 
          : 'none',
      });

      const response = await authApi.login(loginData);
      
      console.log('Login successful:', { 
        username: response.username, 
        role: response.role 
      });
      
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
    } catch (error: any) {
      console.error('Login failed:', error);
      
      // Provide more user-friendly error messages
      if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
        throw new Error('Cannot connect to server. Please check if the API server is running.');
      }
      
      if (error?.message) {
        throw new Error(error.message);
      }
      
      if (error?.detail) {
        throw new Error(error.detail);
      }
      
      if (error?.error) {
        throw new Error(error.error);
      }
      
      throw new Error('Login failed. Please check your credentials and try again.');
    }
  };

  const refetchUuid = useCallback(async () => {
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

