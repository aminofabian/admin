import { create } from 'zustand';
import { companySettingsApi } from '@/lib/api';
import type { 
  CompanySettings,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  PaginatedResponse 
} from '@/types';

interface CompanySettingsState {
  companies: PaginatedResponse<CompanySettings> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface CompanySettingsActions {
  fetchCompanies: () => Promise<void>;
  createCompany: (data: CreateCompanyRequest) => Promise<CompanySettings>;
  updateCompany: (id: number, data: UpdateCompanyRequest) => Promise<CompanySettings>;
  patchCompany: (id: number, data: UpdateCompanyRequest) => Promise<CompanySettings>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type CompanySettingsStore = CompanySettingsState & CompanySettingsActions;

const initialState: CompanySettingsState = {
  companies: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useCompanySettingsStore = create<CompanySettingsStore>((set, get) => ({
  ...initialState,

  fetchCompanies: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await companySettingsApi.list(filters);
      
      set({ 
        companies: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load companies';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need superadmin privileges to view companies.';
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

  createCompany: async (data: CreateCompanyRequest) => {
    try {
      const response = await companySettingsApi.create(data);
      
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the companies list after creation
      await get().fetchCompanies();
      
      return response.data;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create company';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need superadmin privileges to create companies.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateCompany: async (id: number, data: UpdateCompanyRequest) => {
    try {
      const response = await companySettingsApi.update(id, data);
      
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the companies list after update
      await get().fetchCompanies();
      
      return response.data;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update company';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need superadmin privileges to update companies.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  patchCompany: async (id: number, data: UpdateCompanyRequest) => {
    try {
      const response = await companySettingsApi.patch(id, data);
      
      if (!response.data) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the companies list after update
      await get().fetchCompanies();
      
      return response.data;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update company';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need superadmin privileges to update companies.';
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
    get().fetchCompanies();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchCompanies();
  },

  reset: () => {
    set(initialState);
  },
}));
