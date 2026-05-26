import { apiClient } from './client';
import type { ApiResponse } from '@/types';

/**
 * Reward types the prize wheel can award.
 *  - main_balance        → awards money on the player's main balance
 *  - cashoutable_balance → awards money on the player's cashoutable balance
 *  - respin              → grants an extra spin (quantity ≥ 1)
 *  - try_again           → ends the turn with no reward
 */
export type RouletteRewardType =
  | 'main_balance'
  | 'cashoutable_balance'
  | 'respin'
  | 'try_again';

export type RouletteBalanceType = 'main' | 'cashoutable' | null;

/** A single wheel slot as returned by GET (extra metadata) and accepted by POST (subset). */
export type RouletteRewardSlot = {
  /** 1-based slot index on the wheel. */
  position: number;
  /** Human-readable category label (e.g. "Main Balance", "Respin"). */
  prize_type: string;
  /** Display label rendered on the wheel (e.g. "$11", "1 Respin", "Try Again"). */
  prize: string;
  /** Win probability formatted as a percentage string (e.g. "27%", "1.2%"). */
  backend_chance: string;
  /** Monetary amount as a fixed-2 string (e.g. "11.00"). 0.00 for non-money rewards. */
  amount: string;
  balance_type: RouletteBalanceType;
  reward_type: RouletteRewardType | string;
  /** Only meaningful for respin rewards (number of free spins granted). */
  quantity?: number;

  // ----- Server-only metadata (present on GET / POST response, ignored on submit) -----
  id?: number;
  company_id?: number;
  company_username?: string;
  grants_respin?: boolean;
  chance_basis_points?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

/** Full payload returned from `GET …/reward-configs/`. */
export type RouletteRewardConfig = {
  company_id?: number;
  /** `true` when no custom configuration exists and the platform default is being served. */
  using_default: boolean;
  /** Minimum number of slots allowed (typically 6). */
  min_rewards: number;
  /** Maximum number of slots allowed (typically 15). */
  max_rewards: number;
  rewards: RouletteRewardSlot[];
};

/** Save payload — strips server-managed metadata. */
export type SaveRouletteRewardConfigRequest = {
  rewards: Array<
    Pick<
      RouletteRewardSlot,
      | 'position'
      | 'prize_type'
      | 'prize'
      | 'backend_chance'
      | 'amount'
      | 'balance_type'
      | 'reward_type'
    > & { quantity?: number }
  >;
};

type RewardConfigsEnvelope = ApiResponse<RouletteRewardConfig | RouletteRewardSlot[]>;

const DEFAULT_MIN = 6;
const DEFAULT_MAX = 15;

function unwrap(response: unknown): RouletteRewardConfig {
  if (!response || typeof response !== 'object') {
    return { using_default: true, min_rewards: DEFAULT_MIN, max_rewards: DEFAULT_MAX, rewards: [] };
  }

  const obj = response as Record<string, unknown>;

  // Standard envelope: { status, message, data: { ... } }
  if ('data' in obj && obj.data && typeof obj.data === 'object') {
    return unwrap(obj.data);
  }

  // Raw config object: { rewards, using_default, min_rewards, max_rewards }
  if (Array.isArray(obj.rewards)) {
    return {
      company_id: typeof obj.company_id === 'number' ? obj.company_id : undefined,
      using_default: Boolean(obj.using_default),
      min_rewards:
        typeof obj.min_rewards === 'number' ? obj.min_rewards : DEFAULT_MIN,
      max_rewards:
        typeof obj.max_rewards === 'number' ? obj.max_rewards : DEFAULT_MAX,
      rewards: obj.rewards as RouletteRewardSlot[],
    };
  }

  // POST response sometimes returns just the rewards array.
  if (Array.isArray(obj)) {
    return {
      using_default: false,
      min_rewards: DEFAULT_MIN,
      max_rewards: DEFAULT_MAX,
      rewards: obj as RouletteRewardSlot[],
    };
  }

  return { using_default: true, min_rewards: DEFAULT_MIN, max_rewards: DEFAULT_MAX, rewards: [] };
}

/**
 * Admin endpoints for the dynamic prize wheel configuration.
 *
 * GET  /api/admin/roulette/reward-configs → current wheel (company override or platform default)
 * POST /api/admin/roulette/reward-configs → save the whole wheel atomically
 */
export const rouletteRewardConfigsApi = {
  get: async (): Promise<RouletteRewardConfig> => {
    const response = await apiClient.get<RewardConfigsEnvelope | RouletteRewardConfig>(
      'api/admin/roulette/reward-configs',
    );
    return unwrap(response);
  },

  save: async (
    payload: SaveRouletteRewardConfigRequest,
  ): Promise<RouletteRewardConfig> => {
    const response = await apiClient.post<RewardConfigsEnvelope | RouletteRewardConfig>(
      'api/admin/roulette/reward-configs',
      payload,
    );

    if (
      response &&
      typeof response === 'object' &&
      'status' in response &&
      (response as RewardConfigsEnvelope).status === 'error'
    ) {
      throw new Error(
        (response as RewardConfigsEnvelope).message ||
          'Failed to save prize wheel configuration',
      );
    }

    return unwrap(response);
  },
};
