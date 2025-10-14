import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { LoginRequest, LoginResponse, DashboardGamesResponse } from '@/types';

export const authApi = {
  fetchProjectUuid: async () => {
    try {
      // Direct call to the hardcoded endpoint
      const response = await fetch('https://serverhub.biz/users/dashboard-games/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          project_domain: 'https://serverhub.biz'
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to fetch project UUID: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Dashboard games response:', data);
      return data as DashboardGamesResponse;
    } catch (error: any) {
      console.error('❌ Error fetching project UUID:', error);
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Cannot connect to server. Please check your internet connection or if the server is accessible.');
      }
      throw error;
    }
  },

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

