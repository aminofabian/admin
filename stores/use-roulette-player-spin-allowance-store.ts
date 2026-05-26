import { create } from 'zustand';
import {
  playerRouletteSpinAllowancesApi,
  type PlayerRouletteSpinAllowance,
  type SavePlayerRouletteSpinAllowanceRequest,
} from '@/lib/api/roulette-player-spin-allowances';

type PerPlayerEntry = {
  allowance: PlayerRouletteSpinAllowance | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
};

interface RoulettePlayerSpinAllowanceState {
  byPlayerId: Record<number, PerPlayerEntry>;
}

interface RoulettePlayerSpinAllowanceActions {
  fetchForPlayer: (playerId: number) => Promise<void>;
  saveForPlayer: (
    payload: SavePlayerRouletteSpinAllowanceRequest,
  ) => Promise<PlayerRouletteSpinAllowance>;
  reset: () => void;
}

type Store = RoulettePlayerSpinAllowanceState & RoulettePlayerSpinAllowanceActions;

const initialState: RoulettePlayerSpinAllowanceState = {
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
      return 'Access denied: insufficient privileges to manage player spin allowances.';
    }
    return detail;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useRoulettePlayerSpinAllowanceStore = create<Store>((set, get) => ({
  ...initialState,

  fetchForPlayer: async (playerId: number) => {
    const existing = get().byPlayerId[playerId];
    set({
      byPlayerId: {
        ...get().byPlayerId,
        [playerId]: {
          allowance: existing?.allowance ?? null,
          isLoading: true,
          isSaving: existing?.isSaving ?? false,
          error: null,
        },
      },
    });

    try {
      const allowance = await playerRouletteSpinAllowancesApi.get(playerId);
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [playerId]: {
            allowance,
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
              allowance: null,
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
            allowance: existing?.allowance ?? null,
            isLoading: false,
            isSaving: false,
            error: parseErrorMessage(err, 'Failed to load player spin allowance'),
          },
        },
      });
    }
  },

  saveForPlayer: async (payload: SavePlayerRouletteSpinAllowanceRequest) => {
    const { player_id } = payload;
    const existing = get().byPlayerId[player_id];
    set({
      byPlayerId: {
        ...get().byPlayerId,
        [player_id]: {
          allowance: existing?.allowance ?? null,
          isLoading: existing?.isLoading ?? false,
          isSaving: true,
          error: null,
        },
      },
    });

    try {
      const allowance = await playerRouletteSpinAllowancesApi.save(payload);
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [player_id]: {
            allowance,
            isLoading: false,
            isSaving: false,
            error: null,
          },
        },
      });
      return allowance;
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to save player spin allowance');
      set({
        byPlayerId: {
          ...get().byPlayerId,
          [player_id]: {
            allowance: existing?.allowance ?? null,
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
