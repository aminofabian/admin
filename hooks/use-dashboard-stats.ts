import { useState, useEffect } from 'react';
import { companiesApi, playersApi, gamesApi, managersApi, agentsApi, staffsApi, affiliatesApi, transactionsApi } from '@/lib/api';
import { usePlatformLiquidity } from './use-platform-liquidity';
import { useAuth } from '@/providers/auth-provider';
import type { DashboardStats } from '@/lib/api/dashboard';
import type { PaginatedResponse, Game } from '@/types';

export function useDashboardStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { platformLiquidity, isLoading: liquidityLoading } = usePlatformLiquidity();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all stats in parallel for better performance
        const [
          playersResponse,
          gamesResponse,
          managersResponse,
          agentsResponse,
          staffsResponse,
          affiliatesResponse,
          transactionsResponse,
          processingQueuesResponse,
        ] = await Promise.allSettled([
          // Players count
          playersApi.list({ page_size: 1 }),
          // Games list (to calculate active/inactive)
          gamesApi.list(),
          // Managers count
          managersApi.list({ page_size: 1 }),
          // Agents count
          agentsApi.list({ page_size: 1 }),
          // Staff count
          staffsApi.list({ page_size: 1 }),
          // Affiliates count
          affiliatesApi.list({ page_size: 1 }),
          // Transactions for today's stats
          transactionsApi.list({ page_size: 100 }),
          // Processing queues (pending transactions)
          transactionsApi.queuesProcessing({ page_size: 1 }),
        ]);

        // Only fetch companies if user is superadmin
        let companiesResponse;
        if (user?.role === 'superadmin') {
          const companiesResult = await Promise.allSettled([
            companiesApi.list({ page_size: 1 }),
          ]);
          companiesResponse = companiesResult[0];
        }

        // Extract counts from responses
        const totalCompanies = companiesResponse?.status === 'fulfilled'
          ? (companiesResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const totalPlayers = playersResponse.status === 'fulfilled'
          ? (playersResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const games = gamesResponse.status === 'fulfilled'
          ? (Array.isArray(gamesResponse.value) ? gamesResponse.value : []) as Game[]
          : [];

        const activeGames = games.filter((game: any) => game.game_status === true).length;
        const inactiveGames = games.filter((game: any) => game.game_status === false).length;
        const totalGames = games.length;

        const totalManagers = managersResponse.status === 'fulfilled'
          ? (managersResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const totalAgents = agentsResponse.status === 'fulfilled'
          ? (agentsResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const totalStaff = staffsResponse.status === 'fulfilled'
          ? (staffsResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const totalAffiliates = affiliatesResponse.status === 'fulfilled'
          ? (affiliatesResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        const pendingTransactions = processingQueuesResponse.status === 'fulfilled'
          ? (processingQueuesResponse.value as PaginatedResponse<any>).count || 0
          : 0;

        // Calculate today's transaction stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let completedToday = 0;
        let failedToday = 0;
        let totalPurchasesToday = 0;
        let totalCashoutsToday = 0;

        if (transactionsResponse.status === 'fulfilled') {
          const transactions = (transactionsResponse.value as PaginatedResponse<any>).results || [];
          
          transactions.forEach((txn: any) => {
            const txnDate = new Date(txn.created || txn.date || txn.timestamp);
            txnDate.setHours(0, 0, 0, 0);

            if (txnDate.getTime() === today.getTime()) {
              if (txn.status === 'completed' || txn.status === 'success') {
                completedToday++;
              } else if (txn.status === 'failed' || txn.status === 'error') {
                failedToday++;
              }

              if (txn.type === 'purchase' || txn.txn_type === 'purchase') {
                totalPurchasesToday++;
              } else if (txn.type === 'cashout' || txn.txn_type === 'cashout') {
                totalCashoutsToday++;
              }
            }
          });
        }

        // Calculate transaction success rate
        const totalToday = completedToday + failedToday;
        const transactionSuccessRate = totalToday > 0 
          ? Math.round((completedToday / totalToday) * 100) 
          : 0;

        // Calculate total balance from platform liquidity (if available)
        // Note: platformLiquidity already includes main + winning balance
        const totalBalance = 0; // Will be calculated from players if needed
        const totalWinningBalance = 0; // Will be calculated from players if needed

        setStats({
          totalPlayers,
          activePlayers: totalPlayers, // Using total as active for now (can be enhanced with last_login filter)
          totalManagers,
          totalAgents,
          totalStaff,
          totalAffiliates,
          totalBalance,
          totalWinningBalance,
          platformLiquidity: liquidityLoading ? 0 : platformLiquidity,
          pendingTransactions,
          completedToday,
          failedToday,
          transactionSuccessRate,
          totalPurchasesToday,
          totalCashoutsToday,
          totalGames,
          activeGames,
          inactiveGames,
          totalCompanies,
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
  }, [platformLiquidity, liquidityLoading, user?.role]);

  // Combine loading states - stats are loading OR liquidity is still loading
  const isLoading = loading || liquidityLoading;

  return { stats, loading: isLoading, error };
}

