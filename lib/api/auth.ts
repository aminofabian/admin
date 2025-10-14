import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { LoginRequest, LoginResponse, ProjectDomainRequest, DashboardGamesResponse } from '@/types';

export const authApi = {
  fetchProjectUuid: (projectDomain: string) => 
    apiClient.post<DashboardGamesResponse>(
      API_ENDPOINTS.AUTH.DASHBOARD_GAMES,
      { project_domain: projectDomain } as ProjectDomainRequest
    ),

  login: (data: LoginRequest) => {
    const payload: Record<string, string> = {
      username: data.username,
      password: data.password,
    };
    
    if (data.whitelabel_admin_uuid && data.whitelabel_admin_uuid.trim()) {
      payload.whitelabel_admin_uuid = data.whitelabel_admin_uuid.trim();
    }
    
    return apiClient.post<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, payload);
  },
};

