import { useState, useEffect } from 'react';
import { analyticsApi, type AnalyticsFilters } from '@/lib/api/analytics';
import type { GameSummary, GameByGame } from '@/lib/api/analytics';

export function useGameSummary(filters?: AnalyticsFilters) {
  const [data, setData] = useState<GameSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getGameSummary(filters);
        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch game summary');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load game summary';
        console.warn('⚠️ Game summary failed:', errorMessage);
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}

export function useGamesByGame(filters?: AnalyticsFilters) {
  const [data, setData] = useState<GameByGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getGamesByGame(filters);
        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch games by game');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load games by game';
        console.warn('⚠️ Games by game failed:', errorMessage);
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}
