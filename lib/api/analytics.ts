import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';

export interface AdminAnalyticsData {
  total_cash_in: number;
  total_cashout: number;
  total_players: number;
  total_agents: number;
  total_managers: number;
  total_staffs: number;
}

export interface AdminAnalyticsResponse {
  status: 'success' | 'error';
  data: AdminAnalyticsData;
  message?: string;
}

export const analyticsApi = {
  getDashboard: () =>
    apiClient.get<AdminAnalyticsResponse>(API_ENDPOINTS.ANALYTICS.DASHBOARD),
};

