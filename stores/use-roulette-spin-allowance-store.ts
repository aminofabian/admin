import { create } from 'zustand';
import {
  rouletteSpinAllowancesApi,
  type RouletteSpinAllowance,
  type SaveRouletteSpinAllowanceRequest,
} from '@/lib/api/roulette-spin-allowances';

interface RouletteSpinAllowanceState {
  allowance: RouletteSpinAllowance | null;
  isLoading: boolean;
  error: string | null;
}

interface RouletteSpinAllowanceActions {
  fetchAllowance: () => Promise<void>;
  saveAllowance: (data: SaveRouletteSpinAllowanceRequest) => Promise<RouletteSpinAllowance>;
  reset: () => void;
}

type RouletteSpinAllowanceStore = RouletteSpinAllowanceState & RouletteSpinAllowanceActions;

const initialState: RouletteSpinAllowanceState = {
  allowance: null,
  isLoading: false,
  error: null,
};

function isNotFoundError(err: unknown): boolean {
  if (err instanceof Error) {
    return err.message.includes('404') || err.message.toLowerCase().includes('not found');
  }
  if (err && typeof err === 'object' && 'message' in err) {
    const message = String(err.message).toLowerCase();
    return message.includes('404') || message.includes('not found');
  }
  return false;
}

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'detail' in err) {
    const detail = String(err.detail);
    if (detail.toLowerCase().includes('permission')) {
      return 'Access denied: company or superadmin privileges are required.';
    }
    return detail;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
}

export const useRouletteSpinAllowanceStore = create<RouletteSpinAllowanceStore>((set) => ({
  ...initialState,

  fetchAllowance: async () => {
    set({ isLoading: true, error: null });

    try {
      const allowance = await rouletteSpinAllowancesApi.get();
      set({ allowance, isLoading: false, error: null });
    } catch (err: unknown) {
      if (isNotFoundError(err)) {
        set({ allowance: null, isLoading: false, error: null });
        return;
      }

      set({
        error: parseErrorMessage(err, 'Failed to load roulette spin allowance settings'),
        isLoading: false,
      });
    }
  },

  saveAllowance: async (data: SaveRouletteSpinAllowanceRequest) => {
    try {
      const allowance = await rouletteSpinAllowancesApi.save(data);
      set({ allowance, error: null });
      return allowance;
    } catch (err: unknown) {
      const errorMessage = parseErrorMessage(
        err,
        'Failed to save roulette spin allowance settings',
      );
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  reset: () => {
    set(initialState);
  },
}));
