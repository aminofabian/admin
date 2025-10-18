import { create } from 'zustand';
import { agentsApi, affiliatesApi } from '@/lib/api';
import type { 
  Agent, 
  CreateUserRequest, 
  UpdateUserRequest,
  PaginatedResponse,
  Affiliate,
  UpdateAffiliateRequest,
  AddManualAffiliateRequest,
} from '@/types';

interface AgentsState {
  // Agent data
  agents: PaginatedResponse<Agent> | null;
  isLoadingAgents: boolean;
  agentsError: string | null;
  
  // Affiliate data
  affiliates: PaginatedResponse<Affiliate> | null;
  isLoadingAffiliates: boolean;
  affiliatesError: string | null;
  
  // UI state
  currentPage: number;
  searchTerm: string;
  pageSize: number;
  
  // Form states
  isCreating: boolean;
  isUpdating: boolean;
  isUpdatingAffiliate: boolean;
  isAddingManualAffiliate: boolean;
  operationError: string | null;
}

interface AgentsActions {
  // Agent CRUD operations
  fetchAgents: () => Promise<void>;
  createAgent: (data: CreateUserRequest) => Promise<Agent>;
  updateAgent: (id: number, data: UpdateUserRequest) => Promise<Agent>;
  
  // Affiliate operations
  fetchAffiliates: () => Promise<void>;
  updateAffiliateCommission: (id: number, data: UpdateAffiliateRequest) => Promise<Affiliate>;
  addManualAffiliate: (data: AddManualAffiliateRequest) => Promise<void>;
  
  // UI actions
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
  clearErrors: () => void;
}

type AgentsStore = AgentsState & AgentsActions;

const initialState: AgentsState = {
  // Agent data
  agents: null,
  isLoadingAgents: false,
  agentsError: null,
  
  // Affiliate data
  affiliates: null,
  isLoadingAffiliates: false,
  affiliatesError: null,
  
  // UI state
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
  
  // Form states
  isCreating: false,
  isUpdating: false,
  isUpdatingAffiliate: false,
  isAddingManualAffiliate: false,
  operationError: null,
};

export const useAgentsStore = create<AgentsStore>((set, get) => ({
  ...initialState,

  fetchAgents: async () => {
    set({ isLoadingAgents: true, agentsError: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await agentsApi.list(filters);
      
      set({ 
        agents: data, 
        isLoadingAgents: false,
        agentsError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load agents';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view agents.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        agentsError: errorMessage,
        isLoadingAgents: false,
      });
    }
  },

  fetchAffiliates: async () => {
    set({ isLoadingAffiliates: true, affiliatesError: null });

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
        isLoadingAffiliates: false,
        affiliatesError: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load affiliates';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view affiliates.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        affiliatesError: errorMessage,
        isLoadingAffiliates: false,
      });
    }
  },

  createAgent: async (data: CreateUserRequest) => {
    set({ isCreating: true, operationError: null });

    try {
      // Ensure role is set to 'agent'
      const agentData = { ...data, role: 'agent' as const };
      const agent = await agentsApi.create(agentData);
      
      if (!agent) {
        throw new Error('No data returned from server');
      }
      
      // Refresh both agents and affiliates lists
      await Promise.all([
        get().fetchAgents(),
        get().fetchAffiliates(),
      ]);
      
      return agent;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create agent';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to create agents.';
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
    }
  },

  updateAgent: async (id: number, data: UpdateUserRequest) => {
    set({ isUpdating: true, operationError: null });

    try {
      const agent = await agentsApi.update(id, data);
      
      if (!agent) {
        throw new Error('No data returned from server');
      }
      
      // Refresh both agents and affiliates lists
      await Promise.all([
        get().fetchAgents(),
        get().fetchAffiliates(),
      ]);
      
      return agent;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update agent';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update agents.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ operationError: errorMessage, isUpdating: false });
      throw new Error(errorMessage);
    }
  },

  updateAffiliateCommission: async (id: number, data: UpdateAffiliateRequest) => {
    set({ isUpdatingAffiliate: true, operationError: null });

    try {
      const response = await affiliatesApi.update(id, data);
      
      if (!response || response.status !== 'success') {
        throw new Error(response?.message || 'No data returned from server');
      }
      
      // Refresh affiliates list
      await get().fetchAffiliates();
      
      return response.data;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update affiliate commission settings';
      
      if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to update affiliate settings.';
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ operationError: errorMessage, isUpdatingAffiliate: false });
      throw new Error(errorMessage);
    }
  },

  addManualAffiliate: async (data: AddManualAffiliateRequest) => {
    set({ isAddingManualAffiliate: true, operationError: null });

    try {
      const response = await affiliatesApi.addManual(data);
      
      if (!response || response.status !== 'success') {
        throw new Error(response?.message || 'No data returned from server');
      }
      
      // Refresh affiliates list
      await get().fetchAffiliates();
      
    } catch (err: unknown) {
      let errorMessage = 'Failed to add manual affiliate';
      
      if (err && typeof err === 'object') {
        if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('detail' in err) {
          errorMessage = String(err.detail);
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ operationError: errorMessage, isAddingManualAffiliate: false });
      throw new Error(errorMessage);
    }
  },

  setPage: (page: number) => {
    set({ currentPage: page });
    // Fetch both agents and affiliates when page changes
    Promise.all([
      get().fetchAgents(),
      get().fetchAffiliates(),
    ]);
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    // Fetch both agents and affiliates when search term changes
    Promise.all([
      get().fetchAgents(),
      get().fetchAffiliates(),
    ]);
  },

  clearErrors: () => {
    set({ 
      agentsError: null,
      affiliatesError: null,
      operationError: null,
    });
  },

  reset: () => {
    set(initialState);
  },
}));
