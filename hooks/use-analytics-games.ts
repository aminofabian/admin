import { useState, useEffect } from 'react';
import { analyticsApi, type AnalyticsFilters } from '@/lib/api/analytics';
import type { GameSummary, GameByGame } from '@/lib/api/analytics';

function normalizeGameSummary(raw: unknown): GameSummary {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    total_recharge: n(o.total_recharge),
    total_bonus: n(o.total_bonus),
    average_bonus_pct: n(o.average_bonus_pct),
    total_redeem: n(o.total_redeem),
    net_game_activity: n(o.net_game_activity),
  };
}

function normalizeGameByGameRow(raw: unknown): GameByGame {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const gameId = o.game_id;
  return {
    ...(typeof gameId === 'number' && Number.isFinite(gameId) ? { game_id: gameId } : {}),
    ...(typeof o.game_code === 'string' && o.game_code.length > 0 ? { game_code: o.game_code } : {}),
    game_title: typeof o.game_title === 'string' ? o.game_title : '',
    recharge: n(o.recharge),
    bonus: n(o.bonus),
    average_bonus_pct: n(o.average_bonus_pct),
    redeem: n(o.redeem),
    net_game_activity: n(o.net_game_activity),
  };
}

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
        if (response.status === 'success' && response.data != null) {
          setData(normalizeGameSummary(response.data));
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
        if (response.status === 'success' && response.data != null) {
          const rows = Array.isArray(response.data) ? response.data : [];
          setData(rows.map(normalizeGameByGameRow));
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
