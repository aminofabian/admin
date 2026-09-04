import { create } from 'zustand';
import {
  cashout24hLimitApi,
  type Cashout24hCompanyDefault,
} from '@/lib/api/cashout-24h-limit';

interface Cashout24hSettingsState {
  companyDefault: Cashout24hCompanyDefault | null;
  isLoading: boolean;
  error: string | null;
}

interface Cashout24hSettingsActions {
  fetchCompanyDefault: () => Promise<void>;
  patchCompanyDefault: (cashout_24h_limit: string | null) => Promise<Cashout24hCompanyDefault>;
  reset: () => void;
}

type Store = Cashout24hSettingsState & Cashout24hSettingsActions;

const initialState: Cashout24hSettingsState = {
  companyDefault: null,
  isLoading: false,
  error: null,
};

export const useCashout24hSettingsStore = create<Store>((set) => ({
  ...initialState,

  fetchCompanyDefault: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await cashout24hLimitApi.getCompanyDefault();
      set({
        companyDefault: data,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load 24-hour cashout limit settings';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage =
            'Access Denied: You need company or manager privileges to view cashout limit settings.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  patchCompanyDefault: async (cashout_24h_limit: string | null) => {
    try {
      const settings = await cashout24hLimitApi.patchCompanyDefault(cashout_24h_limit);
      set({ companyDefault: settings, error: null });
      return settings;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update 24-hour cashout limit settings';

      if (err && typeof err === 'object') {
        const obj = err as Record<string, unknown>;
        if (typeof obj.cashout_24h_limit === 'string') {
          errorMessage = obj.cashout_24h_limit;
        } else if (Array.isArray(obj.cashout_24h_limit) && obj.cashout_24h_limit[0]) {
          errorMessage = String(obj.cashout_24h_limit[0]);
        } else if ('detail' in obj) {
          errorMessage = String(obj.detail);
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  reset: () => {
    set(initialState);
  },
}));
