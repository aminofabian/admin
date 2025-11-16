import { useState, useEffect, useCallback } from 'react';
import { playersApi } from '@/lib/api/users';
import type { PlayerGame } from '@/types';

export const usePlayerGames = (playerId: number | null) => {
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    if (!playerId) {
      setGames([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const data = await playersApi.games(playerId);
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
