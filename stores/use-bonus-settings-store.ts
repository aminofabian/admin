import { create } from 'zustand';
import { 
  purchaseBonusSettingsApi, 
  rechargeBonusSettingsApi, 
  transferBonusSettingsApi, 
  signupBonusSettingsApi 
} from '@/lib/api';
import type { 
  PurchaseBonusSettings,
  RechargeBonusSettings,
  TransferBonusSettings,
  SignupBonusSettings,
  CreatePurchaseBonusRequest,
  UpdateBonusSettingsRequest,
  PaginatedResponse 
} from '@/types';

interface BonusSettingsState {
  // Purchase Bonuses
  purchaseBonuses: PaginatedResponse<PurchaseBonusSettings> | null;
  purchaseBonusesLoading: boolean;
  purchaseBonusesError: string | null;
  
  // Recharge Bonuses
  rechargeBonuses: PaginatedResponse<RechargeBonusSettings> | null;
  rechargeBonusesLoading: boolean;
  rechargeBonusesError: string | null;
  
  // Transfer Bonus (single entry)
  transferBonus: TransferBonusSettings | null;
  transferBonusLoading: boolean;
  transferBonusError: string | null;
  
  // Signup Bonus (single entry)
  signupBonus: SignupBonusSettings | null;
  signupBonusLoading: boolean;
  signupBonusError: string | null;
  
  // Pagination
  currentPage: number;
  pageSize: number;
}

interface BonusSettingsActions {
  // Purchase Bonuses
  fetchPurchaseBonuses: () => Promise<void>;
  createPurchaseBonus: (data: CreatePurchaseBonusRequest) => Promise<PurchaseBonusSettings>;
  updatePurchaseBonus: (id: number, data: CreatePurchaseBonusRequest) => Promise<PurchaseBonusSettings>;
  patchPurchaseBonus: (id: number, data: UpdateBonusSettingsRequest) => Promise<PurchaseBonusSettings>;
  deletePurchaseBonus: (id: number) => Promise<void>;
  
  // Recharge Bonuses
  fetchRechargeBonuses: () => Promise<void>;
  updateRechargeBonus: (id: number, data: UpdateBonusSettingsRequest) => Promise<RechargeBonusSettings>;
  patchRechargeBonus: (id: number, data: UpdateBonusSettingsRequest) => Promise<RechargeBonusSettings>;
  
  // Transfer Bonus
  fetchTransferBonus: () => Promise<void>;
  updateTransferBonus: (data: UpdateBonusSettingsRequest) => Promise<TransferBonusSettings>;
  patchTransferBonus: (data: UpdateBonusSettingsRequest) => Promise<TransferBonusSettings>;
  
  // Signup Bonus
  fetchSignupBonus: () => Promise<void>;
  updateSignupBonus: (data: UpdateBonusSettingsRequest) => Promise<SignupBonusSettings>;
  patchSignupBonus: (data: UpdateBonusSettingsRequest) => Promise<SignupBonusSettings>;
  
  // Common
  setPage: (page: number) => void;
  reset: () => void;
}

type BonusSettingsStore = BonusSettingsState & BonusSettingsActions;

const initialState: BonusSettingsState = {
  // Purchase Bonuses
  purchaseBonuses: null,
  purchaseBonusesLoading: false,
  purchaseBonusesError: null,
  
  // Recharge Bonuses
  rechargeBonuses: null,
  rechargeBonusesLoading: false,
  rechargeBonusesError: null,
  
  // Transfer Bonus
  transferBonus: null,
  transferBonusLoading: false,
  transferBonusError: null,
  
  // Signup Bonus
  signupBonus: null,
  signupBonusLoading: false,
  signupBonusError: null,
  
  // Pagination
  currentPage: 1,
  pageSize: 10,
};

export const useBonusSettingsStore = create<BonusSettingsStore>((set, get) => ({
  ...initialState,

  // Purchase Bonuses
  fetchPurchaseBonuses: async () => {
    set({ purchaseBonusesLoading: true, purchaseBonusesError: null });

    try {
      const { currentPage, pageSize } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
      };

      const data = await purchaseBonusSettingsApi.list(filters);
      
      set({ 
        purchaseBonuses: data, 
        purchaseBonusesLoading: false,
        purchaseBonusesError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load purchase bonuses';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        purchaseBonusesError: errorMessage,
        purchaseBonusesLoading: false,
      });
    }
  },

  createPurchaseBonus: async (data: CreatePurchaseBonusRequest) => {
    try {
      const bonus = await purchaseBonusSettingsApi.create(data);
      
      // Refresh the purchase bonuses list after creation
      await get().fetchPurchaseBonuses();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create purchase bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ purchaseBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updatePurchaseBonus: async (id: number, data: CreatePurchaseBonusRequest) => {
    try {
      const bonus = await purchaseBonusSettingsApi.update(id, data);
      
      // Refresh the purchase bonuses list after update
      await get().fetchPurchaseBonuses();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update purchase bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ purchaseBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchPurchaseBonus: async (id: number, data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await purchaseBonusSettingsApi.patch(id, data);
      
      // Refresh the purchase bonuses list after update
      await get().fetchPurchaseBonuses();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update purchase bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ purchaseBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deletePurchaseBonus: async (id: number) => {
    try {
      await purchaseBonusSettingsApi.delete(id);
      
      // Refresh the purchase bonuses list after deletion
      await get().fetchPurchaseBonuses();
    } catch (err: unknown) {
      let errorMessage = 'Failed to delete purchase bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ purchaseBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Recharge Bonuses
  fetchRechargeBonuses: async () => {
    set({ rechargeBonusesLoading: true, rechargeBonusesError: null });

    try {
      const { currentPage, pageSize } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
      };

      const data = await rechargeBonusSettingsApi.list(filters);
      
      set({ 
        rechargeBonuses: data, 
        rechargeBonusesLoading: false,
        rechargeBonusesError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load recharge bonuses';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        rechargeBonusesError: errorMessage,
        rechargeBonusesLoading: false,
      });
    }
  },

  updateRechargeBonus: async (id: number, data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await rechargeBonusSettingsApi.update(id, data);
      
      // Refresh the recharge bonuses list after update
      await get().fetchRechargeBonuses();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update recharge bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ rechargeBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchRechargeBonus: async (id: number, data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await rechargeBonusSettingsApi.patch(id, data);
      
      // Refresh the recharge bonuses list after update
      await get().fetchRechargeBonuses();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update recharge bonus';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ rechargeBonusesError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Transfer Bonus
  fetchTransferBonus: async () => {
    set({ transferBonusLoading: true, transferBonusError: null });

    try {
      const bonus = await transferBonusSettingsApi.get();
      
      set({ 
        transferBonus: bonus, 
        transferBonusLoading: false,
        transferBonusError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load transfer bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        transferBonusError: errorMessage,
        transferBonusLoading: false,
      });
    }
  },

  updateTransferBonus: async (data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await transferBonusSettingsApi.update(data);
      
      // Refresh the transfer bonus after update
      await get().fetchTransferBonus();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update transfer bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ transferBonusError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchTransferBonus: async (data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await transferBonusSettingsApi.patch(data);
      
      // Refresh the transfer bonus after update
      await get().fetchTransferBonus();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update transfer bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ transferBonusError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  // Signup Bonus
  fetchSignupBonus: async () => {
    set({ signupBonusLoading: true, signupBonusError: null });

    try {
      const bonus = await signupBonusSettingsApi.get();
      
      set({ 
        signupBonus: bonus, 
        signupBonusLoading: false,
        signupBonusError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load signup bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        signupBonusError: errorMessage,
        signupBonusLoading: false,
      });
    }
  },

  updateSignupBonus: async (data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await signupBonusSettingsApi.update(data);
      
      // Refresh the signup bonus after update
      await get().fetchSignupBonus();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update signup bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ signupBonusError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchSignupBonus: async (data: UpdateBonusSettingsRequest) => {
    try {
      const bonus = await signupBonusSettingsApi.patch(data);
      
      // Refresh the signup bonus after update
      await get().fetchSignupBonus();
      
      return bonus;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update signup bonus settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ signupBonusError: errorMessage });
      throw new Error(errorMessage);
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchPurchaseBonuses();
    get().fetchRechargeBonuses();
  },

  reset: () => {
    set(initialState);
  },
}));
