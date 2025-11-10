import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import type { PlayerGame } from '@/types';

export const usePlayerGames = (playerId: number | null) => {
  const [games, setGames] = useState<PlayerGame[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setGames([]);
      return;
    }

    const fetchGames = async () => {
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
    };

    fetchGames();
  }, [playerId]);

  return { games, isLoading, error };
};
