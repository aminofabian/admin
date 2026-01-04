import { useMemo } from 'react';
import { useGamesStore } from '@/stores';

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
  // Subscribe to games store - this will automatically update when games change
  const games = useGamesStore((state) => state.games);
  const isLoading = useGamesStore((state) => state.isLoading);
  const error = useGamesStore((state) => state.error);

  // Calculate active games data from the store state
  const data = useMemo<ActiveGamesData>(() => {
    const gamesList = games ?? [];

    // Game objects use game_status boolean field
    const activeGames = gamesList.filter(game => 'game_status' in game && (game as Game & { game_status: boolean }).game_status === true);
    const inactiveGames = gamesList.filter(game => 'game_status' in game && (game as Game & { game_status: boolean }).game_status === false);

    // Get today's date in local timezone for accurate filtering
    const today = new Date();
    const todayString = today.toLocaleDateString('en-CA'); // YYYY-MM-DD format

    // Calculate recent activity
    const gamesCreatedToday = gamesList.filter(game => {
      if (!game.created) return false;
      const createdDate = new Date(game.created).toLocaleDateString('en-CA');
      return createdDate === todayString;
    }).length;

    const gamesUpdatedToday = gamesList.filter(game => {
      if (!game.created) return false; // Games might not have updated field
      const updatedDate = new Date(game.created).toLocaleDateString('en-CA');
      return updatedDate === todayString;
    }).length;

    return {
      activeGamesCount: activeGames.length,
      totalGamesCount: gamesList.length,
      inactiveGamesCount: inactiveGames.length,
      gamesByStatus: {
        active: activeGames.length,
        inactive: inactiveGames.length,
      },
      recentActivity: {
        gamesCreatedToday,
        gamesUpdatedToday,
      },
      isLoading,
      error: error ?? null,
    };
  }, [games, isLoading, error]);

  return data;
}