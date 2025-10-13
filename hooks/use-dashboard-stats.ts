import { useState } from 'react';

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
}

export function useDashboardStats() {
  // Mock data for dashboard stats
  const stats: DashboardStats = {
    totalPlayers: 1247,
    activePlayers: 892,
    totalManagers: 8,
    totalAgents: 25,
    totalStaff: 12,
    totalAffiliates: 25,
    totalBalance: 125500,
    totalWinningBalance: 48200,
    platformLiquidity: 173700,
    pendingTransactions: 23,
    completedToday: 342,
    failedToday: 8,
    transactionSuccessRate: 98.5,
    totalPurchasesToday: 45200,
    totalCashoutsToday: 28900,
    totalGames: 53,
    activeGames: 45,
    inactiveGames: 8,
  };

  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  return { stats, loading, error };
}

