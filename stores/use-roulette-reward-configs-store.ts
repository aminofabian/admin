import { create } from 'zustand';
import {
  rouletteRewardConfigsApi,
  type RouletteRewardConfig,
  type SaveRouletteRewardConfigRequest,
} from '@/lib/api/roulette-reward-configs';

interface RouletteRewardConfigsState {
  config: RouletteRewardConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  loaded: boolean;
}

interface RouletteRewardConfigsActions {
  fetchConfig: () => Promise<void>;
  saveConfig: (payload: SaveRouletteRewardConfigRequest) => Promise<RouletteRewardConfig>;
  reset: () => void;
}

type Store = RouletteRewardConfigsState & RouletteRewardConfigsActions;

const initialState: RouletteRewardConfigsState = {
  config: null,
  isLoading: false,
  isSaving: false,
  error: null,
  loaded: false,
};

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const detail = typeof obj.detail === 'string' ? obj.detail : '';
    if (detail.toLowerCase().includes('permission')) {
      return 'Access denied: insufficient privileges to manage prize wheel configuration.';
    }
    if (detail) return detail;
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export const useRouletteRewardConfigsStore = create<Store>((set) => ({
  ...initialState,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const config = await rouletteRewardConfigsApi.get();
      set({ config, isLoading: false, loaded: true, error: null });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: parseErrorMessage(err, 'Failed to load prize wheel configuration'),
      });
    }
  },

  saveConfig: async (payload: SaveRouletteRewardConfigRequest) => {
    set({ isSaving: true, error: null });
    try {
      const config = await rouletteRewardConfigsApi.save(payload);
      // Mark `using_default = false` after a successful save (server will confirm on next fetch).
      set({
        config: { ...config, using_default: false },
        isSaving: false,
        loaded: true,
        error: null,
      });
      return config;
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to save prize wheel configuration');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  reset: () => {
    set(initialState);
  },
}));
