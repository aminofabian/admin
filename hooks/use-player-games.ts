import { useState, useEffect, useCallback } from 'react';
import { playersApi } from '@/lib/api/users';
import type { PlayerGame } from '@/types';

export const usePlayerGames = (playerId: number | null) => {
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGames = useCallback(
    async (options?: { silent?: boolean }): Promise<PlayerGame[]> => {
      const silent = options?.silent ?? false;

      if (!playerId) {
        setGames([]);
        return [];
      }

      if (!silent) {
        setIsLoading(true);
        setError(null);
      }

      try {
        const data = await playersApi.games(playerId);
        setGames(data);
        return data;
      } catch (err) {
        console.error('Failed to fetch player games:', err);
        if (!silent) {
          setError(err instanceof Error ? err.message : 'Failed to fetch games');
          setGames([]);
        }
        return [];
      } finally {
        if (!silent) {
          setIsLoading(false);
        }
      }
    },
    [playerId],
  );

  useEffect(() => {
    void refreshGames({ silent: false });
  }, [refreshGames]);

  return { games, isLoading, error, refreshGames };
};
