import { create } from 'zustand';
import { companiesApi } from '@/lib/api';
import type { 
  Company, 
  CreateCompanyRequest, 
  UpdateCompanyRequest,
  PaginatedResponse 
} from '@/types';

interface CompaniesState {
  companies: PaginatedResponse<Company> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface CompaniesActions {
  fetchCompanies: () => Promise<void>;
  createCompany: (data: CreateCompanyRequest) => Promise<Company>;
  updateCompany: (id: number, data: UpdateCompanyRequest) => Promise<Company>;
  partialUpdateCompany: (id: number, data: Partial<UpdateCompanyRequest>) => Promise<Company>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type CompaniesStore = CompaniesState & CompaniesActions;

const initialState: CompaniesState = {
  companies: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useCompaniesStore = create<CompaniesStore>((set, get) => ({
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

      const data = await companiesApi.list(filters);
      
      set({ 
        companies: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load companies';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        // Handle permission error specifically
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
      const company = await companiesApi.create(data);
      
      if (!company) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the list after creation
      await get().fetchCompanies();
      
      return company;
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
      const company = await companiesApi.update(id, data);
      
      if (!company) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the list after update
      await get().fetchCompanies();
      
      return company;
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

  partialUpdateCompany: async (id: number, data: Partial<UpdateCompanyRequest>) => {
    try {
      const company = await companiesApi.partialUpdate(id, data);
      
      if (!company) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the list after update
      await get().fetchCompanies();
      
      return company;
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
      currentPage: 1, // Reset to first page when searching
    });
    get().fetchCompanies();
  },

  reset: () => {
    set(initialState);
  },
}));

