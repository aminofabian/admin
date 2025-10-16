import { create } from 'zustand';
import { affiliatesApi } from '@/lib/api';
import type { 
  Affiliate,
  UpdateAffiliateRequest,
  AddManualAffiliateRequest,
  PaginatedResponse 
} from '@/types';

interface AffiliatesState {
  affiliates: PaginatedResponse<Affiliate> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface AffiliatesActions {
  fetchAffiliates: () => Promise<void>;
  updateAffiliate: (id: number, data: UpdateAffiliateRequest) => Promise<void>;
  addManualAffiliate: (data: AddManualAffiliateRequest) => Promise<void>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type AffiliatesStore = AffiliatesState & AffiliatesActions;

const initialState: AffiliatesState = {
  affiliates: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useAffiliatesStore = create<AffiliatesStore>((set, get) => ({
  ...initialState,

  fetchAffiliates: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await affiliatesApi.list(filters);
      
      set({ 
        affiliates: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load affiliates';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to view affiliates.';
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

  updateAffiliate: async (id: number, data: UpdateAffiliateRequest) => {
    try {
      await affiliatesApi.update(id, data);
      
      // Refresh the affiliates list after update
      await get().fetchAffiliates();
    } catch (err: unknown) {
      let errorMessage = 'Failed to update affiliate';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to update affiliates.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  addManualAffiliate: async (data: AddManualAffiliateRequest) => {
    try {
      const response = await affiliatesApi.addManual(data);
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to add affiliate');
      }
      
      // Refresh the affiliates list after adding
      await get().fetchAffiliates();
    } catch (err: unknown) {
      let errorMessage = 'Failed to add manual affiliate';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
        } else if ('message' in err) {
          errorMessage = String(err.message);
        }
        
        if (errorMessage.toLowerCase().includes('already affiliated')) {
          errorMessage = 'Player is already affiliated with an agent.';
        } else if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to add affiliates.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchAffiliates();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchAffiliates();
  },

  reset: () => {
    set(initialState);
  },
}));

