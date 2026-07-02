import { create } from 'zustand';
import { referralSettingsApi } from '@/lib/api';
import type { ReferralSettings, UpdateReferralSettingsRequest } from '@/types';

interface ReferralSettingsState {
  referralSettings: ReferralSettings | null;
  isLoading: boolean;
  error: string | null;
}

interface ReferralSettingsActions {
  fetchReferralSettings: () => Promise<void>;
  patchReferralSettings: (data: UpdateReferralSettingsRequest) => Promise<ReferralSettings>;
  reset: () => void;
}

type ReferralSettingsStore = ReferralSettingsState & ReferralSettingsActions;

const initialState: ReferralSettingsState = {
  referralSettings: null,
  isLoading: false,
  error: null,
};

export const useReferralSettingsStore = create<ReferralSettingsStore>((set, get) => ({
  ...initialState,

  fetchReferralSettings: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await referralSettingsApi.get();

      set({
        referralSettings: data,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load referral settings';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage =
            'Access Denied: You need company or superadmin privileges to view referral settings.';
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

  patchReferralSettings: async (data: UpdateReferralSettingsRequest) => {
    const { referralSettings } = get();

    if (!referralSettings?.id) {
      const errorMessage = 'Referral settings are not loaded yet';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }

    try {
      const settings = await referralSettingsApi.patch(referralSettings.id, data);
      set({ referralSettings: settings, error: null });
      return settings;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update referral settings';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage =
            'Access Denied: You need company or superadmin privileges to update referral settings.';
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
