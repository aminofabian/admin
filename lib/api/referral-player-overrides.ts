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

function coercePositiveId(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
}

function normalizeOverride(
  raw: Record<string, unknown>,
  fallbackPlayerId: number,
): ReferralPlayerOverride {
  const playerRaw = raw.player;
  let playerId = fallbackPlayerId;

  if (typeof playerRaw === 'number' || typeof playerRaw === 'string') {
    const coerced = coercePositiveId(playerRaw);
    if (coerced > 0) playerId = coerced;
  } else if (playerRaw && typeof playerRaw === 'object' && 'id' in playerRaw) {
    const coerced = coercePositiveId((playerRaw as { id: unknown }).id);
    if (coerced > 0) playerId = coerced;
  }

  return {
    id: coercePositiveId(raw.id),
    player: playerId,
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

function extractOverride(
  response: Envelope | null | undefined,
  playerId: number,
): ReferralPlayerOverride | null {
  if (!response || typeof response !== 'object') return null;

  const asRecord = response as Record<string, unknown>;

  // Direct override object
  if ('referrer_bonus_percentage' in asRecord || 'referred_player_bonus_amount' in asRecord) {
    if ('player' in asRecord || 'id' in asRecord) {
      return normalizeOverride(asRecord, playerId);
    }
  }

  const wrapped = response as {
    data?: ReferralPlayerOverride | { results?: ReferralPlayerOverride[] };
    results?: ReferralPlayerOverride[];
  };

  const data = wrapped.data;
  if (data && typeof data === 'object') {
    if ('referrer_bonus_percentage' in data || 'player' in data) {
      return normalizeOverride(data as unknown as Record<string, unknown>, playerId);
    }
    if ('results' in data && Array.isArray(data.results) && data.results.length > 0) {
      return normalizeOverride(data.results[0] as unknown as Record<string, unknown>, playerId);
    }
  }

  if (Array.isArray(wrapped.results) && wrapped.results.length > 0) {
    return normalizeOverride(wrapped.results[0] as unknown as Record<string, unknown>, playerId);
  }

  return null;
}

/**
 * Admin proxy for per-player referral bonus overrides.
 *
 * GET  /api/admin/referral-player-overrides?player=… → override for player
 * POST /api/admin/referral-player-overrides          → create
 * PATCH /api/admin/referral-player-overrides/:id/    → update
 */
export const referralPlayerOverridesApi = {
  get: async (playerId: number): Promise<ReferralPlayerOverride | null> => {
    const response = await apiClient.get<Envelope>('api/admin/referral-player-overrides', {
      params: { player: playerId },
    });
    return extractOverride(response, playerId);
  },

  save: async (
    payload: SaveReferralPlayerOverrideRequest,
    existingId?: number,
  ): Promise<ReferralPlayerOverride> => {
    const knownId = coercePositiveId(existingId);

    if (knownId > 0) {
      const response = await apiClient.patch<Envelope>(
        `api/admin/referral-player-overrides/${knownId}/`,
        payload,
      );
      const updated = extractOverride(response, payload.player);
      if (!updated) throw new Error('Invalid referral override response');
      return updated;
    }

    // Prefer POST create; if an override already exists (unique player), fall back to PATCH.
    try {
      const response = await apiClient.post<Envelope>('api/admin/referral-player-overrides', payload);
      const created = extractOverride(response, payload.player);
      if (!created) throw new Error('Invalid referral override response');
      return created;
    } catch (err) {
      const existing = await referralPlayerOverridesApi.get(payload.player);
      if (existing?.id && existing.id > 0) {
        const response = await apiClient.patch<Envelope>(
          `api/admin/referral-player-overrides/${existing.id}/`,
          payload,
        );
        const updated = extractOverride(response, payload.player);
        if (!updated) throw new Error('Invalid referral override response');
        return updated;
      }
      throw err;
    }
  },
};
