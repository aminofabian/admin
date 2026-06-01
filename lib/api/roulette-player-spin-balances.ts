import { apiClient } from './client';
import type { ApiResponse, PaginatedResponse } from '@/types';
import {
  parsePlayerRouletteSpinInfo,
  type PlayerRouletteSpinInfo,
} from '@/lib/roulette/player-spin-allowance-info';

export type PlayerRouletteSpinBalanceUsage = PlayerRouletteSpinInfo;

export type PlayerRouletteSpinBalance = {
  id: number;
  company_id?: number;
  company_username?: string;
  player_id: number;
  player_username?: string;
  balance: number;
  project_id?: number;
  created_at?: string;
  updated_at?: string;
  usage?: PlayerRouletteSpinInfo;
  spin_allowance?: PlayerRouletteSpinInfo;
};

type PlayerSpinBalanceListEnvelope = ApiResponse<
  PaginatedResponse<Record<string, unknown>> & { spin_allowance?: unknown }
>;

function normalizeBalanceRow(
  raw: Record<string, unknown>,
  fallbackPlayerId: number,
): PlayerRouletteSpinBalance | null {
  const spinAllowance =
    parsePlayerRouletteSpinInfo(raw.spin_allowance) ??
    parsePlayerRouletteSpinInfo(raw.usage);

  const balance =
    typeof raw.balance === 'number'
      ? raw.balance
      : (spinAllowance?.spin_balance ?? undefined);

  if (balance === undefined && !spinAllowance) return null;

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    company_id: typeof raw.company_id === 'number' ? raw.company_id : undefined,
    company_username:
      typeof raw.company_username === 'string' ? raw.company_username : undefined,
    player_id:
      typeof raw.player_id === 'number' ? raw.player_id : fallbackPlayerId,
    player_username:
      typeof raw.player_username === 'string' ? raw.player_username : undefined,
    balance: balance ?? spinAllowance?.spin_balance ?? 0,
    project_id: typeof raw.project_id === 'number' ? raw.project_id : undefined,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
    usage: spinAllowance ?? undefined,
    spin_allowance: spinAllowance ?? undefined,
  };
}

/**
 * Admin proxy for accumulated player roulette spin balances.
 *
 * GET /api/admin/roulette/player-spin-balances?player_id=… → first result (or null)
 */
export const playerRouletteSpinBalancesApi = {
  get: async (playerId: number): Promise<PlayerRouletteSpinBalance | null> => {
    const response = await apiClient.get<PlayerSpinBalanceListEnvelope>(
      'api/admin/roulette/player-spin-balances',
      { params: { player_id: playerId } },
    );

    if (response?.status === 'error') {
      throw new Error(response.message || 'Failed to fetch player spin balance');
    }

    const data = response?.data as Record<string, unknown> | undefined;
    if (!data) return null;

    const results = data.results;
    if (Array.isArray(results) && results.length > 0) {
      const first = results[0];
      if (first && typeof first === 'object') {
        return normalizeBalanceRow(first as Record<string, unknown>, playerId);
      }
    }

    const envelopeSpin = parsePlayerRouletteSpinInfo(data.spin_allowance);
    if (envelopeSpin) {
      return {
        id: 0,
        player_id: playerId,
        balance: envelopeSpin.spin_balance ?? 0,
        spin_allowance: envelopeSpin,
        usage: envelopeSpin,
      };
    }

    return null;
  },
};
