import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';

export interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  totalManagers: number;
  totalAgents: number;
  totalStaff: number;
  totalAffiliates: number;
  totalBalance: number;
  totalWinningBalance: number;
  platformLiquidity: number;
  pendingTransactions: number;
  completedToday: number;
  failedToday: number;
  transactionSuccessRate: number;
  totalPurchasesToday: number;
  totalCashoutsToday: number;
  totalGames: number;
  activeGames: number;
  inactiveGames: number;
  totalCompanies?: number; // Optional for superadmin dashboard
}

export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardStats>(API_ENDPOINTS.DASHBOARD.STATS),
};
