import { create } from 'zustand';
import { affiliateSettingsApi } from '@/lib/api';
import type { 
  AffiliateDefaultSettings,
  UpdateAffiliateDefaultsRequest
} from '@/types';

interface AffiliateSettingsState {
  affiliateDefaults: AffiliateDefaultSettings | null;
  isLoading: boolean;
  error: string | null;
}

interface AffiliateSettingsActions {
  fetchAffiliateDefaults: () => Promise<void>;
  updateAffiliateDefaults: (data: UpdateAffiliateDefaultsRequest) => Promise<AffiliateDefaultSettings>;
  patchAffiliateDefaults: (data: UpdateAffiliateDefaultsRequest) => Promise<AffiliateDefaultSettings>;
  reset: () => void;
}

type AffiliateSettingsStore = AffiliateSettingsState & AffiliateSettingsActions;

const initialState: AffiliateSettingsState = {
  affiliateDefaults: null,
  isLoading: false,
  error: null,
};

export const useAffiliateSettingsStore = create<AffiliateSettingsStore>((set, get) => ({
  ...initialState,

  fetchAffiliateDefaults: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await affiliateSettingsApi.get();
      
      set({ 
        affiliateDefaults: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load affiliate default settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view affiliate settings.';
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

  updateAffiliateDefaults: async (data: UpdateAffiliateDefaultsRequest) => {
    try {
      const settings = await affiliateSettingsApi.update(data);
      
      // Refresh the affiliate defaults after update
      await get().fetchAffiliateDefaults();
      
      return settings;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update affiliate default settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update affiliate settings.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchAffiliateDefaults: async (data: UpdateAffiliateDefaultsRequest) => {
    try {
      const settings = await affiliateSettingsApi.patch(data);
      
      // Refresh the affiliate defaults after update
      await get().fetchAffiliateDefaults();
      
      return settings;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update affiliate default settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update affiliate settings.';
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
