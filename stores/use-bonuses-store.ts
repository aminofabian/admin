import { create } from 'zustand';
import { bonusesApi } from '@/lib/api';
import type { 
  PurchaseBonus,
  RechargeBonus,
  TransferBonus,
  SignupBonus,
  CreatePurchaseBonusRequest,
  UpdateBonusRequest,
  UpdatePurchaseBonusRequest,
  PaginatedResponse 
} from '@/types';
import type { AffiliateDefaults, UpdateAffiliateDefaultsRequest } from '@/types/affiliate';

interface BonusesState {
  purchaseBonuses: PaginatedResponse<PurchaseBonus> | null;
  rechargeBonuses: PaginatedResponse<RechargeBonus> | null;
  transferBonuses: PaginatedResponse<TransferBonus> | null;
  signupBonuses: PaginatedResponse<SignupBonus> | null;
  affiliateDefaults: PaginatedResponse<AffiliateDefaults> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
  operationLoading: {
    purchase: boolean;
    recharge: boolean;
    transfer: boolean;
    signup: boolean;
    affiliateDefaults: boolean;
  };
}

interface BonusesActions {
  fetchPurchaseBonuses: () => Promise<void>;
  createPurchaseBonus: (data: CreatePurchaseBonusRequest) => Promise<PurchaseBonus>;
  updatePurchaseBonus: (id: number, data: UpdatePurchaseBonusRequest) => Promise<PurchaseBonus>;
  deletePurchaseBonus: (id: number) => Promise<void>;
  
  fetchRechargeBonuses: () => Promise<void>;
  updateRechargeBonus: (id: number, data: UpdateBonusRequest) => Promise<RechargeBonus>;
  
  fetchTransferBonuses: () => Promise<void>;
  updateTransferBonus: (id: number, data: UpdateBonusRequest) => Promise<TransferBonus>;
  
  fetchSignupBonuses: () => Promise<void>;
  updateSignupBonus: (id: number, data: UpdateBonusRequest) => Promise<SignupBonus>;
  
  fetchAffiliateDefaults: () => Promise<void>;
  updateAffiliateDefaults: (id: number, data: UpdateAffiliateDefaultsRequest) => Promise<AffiliateDefaults>;
  
  fetchAllBonuses: () => Promise<void>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  clearErrors: () => void;
  reset: () => void;
}

type BonusesStore = BonusesState & BonusesActions;

const initialState: BonusesState = {
  purchaseBonuses: null,
  rechargeBonuses: null,
  transferBonuses: null,
  signupBonuses: null,
  affiliateDefaults: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
  operationLoading: {
    purchase: false,
    recharge: false,
    transfer: false,
    signup: false,
    affiliateDefaults: false,
  },
};

export const useBonusesStore = create<BonusesStore>((set, get) => ({
  ...initialState,

  fetchPurchaseBonuses: async () => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, purchase: true },
      error: null 
    }));

    try {
      const data = await bonusesApi.purchase.list();
      
      set((state) => ({ 
        purchaseBonuses: data,
        operationLoading: { ...state.operationLoading, purchase: false },
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load purchase bonuses');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
    }
  },

  createPurchaseBonus: async (data: CreatePurchaseBonusRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, purchase: true },
    }));

    try {
      const bonus = await bonusesApi.purchase.create(data);
      
      if (!bonus) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchPurchaseBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
      
      return bonus;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to create purchase bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
      throw new Error(errorMessage);
    }
  },

  updatePurchaseBonus: async (id: number, data: UpdatePurchaseBonusRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, purchase: true },
    }));

    try {
      const bonus = await bonusesApi.purchase.update(id, data);
      
      if (!bonus) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchPurchaseBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
      
      return bonus;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to update purchase bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
      throw new Error(errorMessage);
    }
  },

  deletePurchaseBonus: async (id: number) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, purchase: true },
    }));

    try {
      await bonusesApi.purchase.delete(id);
      await get().fetchPurchaseBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to delete purchase bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, purchase: false },
      }));
      throw new Error(errorMessage);
    }
  },

  fetchRechargeBonuses: async () => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, recharge: true },
      error: null 
    }));

    try {
      const data = await bonusesApi.recharge.list();
      
      set((state) => ({ 
        rechargeBonuses: data,
        operationLoading: { ...state.operationLoading, recharge: false },
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load recharge bonuses');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, recharge: false },
      }));
    }
  },

  updateRechargeBonus: async (id: number, data: UpdateBonusRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, recharge: true },
    }));

    try {
      const bonus = await bonusesApi.recharge.update(id, data);
      
      if (!bonus) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchRechargeBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, recharge: false },
      }));
      
      return bonus;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to update recharge bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, recharge: false },
      }));
      throw new Error(errorMessage);
    }
  },

  fetchTransferBonuses: async () => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, transfer: true },
      error: null 
    }));

    try {
      const data = await bonusesApi.transfer.list();
      
      set((state) => ({ 
        transferBonuses: data,
        operationLoading: { ...state.operationLoading, transfer: false },
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load transfer bonuses');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, transfer: false },
      }));
    }
  },

  updateTransferBonus: async (id: number, data: UpdateBonusRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, transfer: true },
    }));

    try {
      const bonus = await bonusesApi.transfer.update(id, data);
      
      if (!bonus) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchTransferBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, transfer: false },
      }));
      
      return bonus;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to update transfer bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, transfer: false },
      }));
      throw new Error(errorMessage);
    }
  },

  fetchSignupBonuses: async () => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, signup: true },
      error: null 
    }));

    try {
      const data = await bonusesApi.signup.list();
      
      set((state) => ({ 
        signupBonuses: data,
        operationLoading: { ...state.operationLoading, signup: false },
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load signup bonuses');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, signup: false },
      }));
    }
  },

  updateSignupBonus: async (id: number, data: UpdateBonusRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, signup: true },
    }));

    try {
      const bonus = await bonusesApi.signup.update(id, data);
      
      if (!bonus) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchSignupBonuses();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, signup: false },
      }));
      
      return bonus;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to update signup bonus');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, signup: false },
      }));
      throw new Error(errorMessage);
    }
  },

  fetchAffiliateDefaults: async () => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, affiliateDefaults: true },
      error: null 
    }));

    try {
      const data = await bonusesApi.affiliateDefaults.list();
      
      set((state) => ({ 
        affiliateDefaults: data,
        operationLoading: { ...state.operationLoading, affiliateDefaults: false },
        error: null,
      }));
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load affiliate defaults');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, affiliateDefaults: false },
      }));
    }
  },

  updateAffiliateDefaults: async (id: number, data: UpdateAffiliateDefaultsRequest) => {
    set((state) => ({ 
      operationLoading: { ...state.operationLoading, affiliateDefaults: true },
    }));

    try {
      const defaults = await bonusesApi.affiliateDefaults.update(id, data);
      
      if (!defaults) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchAffiliateDefaults();
      
      set((state) => ({ 
        operationLoading: { ...state.operationLoading, affiliateDefaults: false },
      }));
      
      return defaults;
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to update affiliate defaults');
      
      set((state) => ({ 
        error: errorMessage,
        operationLoading: { ...state.operationLoading, affiliateDefaults: false },
      }));
      throw new Error(errorMessage);
    }
  },

  fetchAllBonuses: async () => {
    set({ isLoading: true, error: null });

    try {
      await Promise.all([
        get().fetchPurchaseBonuses(),
        get().fetchRechargeBonuses(),
        get().fetchTransferBonuses(),
        get().fetchSignupBonuses(),
        get().fetchAffiliateDefaults(),
      ]);
      
      set({ isLoading: false });
    } catch (err: unknown) {
      const errorMessage = extractErrorMessage(err, 'Failed to load bonuses');
      
      set({ 
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
  },

  clearErrors: () => {
    set({ error: null });
  },

  reset: () => {
    set(initialState);
  },
}));

function extractErrorMessage(err: unknown, defaultMessage: string): string {
  let errorMessage = defaultMessage;
  
  if (err && typeof err === 'object' && 'detail' in err) {
    errorMessage = String(err.detail);
    
    if (errorMessage.toLowerCase().includes('permission')) {
      errorMessage = 'Access Denied: You need admin-level privileges to manage bonuses.';
    }
  } else if (err instanceof Error) {
    errorMessage = err.message;
  }
  
  return errorMessage;
}

