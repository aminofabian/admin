import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import type { DashboardStats } from '@/lib/api/dashboard';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // NOTE: Dashboard stats endpoint doesn't exist on backend yet
        // Using fallback data until backend implements /api/v1/dashboard/stats/
        console.info('ℹ️ Dashboard stats endpoint not implemented yet, using fallback data');

        // TODO: Uncomment when backend implements the endpoint
        // const data = await dashboardApi.getStats();
        // setStats(data);

        setStats({
          totalPlayers: 0,
          activePlayers: 0,
          totalManagers: 0,
          totalAgents: 0,
          totalStaff: 0,
          totalAffiliates: 0,
          totalBalance: 0,
          totalWinningBalance: 0,
          platformLiquidity: 0,
          pendingTransactions: 0,
          completedToday: 0,
          failedToday: 0,
          transactionSuccessRate: 0,
          totalPurchasesToday: 0,
          totalCashoutsToday: 0,
          totalGames: 0,
          activeGames: 0,
          inactiveGames: 0,
          totalCompanies: 0,
        });
      } catch (err: unknown) {
        let errorMessage = 'Failed to load dashboard statistics';

        if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = String(err.message);
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        console.warn('⚠️ Dashboard stats failed:', errorMessage);
        setError(errorMessage);

        // Fallback to empty stats
        setStats({
          totalPlayers: 0,
          activePlayers: 0,
          totalManagers: 0,
          totalAgents: 0,
          totalStaff: 0,
          totalAffiliates: 0,
          totalBalance: 0,
          totalWinningBalance: 0,
          platformLiquidity: 0,
          pendingTransactions: 0,
          completedToday: 0,
          failedToday: 0,
          transactionSuccessRate: 0,
          totalPurchasesToday: 0,
          totalCashoutsToday: 0,
          totalGames: 0,
          activeGames: 0,
          inactiveGames: 0,
          totalCompanies: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return { stats, loading, error };
}

