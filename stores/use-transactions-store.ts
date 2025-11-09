import { create } from 'zustand';
import { transactionsApi } from '@/lib/api';
import type { 
  Transaction,
  TransactionFilters,
  PaginatedResponse 
} from '@/types';

type FilterType = 
  | 'all' 
  | 'purchases' 
  | 'cashouts' 
  | 'pending-purchases' 
  | 'pending-cashouts' 
  | 'processing' 
  | 'history';

interface TransactionsState {
  transactions: PaginatedResponse<Transaction> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  filter: FilterType;
  pageSize: number;
  advancedFilters: Record<string, string>;
  isUpdatingTransaction: boolean;
  updatingTransactionId: string | null;
}

interface TransactionsActions {
  fetchTransactions: () => Promise<void>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  setFilter: (filter: FilterType) => void;
  setAdvancedFilters: (filters: Record<string, string>) => void;
  clearAdvancedFilters: () => void;
  updateTransactionStatus: (options: { id: string; status: 'completed' | 'cancelled' }) => Promise<void>;
  reset: () => void;
}

type TransactionsStore = TransactionsState & TransactionsActions;

const initialState: TransactionsState = {
  transactions: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  filter: 'all',
  pageSize: 10,
  advancedFilters: {},
  isUpdatingTransaction: false,
  updatingTransactionId: null,
};

export const useTransactionsStore = create<TransactionsStore>((set, get) => ({
  ...initialState,

  fetchTransactions: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm, filter, advancedFilters } = get();
      
      const filters: TransactionFilters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      // Clean and process advanced filters
      const cleanedAdvancedFilters: Record<string, string | number> = {};
      
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          // Convert agent_id to number if it's a valid number
          if (key === 'agent_id') {
            const agentIdNum = Number(value);
            if (!isNaN(agentIdNum)) {
              cleanedAdvancedFilters[key] = agentIdNum;
            } else {
              cleanedAdvancedFilters[key] = value;
            }
          } else {
            cleanedAdvancedFilters[key] = value;
          }
        }
      });

      Object.assign(filters, cleanedAdvancedFilters);

      // Apply filter logic based on the selected filter type
      // IMPORTANT: When agent filters are present, don't apply type filters
      // Agent filters should return all transaction types for that agent
      const hasAgentFilter = cleanedAdvancedFilters.agent || cleanedAdvancedFilters.agent_id;
      
      // Only apply type filters if no agent filters are present
      if (!hasAgentFilter) {
        if (filter === 'purchases') {
          filters.type = 'purchase';
        } else if (filter === 'cashouts') {
          filters.type = 'cashout';
        } else if (filter === 'pending-purchases') {
          filters.txn = 'purchases';
        } else if (filter === 'pending-cashouts') {
          filters.txn = 'cashouts';
        } else if (filter === 'processing') {
          filters.type = 'processing';
        } else if (filter === 'history') {
          filters.type = 'history';
        }
      } else {
        // When agent filters are present, remove any type/txn filters that might conflict
        // This ensures agent filters work with all transaction types
        delete filters.type;
        delete filters.txn;
        console.log('🚫 Removed type/txn filters because agent filter is present');
      }

      // Log agent filter parameters for debugging
      if (filters.agent || filters.agent_id) {
        console.log('🔍 Agent filter applied:', {
          agent: filters.agent,
          agent_id: filters.agent_id,
          agent_id_type: typeof filters.agent_id,
          hasAgentFilter,
          fullFilters: filters,
        });
        
        // Log what will be sent to API
        const apiParams = Object.entries(filters)
          .filter(([, value]) => value !== undefined && value !== '')
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        console.log('🌐 API Request URL: /api/v1/transactions/?' + apiParams);
        console.log('📋 Filter Summary:', {
          hasAgentFilter: true,
          agent: filters.agent,
          agent_id: filters.agent_id,
          page: filters.page,
          page_size: filters.page_size,
          otherFilters: Object.keys(filters).filter(k => !['agent', 'agent_id', 'page', 'page_size'].includes(k)),
        });
      }

      console.log('📊 Fetching transactions:', {
        filter,
        filters,
        cleanedAdvancedFilters,
        originalAdvancedFilters: advancedFilters,
        hasAgentFilter,
      });

      const data = await transactionsApi.list(filters);
      
      set({ 
        transactions: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load transactions';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need appropriate privileges to view transactions.';
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

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchTransactions();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchTransactions();
  },

  setFilter: (filter: FilterType) => {
    set({ 
      filter,
      currentPage: 1,
    });
    get().fetchTransactions();
  },

  setAdvancedFilters: (filtersMap: Record<string, string>) => {
    set({
      advancedFilters: filtersMap,
      currentPage: 1,
    });
    get().fetchTransactions();
  },

  clearAdvancedFilters: () => {
    set({
      advancedFilters: {},
      currentPage: 1,
    });
    get().fetchTransactions();
  },

  updateTransactionStatus: async ({ id, status }) => {
    set({ isUpdatingTransaction: true, updatingTransactionId: id });

    try {
      await transactionsApi.updateStatus(id, { status });
      await get().fetchTransactions();
    } catch (err) {
      let errorMessage = 'Failed to update transaction';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String((err as { detail: unknown }).detail);
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({ error: errorMessage });
      throw err;
    } finally {
      set({ isUpdatingTransaction: false, updatingTransactionId: null });
    }
  },

  reset: () => {
    set(initialState);
  },
}));

