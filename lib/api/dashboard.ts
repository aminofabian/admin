import { apiClient } from './client';

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

// NOTE: Dashboard stats endpoint is not implemented on the backend yet
// See hooks/use-dashboard-stats.ts - currently using fallback data
export const dashboardApi = {
  getStats: () =>
    apiClient.get<DashboardStats>('api/admin/dashboard-stats'),
};
