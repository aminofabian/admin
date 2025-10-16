import { create } from 'zustand';
import { bannersApi } from '@/lib/api';
import type { 
  Banner,
  CreateBannerRequest,
  UpdateBannerRequest,
  PaginatedResponse 
} from '@/types';

interface BannersState {
  banners: PaginatedResponse<Banner> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface BannersActions {
  fetchBanners: () => Promise<void>;
  createBanner: (data: CreateBannerRequest) => Promise<Banner>;
  updateBanner: (id: number, data: UpdateBannerRequest) => Promise<Banner>;
  deleteBanner: (id: number) => Promise<void>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type BannersStore = BannersState & BannersActions;

const initialState: BannersState = {
  banners: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useBannersStore = create<BannersStore>((set, get) => ({
  ...initialState,

  fetchBanners: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await bannersApi.list(filters);
      
      set({ 
        banners: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load banners';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view banners.';
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

  createBanner: async (data: CreateBannerRequest) => {
    try {
      const banner = await bannersApi.create(data);
      
      if (!banner) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the banners list after creation
      await get().fetchBanners();
      
      return banner;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create banner';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to create banners.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateBanner: async (id: number, data: UpdateBannerRequest) => {
    try {
      const banner = await bannersApi.update(id, data);
      
      if (!banner) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the banners list after update
      await get().fetchBanners();
      
      return banner;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update banner';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update banners.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteBanner: async (id: number) => {
    try {
      await bannersApi.delete(id);
      
      // Refresh the banners list after deletion
      await get().fetchBanners();
    } catch (err: unknown) {
      let errorMessage = 'Failed to delete banner';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to delete banners.';
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
    get().fetchBanners();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchBanners();
  },

  reset: () => {
    set(initialState);
  },
}));

