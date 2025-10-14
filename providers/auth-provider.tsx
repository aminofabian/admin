'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY, PROJECT_UUID_KEY, PROJECT_DOMAIN } from '@/lib/constants/api';
import type { AuthUser, LoginRequest } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchAndStoreProjectUuid = useCallback(async () => {
    try {
      const existingUuid = storage.get(PROJECT_UUID_KEY);
      if (existingUuid) {
        console.log('Using cached project UUID:', existingUuid);
        return;
      }

      console.log('Fetching project UUID for domain:', PROJECT_DOMAIN);
      const response = await authApi.fetchProjectUuid(PROJECT_DOMAIN);
      
      const uuid = response.whitelabel_admin_uuid || response.project_uuid || response.uuid;
      
      if (uuid) {
        console.log('Project UUID fetched successfully:', uuid);
        storage.set(PROJECT_UUID_KEY, uuid);
      } else {
        console.warn('No UUID found in response:', response);
      }
    } catch (error) {
      console.error('Failed to fetch project UUID:', error);
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
    fetchAndStoreProjectUuid();
    loadUser();
  }, [loadUser, fetchAndStoreProjectUuid]);

  const login = async (credentials: LoginRequest) => {
    try {
      const storedUuid = storage.get(PROJECT_UUID_KEY);
      
      const loginData: LoginRequest = {
        username: credentials.username,
        password: credentials.password,
        whitelabel_admin_uuid: credentials.whitelabel_admin_uuid || storedUuid || undefined,
      };

      console.log('Attempting login with:', { 
        username: loginData.username,
        hasPassword: !!loginData.password,
        hasUuid: !!loginData.whitelabel_admin_uuid,
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
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

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
        login, 
        logout 
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

