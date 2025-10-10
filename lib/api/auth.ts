import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { LoginRequest, LoginResponse } from '@/types';

export const authApi = {
  login: (data: LoginRequest) => 
    apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data),
};

