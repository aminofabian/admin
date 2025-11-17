import { useState, useEffect, useCallback } from 'react';
import { playersApi } from '@/lib/api/users';
import type { PlayerGame } from '@/types';

export const usePlayerGames = (playerId: number | null) => {
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    console.log('🎮 fetchGames called for playerId:', playerId);
    if (!playerId) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('📡 Fetching games for player:', playerId);
      const data = await playersApi.games(playerId);
      console.log('🎮 Games fetched:', data.length);
      setGames(data);
    } catch (err) {
      console.error('Failed to fetch player games:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch games');
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return { games, isLoading, error, refreshGames: fetchGames };
};
