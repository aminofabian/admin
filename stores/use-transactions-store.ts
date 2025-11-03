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

      const cleanedAdvancedFilters = Object.fromEntries(
        Object.entries(advancedFilters).filter(([, value]) => value !== undefined && value !== '')
      );

      Object.assign(filters, cleanedAdvancedFilters);

      // Apply filter logic based on the selected filter type
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

      console.log('Fetching transactions with filters:', { filter, filters });

      const data = await transactionsApi.list(filters);
      
      console.log('📊 Store received normalized data:', {
        count: data.count,
        resultsLength: data.results?.length ?? 0,
        hasResults: !!data.results,
        isArray: Array.isArray(data.results),
        firstItem: data.results?.[0],
      });
      
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

