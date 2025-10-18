import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api';
import type { Player, PaginatedResponse } from '@/types';

interface PlatformLiquidityData {
  totalMainBalance: number;
  totalWinningBalance: number;
  platformLiquidity: number;
  totalPlayers: number;
  isLoading: boolean;
  error: string | null;
}

export function usePlatformLiquidity() {
  const [data, setData] = useState<PlatformLiquidityData>({
    totalMainBalance: 0,
    totalWinningBalance: 0,
    platformLiquidity: 0,
    totalPlayers: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchPlatformLiquidity = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        // Fetch all players with pagination
        let allPlayers: Player[] = [];
        let currentPage = 1;
        let hasMore = true;

        while (hasMore) {
          const response: PaginatedResponse<Player> = await playersApi.list({
            page: currentPage,
            page_size: 100, // Fetch 100 players per page for efficiency
          });

          allPlayers = [...allPlayers, ...response.results];
          
          // Check if there are more pages
          hasMore = response.next !== null;
          currentPage++;
        }

        // Calculate totals
        let totalMainBalance = 0;
        let totalWinningBalance = 0;

        allPlayers.forEach(player => {
          totalMainBalance += parseFloat(player.balance || '0');
          totalWinningBalance += parseFloat(player.winning_balance || '0');
        });

        const platformLiquidity = totalMainBalance + totalWinningBalance;

        setData({
          totalMainBalance,
          totalWinningBalance,
          platformLiquidity,
          totalPlayers: allPlayers.length,
          isLoading: false,
          error: null,
        });

      } catch (err: unknown) {
        let errorMessage = 'Failed to load platform liquidity data';
        
        if (err && typeof err === 'object' && 'detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to view platform liquidity.';
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    fetchPlatformLiquidity();
  }, []);

  return data;
}
