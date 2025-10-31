import { create } from 'zustand';
import { staffsApi } from '@/lib/api';
import type { 
  Staff, 
  CreateUserRequest, 
  UpdateUserRequest,
  PaginatedResponse 
} from '@/types';

interface StaffsState {
  staffs: PaginatedResponse<Staff> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
  
  // Form states
  isCreating: boolean;
  isUpdating: boolean;
  operationError: string | null;
}

interface StaffsActions {
  fetchStaffs: () => Promise<void>;
  createStaff: (data: CreateUserRequest) => Promise<Staff>;
  updateStaff: (id: number, data: UpdateUserRequest) => Promise<Staff>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
  clearErrors: () => void;
}

type StaffsStore = StaffsState & StaffsActions;

const initialState: StaffsState = {
  staffs: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
  isCreating: false,
  isUpdating: false,
  operationError: null,
};

export const useStaffsStore = create<StaffsStore>((set, get) => ({
  ...initialState,

  fetchStaffs: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await staffsApi.list(filters);
      
      set({ 
        staffs: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load staff members';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view staff members.';
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

  createStaff: async (data: CreateUserRequest) => {
    set({ isCreating: true, operationError: null });

    try {
      // Ensure role is set to 'staff'
      const staffData = { ...data, role: 'staff' as const };
      const staff = await staffsApi.create(staffData);
      
      if (!staff) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchStaffs();
      
      return staff;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create staff member';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to create staff members.';
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
      
      set({ operationError: errorMessage, isCreating: false });
      throw new Error(errorMessage);
    } finally {
      set({ isCreating: false });
    }
  },

  updateStaff: async (id: number, data: UpdateUserRequest) => {
    set({ isUpdating: true, operationError: null });

    try {
      const staff = await staffsApi.update(id, data);
      
      if (!staff) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchStaffs();
      
      return staff;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update staff member';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update staff members.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ operationError: errorMessage, isUpdating: false });
      throw new Error(errorMessage);
    } finally {
      set({ isUpdating: false });
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchStaffs();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchStaffs();
  },

  clearErrors: () => {
    set({ 
      error: null,
      operationError: null,
    });
  },

  reset: () => {
    set(initialState);
  },
}));
