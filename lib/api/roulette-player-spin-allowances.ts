import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import {
  parsePlayerRouletteSpinInfo,
  pickPlayerRouletteSpinInfo,
  type PlayerRouletteSpinInfo,
} from '@/lib/roulette/player-spin-allowance-info';

export type { PlayerRouletteSpinInfo };

/** @deprecated Use PlayerRouletteSpinInfo — kept for backward-compatible imports */
export type PlayerRouletteSpinUsage = PlayerRouletteSpinInfo;

export type PlayerRouletteSpinAllowance = {
  id: number;
  company_id?: number;
  company_username?: string;
  player_id: number;
  player_username?: string;
  spins_per_day: number;
  is_enabled: boolean;
  project_id?: number;
  set_by_id?: number;
  set_by_username?: string;
  created_at?: string;
  updated_at?: string;
  /** Backend snapshot (preferred). */
  spin_allowance?: PlayerRouletteSpinInfo;
  /** Alias populated from `spin_allowance` for legacy UI. */
  usage?: PlayerRouletteSpinInfo;
};

export type SavePlayerRouletteSpinAllowanceRequest = {
  player_id: number;
  spins_per_day: number;
  is_enabled: boolean;
};

type PlayerSpinAllowanceListEnvelope = ApiResponse<
  PaginatedResponse<Record<string, unknown>> & {
    page?: number;
    page_size?: number;
    spin_allowance?: unknown;
  }
>;
type PlayerSpinAllowanceItemEnvelope = ApiResponse<Record<string, unknown>>;

function normalizeAllowanceRow(
  raw: Record<string, unknown>,
  fallbackPlayerId: number,
): PlayerRouletteSpinAllowance {
  const spinInfo = pickPlayerRouletteSpinInfo(raw);
  const spinsPerDay =
    typeof raw.spins_per_day === 'number'
      ? raw.spins_per_day
      : (spinInfo?.spins_per_day ?? spinInfo?.daily_free_spins ?? 0);

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    company_id: typeof raw.company_id === 'number' ? raw.company_id : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
    player_id:
      typeof raw.player_id === 'number' ? raw.player_id : fallbackPlayerId,
    player_username:
      typeof raw.player_username === 'string' ? raw.player_username : undefined,
    spins_per_day: spinsPerDay,
    is_enabled: typeof raw.is_enabled === 'boolean' ? raw.is_enabled : true,
    project_id: typeof raw.project_id === 'number' ? raw.project_id : undefined,
    set_by_id: typeof raw.set_by_id === 'number' ? raw.set_by_id : undefined,
    set_by_username:
      typeof raw.set_by_username === 'string' ? raw.set_by_username : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    spin_allowance: spinInfo ?? undefined,
    usage: spinInfo ?? undefined,
  };
}

function allowanceFromEnvelope(
  data: Record<string, unknown> | undefined,
  playerId: number,
): PlayerRouletteSpinAllowance | null {
  if (!data) return null;

  const results = data.results;
  if (Array.isArray(results) && results.length > 0) {
    const first = results[0];
    if (first && typeof first === 'object') {
      return normalizeAllowanceRow(first as Record<string, unknown>, playerId);
    }
  }

  const envelopeSpin = parsePlayerRouletteSpinInfo(data.spin_allowance);
  if (envelopeSpin) {
    return {
      id: 0,
      player_id: playerId,
      spins_per_day: envelopeSpin.spins_per_day ?? envelopeSpin.daily_free_spins ?? 0,
      is_enabled: true,
      spin_allowance: envelopeSpin,
      usage: envelopeSpin,
    };
  }

  const directSpin = pickPlayerRouletteSpinInfo(data);
  if (directSpin) {
    return {
      id: typeof data.id === 'number' ? data.id : 0,
      player_id: typeof data.player_id === 'number' ? data.player_id : playerId,
      spins_per_day:
        typeof data.spins_per_day === 'number'
          ? data.spins_per_day
          : (directSpin.spins_per_day ?? directSpin.daily_free_spins ?? 0),
      is_enabled: typeof data.is_enabled === 'boolean' ? data.is_enabled : true,
      spin_allowance: directSpin,
      usage: directSpin,
    };
  }

  return null;
}

function isPlayerAllowance(value: unknown): value is PlayerRouletteSpinAllowance {
  return (
    !!value &&
    typeof value === 'object' &&
    'player_id' in (value as Record<string, unknown>)
  );
}

/**
 * Admin proxy endpoint for per-player roulette spin allowance overrides.
 *
 * GET  /api/admin/roulette/player-spin-allowances?player_id=… → allowance + spin_allowance snapshot
 * POST /api/admin/roulette/player-spin-allowances              → upsert
 */
export const playerRouletteSpinAllowancesApi = {
  get: async (playerId: number): Promise<PlayerRouletteSpinAllowance | null> => {
    const response = await apiClient.get<PlayerSpinAllowanceListEnvelope>(
      'api/admin/roulette/player-spin-allowances',
      { params: { player_id: playerId } },
    );

    if (response?.status === 'error') {
      throw new Error(response.message || 'Failed to fetch player spin allowance');
    }

    const data = response?.data as Record<string, unknown> | undefined;
    return allowanceFromEnvelope(data, playerId);
  },

  save: async (
    payload: SavePlayerRouletteSpinAllowanceRequest,
  ): Promise<PlayerRouletteSpinAllowance> => {
    const response = await apiClient.post<PlayerSpinAllowanceItemEnvelope>(
      'api/admin/roulette/player-spin-allowances',
      payload,
    );

    if (response?.status === 'error') {
      throw new Error(response.message || 'Failed to save player spin allowance');
    }

    const data = response?.data;
    if (data && typeof data === 'object') {
      return normalizeAllowanceRow(data, payload.player_id);
    }

    if (isPlayerAllowance(response as unknown)) {
      return response as unknown as PlayerRouletteSpinAllowance;
    }

    throw new Error('Invalid player spin allowance response');
  },
};
