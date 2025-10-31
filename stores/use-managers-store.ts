import { create } from 'zustand';
import { managersApi } from '@/lib/api';
import type { 
  Manager, 
  CreateUserRequest, 
  UpdateUserRequest,
  PaginatedResponse 
} from '@/types';

interface ManagersState {
  managers: PaginatedResponse<Manager> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface ManagersActions {
  fetchManagers: () => Promise<void>;
  createManager: (data: CreateUserRequest) => Promise<Manager>;
  updateManager: (id: number, data: UpdateUserRequest) => Promise<Manager>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type ManagersStore = ManagersState & ManagersActions;

const initialState: ManagersState = {
  managers: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useManagersStore = create<ManagersStore>((set, get) => ({
  ...initialState,

  fetchManagers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await managersApi.list(filters);
      
      set({ 
        managers: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load managers';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view managers.';
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

  createManager: async (data: CreateUserRequest) => {
    set({ error: null });
    try {
      const managerData = { ...data, role: 'manager' as const };
      const manager = await managersApi.create(managerData);
      
      if (!manager) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchManagers();
      
      return manager;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create manager';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to create managers.';
          }
        } else {
          const validationErrors: string[] = [];
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              validationErrors.push(`${field}: ${messages.join(', ')}`);
            }
          });
          
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('; ');
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updateManager: async (id: number, data: UpdateUserRequest) => {
    set({ error: null });
    try {
      const manager = await managersApi.update(id, data);
      
      if (!manager) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchManagers();
      
      return manager;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update manager';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update managers.';
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
    get().fetchManagers();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchManagers();
  },

  reset: () => {
    set(initialState);
  },
}));

