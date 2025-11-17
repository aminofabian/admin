import { useState, useEffect } from 'react';
import { useGamesStore } from '@/stores';
import type { Game } from '@/types';

interface ActiveGamesData {
  activeGamesCount: number;
  totalGamesCount: number;
  inactiveGamesCount: number;
  gamesByStatus: {
    active: number;
    inactive: number;
  };
  recentActivity: {
    gamesCreatedToday: number;
    gamesUpdatedToday: number;
  };
  isLoading: boolean;
  error: string | null;
}

export function useActiveGames() {
  const [data, setData] = useState<ActiveGamesData>({
    activeGamesCount: 0,
    totalGamesCount: 0,
    inactiveGamesCount: 0,
    gamesByStatus: {
      active: 0,
      inactive: 0,
    },
    recentActivity: {
      gamesCreatedToday: 0,
      gamesUpdatedToday: 0,
    },
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const calculateActiveGames = () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        console.log('🎮 Calculating active games from games store...');

        // Get games from the store
        const { games, fetchGames } = useGamesStore.getState();

        // If no games data, fetch it first
        if (!games || games.length === 0) {
          console.log('📡 No games data in store, fetching...');
          fetchGames().then(() => {
            // Recalculate after fetch completes
            setTimeout(calculateActiveGames, 1000);
          });
          return;
        }

        console.log(`📊 Processing ${games.length} games from store`);

        // Debug the game structure
        if (games.length > 0) {
          const sampleGame = games[0];
          console.log('🔍 Sample game structure from store:', {
            hasGameStatus: 'game_status' in sampleGame,
            game_status: (sampleGame as any).game_status,
            keys: Object.keys(sampleGame),
            sampleData: sampleGame
          });
        }

        // Game objects use game_status boolean field
        const activeGames = games.filter(game => (game as any).game_status === true);
        const inactiveGames = games.filter(game => (game as any).game_status === false);

        console.log('📈 Status filtering results from store:', {
          totalGames: games.length,
          activeGames: activeGames.length,
          inactiveGames: inactiveGames.length,
          activeGameDetails: activeGames.slice(0, 5).map(g => ({
            id: g.id,
            game_status: (g as any).game_status,
            title: g.title,
            allFields: Object.keys(g)
          }))
        });

        // Get today's date in local timezone for accurate filtering
        const today = new Date();
        const todayString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format

        // Calculate recent activity
        const gamesCreatedToday = games.filter(game => {
          if (!game.created) return false;
          const createdDate = new Date(game.created).toLocaleDateString('en-CA');
          return createdDate === todayString;
        }).length;

        const gamesUpdatedToday = games.filter(game => {
          if (!game.created) return false; // Games might not have updated field
          const updatedDate = new Date(game.created).toLocaleDateString('en-CA');
          return updatedDate === todayString;
        }).length;

        console.log('📅 Today\'s activity:', {
          todayString,
          gamesCreatedToday,
          gamesUpdatedToday
        });

        setData({
          activeGamesCount: activeGames.length,
          totalGamesCount: games.length,
          inactiveGamesCount: inactiveGames.length,
          gamesByStatus: {
            active: activeGames.length,
            inactive: inactiveGames.length,
          },
          recentActivity: {
            gamesCreatedToday,
            gamesUpdatedToday,
          },
          isLoading: false,
          error: null,
        });

        console.log('✅ Active games data loaded from store:', {
          total: games.length,
          active: activeGames.length,
          inactive: inactiveGames.length,
          gamesCreatedToday,
          gamesUpdatedToday
        });

      } catch (err: unknown) {
        let errorMessage = 'Failed to load active games data';

        if (err && typeof err === 'object' && 'detail' in err) {
          errorMessage = String(err.detail);

          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need appropriate privileges to view games data.';
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }

        console.error('❌ Active games calculation failed:', err);

        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    calculateActiveGames();
  }, []);

  return data;
}