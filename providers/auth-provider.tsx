'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants/api';
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
    loadUser();
  }, [loadUser]);

  const login = async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    
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
    
    router.push('/dash');
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

