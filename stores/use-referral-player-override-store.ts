import { create } from 'zustand';
import {
  referralPlayerOverridesApi,
} from '@/lib/api/referral-player-overrides';
import type { ReferralPlayerOverride, SaveReferralPlayerOverrideRequest } from '@/types';

type PerPlayerEntry = {
  override: ReferralPlayerOverride | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
};

interface ReferralPlayerOverrideState {
  byPlayerId: Record<number, PerPlayerEntry>;
}

interface ReferralPlayerOverrideActions {
  fetchForPlayer: (playerId: number) => Promise<void>;
  saveForPlayer: (
    payload: SaveReferralPlayerOverrideRequest,
  ) => Promise<ReferralPlayerOverride>;
  reset: () => void;
}

type Store = ReferralPlayerOverrideState & ReferralPlayerOverrideActions;

const initialState: ReferralPlayerOverrideState = {
  byPlayerId: {},
};

function isNotFoundError(err: unknown): boolean {
  const probe = (text: unknown): boolean => {
    if (typeof text !== 'string') return false;
    const t = text.toLowerCase();
    return t.includes('404') || t.includes('not found');
  };

  if (err instanceof Error) return probe(err.message);
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    return probe(obj.message) || probe(obj.detail) || probe(obj.error);
  }
  return false;
}

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'detail' in err) {
    const detail = String((err as { detail: unknown }).detail);
    if (detail.toLowerCase().includes('permission')) {
      return 'Access denied: insufficient privileges to manage referral overrides.';
    }
    return detail;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useReferralPlayerOverrideStore = create<Store>((set, get) => ({
  ...initialState,

  fetchForPlayer: async (playerId: number) => {
    const existing = get().byPlayerId[playerId];
    set({
      byPlayerId: {
        ...get().byPlayerId,
        [playerId]: {
          override: existing?.override ?? null,
          isLoading: true,
          isSaving: existing?.isSaving ?? false,
          error: null,
        },
      },
    });

    try {
      const override = await referralPlayerOverridesApi.get(playerId);
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [playerId]: {
            override,
            isLoading: false,
            isSaving: false,
            error: null,
          },
        },
      });
    } catch (err: unknown) {
      if (isNotFoundError(err)) {
        set({
          byPlayerId: {
            ...get().byPlayerId,
            [playerId]: {
              override: null,
              isLoading: false,
              isSaving: false,
              error: null,
            },
          },
        });
        return;
      }

      set({
        byPlayerId: {
          ...get().byPlayerId,
          [playerId]: {
            override: existing?.override ?? null,
            isLoading: false,
            isSaving: false,
            error: parseErrorMessage(err, 'Failed to load referral override'),
          },
        },
      });
    }
  },

  saveForPlayer: async (payload: SaveReferralPlayerOverrideRequest) => {
    const { player } = payload;
    const existing = get().byPlayerId[player];
    set({
      byPlayerId: {
        ...get().byPlayerId,
        [player]: {
          override: existing?.override ?? null,
          isLoading: existing?.isLoading ?? false,
          isSaving: true,
          error: null,
        },
      },
    });

    try {
      const override = await referralPlayerOverridesApi.save(payload);
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [player]: {
            override,
            isLoading: false,
            isSaving: false,
            error: null,
          },
        },
      });
      return override;
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to save referral override');
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [player]: {
            override: existing?.override ?? null,
            isLoading: false,
            isSaving: false,
            error: message,
          },
        },
      });
      throw new Error(message);
    }
  },

  reset: () => {
    set(initialState);
  },
}));
