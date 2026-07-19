import { apiClient } from './client';
import type {
  ReferralPlayerOverride,
  SaveReferralPlayerOverrideRequest,
} from '@/types';

type Envelope =
  | ReferralPlayerOverride
  | {
      status?: string;
      data?: ReferralPlayerOverride | { results?: ReferralPlayerOverride[] };
      results?: ReferralPlayerOverride[];
    };

function normalizeOverride(
  raw: Record<string, unknown>,
  fallbackPlayerId: number,
): ReferralPlayerOverride {
  const playerRaw = raw.player;
  const playerId =
    typeof playerRaw === 'number'
      ? playerRaw
      : playerRaw && typeof playerRaw === 'object' && 'id' in playerRaw
        ? Number((playerRaw as { id: unknown }).id)
        : fallbackPlayerId;

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    player: Number.isNaN(playerId) ? fallbackPlayerId : playerId,
    player_username:
      typeof raw.player_username === 'string'
        ? raw.player_username
        : playerRaw && typeof playerRaw === 'object' && 'username' in playerRaw
          ? String((playerRaw as { username: unknown }).username)
          : undefined,
    referrer_bonus_percentage: String(raw.referrer_bonus_percentage ?? '0'),
    referred_player_bonus_amount: String(raw.referred_player_bonus_amount ?? '0'),
    created: typeof raw.created === 'string' ? raw.created : undefined,
    modified: typeof raw.modified === 'string' ? raw.modified : undefined,
  };
}

function extractOverride(response: Envelope | null | undefined, playerId: number): ReferralPlayerOverride | null {
  if (!response) return null;

  if ('player' in response && (typeof response.player === 'number' || response.referrer_bonus_percentage != null)) {
    return normalizeOverride(response as unknown as Record<string, unknown>, playerId);
  }

  const wrapped = response as {
    data?: ReferralPlayerOverride | { results?: ReferralPlayerOverride[] };
    results?: ReferralPlayerOverride[];
  };

  const data = wrapped.data;
  if (data && typeof data === 'object' && 'player' in data) {
    return normalizeOverride(data as unknown as Record<string, unknown>, playerId);
  }

  const results =
    (data && typeof data === 'object' && 'results' in data && Array.isArray(data.results)
      ? data.results
      : null) ??
    (Array.isArray(wrapped.results) ? wrapped.results : null);

  if (results && results.length > 0) {
    return normalizeOverride(results[0] as unknown as Record<string, unknown>, playerId);
  }

  return null;
}

/**
 * Admin proxy for per-player referral bonus overrides.
 *
 * GET  /api/admin/referral-player-overrides?player=… → override for player
 * POST /api/admin/referral-player-overrides          → create/upsert
 * PATCH /api/admin/referral-player-overrides/:id/    → update
 */
export const referralPlayerOverridesApi = {
  get: async (playerId: number): Promise<ReferralPlayerOverride | null> => {
    const response = await apiClient.get<Envelope>('api/admin/referral-player-overrides', {
      params: { player: playerId },
    });
    return extractOverride(response, playerId);
  },

  save: async (payload: SaveReferralPlayerOverrideRequest): Promise<ReferralPlayerOverride> => {
    const existing = await referralPlayerOverridesApi.get(payload.player);

    if (existing?.id) {
      const response = await apiClient.patch<Envelope>(
        `api/admin/referral-player-overrides/${existing.id}/`,
        payload,
      );
      const updated = extractOverride(response, payload.player);
      if (!updated) throw new Error('Invalid referral override response');
      return updated;
    }

    const response = await apiClient.post<Envelope>('api/admin/referral-player-overrides', payload);
    const created = extractOverride(response, payload.player);
    if (!created) throw new Error('Invalid referral override response');
    return created;
  },
};
