import { UserRole } from '@/lib/constants/roles';

export interface LoginRequest {
  username: string;
  password: string;
  whitelabel_admin_uuid?: string;
}

export interface AuthToken {
  refresh: string;
  access: string;
}

export interface LoginResponse {
  auth_token: AuthToken;
  pk: number;
  role: UserRole;
  username: string;
  last_login: string;
}

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  lastLogin: string;
}

