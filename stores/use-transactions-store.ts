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
  setAdvancedFiltersWithoutFetch: (filters: Record<string, string>) => void;
  clearAdvancedFilters: () => void;
  updateTransactionStatus: (options: { id: string; status: 'completed' | 'cancelled' }) => Promise<void>;
  updateTransaction: (transaction: Transaction) => void;
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
      const hasAgentFilter = cleanedAdvancedFilters.agent || cleanedAdvancedFilters.agent_id;
      
      // Preserve txn from advancedFilters if it was explicitly set by user
      // This allows transaction type filtering to work even when agent filters are present
      const txnFromAdvancedFilters = cleanedAdvancedFilters.txn;
      
      // Only apply type filters from main filter dropdown if no agent filters are present
      // But allow txn from advancedFilters to work with agent filters
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
        // When agent filters are present, remove type filter from main dropdown
        // But preserve txn from advancedFilters if user explicitly set it
        delete filters.type;
        
        // Keep txn from advancedFilters if it was explicitly set by user
        // Otherwise, remove it to allow all transaction types for the agent
        if (!txnFromAdvancedFilters) {
          delete filters.txn;
        }
        // If txnFromAdvancedFilters exists, it's already in filters from Object.assign above
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
        dateFilters: {
          date_from: filters.date_from,
          date_to: filters.date_to,
        },
      });

      const response = await transactionsApi.list(filters);
      
      // Normalize API response to ensure user data is at top level (similar to game activities)
      const normalizedTransactions: Transaction[] = response.results.map((transaction: Transaction) => {
        // If transaction has nested data, check for user info there
        if (transaction && typeof transaction === 'object') {
          // Check if user data might be in a nested user object
          const anyTxn = transaction as any;
          if (anyTxn.user && typeof anyTxn.user === 'object') {
            return {
              ...transaction,
              user_username: transaction.user_username || anyTxn.user.username || anyTxn.user.user_username || '',
              user_email: transaction.user_email || anyTxn.user.email || anyTxn.user.user_email || '',
            };
          }
        }
        return transaction;
      });
      
      set({ 
        transactions: {
          ...response,
          results: normalizedTransactions,
        }, 
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

  setAdvancedFiltersWithoutFetch: (filtersMap: Record<string, string>) => {
    set({
      advancedFilters: filtersMap,
      currentPage: 1,
    });
    // Note: Does not call fetchTransactions() - let component handle it
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

  /**
   * Update a single transaction (real-time WebSocket updates)
   * 
   * This method efficiently updates or adds a single transaction without
   * refetching all data from the server. Used by WebSocket to merge
   * real-time updates. Follows the same pattern as game activities updateQueue.
   * 
   * @param updatedTransaction - The transaction to update or add
   */
  updateTransaction: (updatedTransaction: Transaction) => {
    const { transactions, filter } = get();
    
    if (!transactions?.results || !Array.isArray(transactions.results)) {
      console.log('No transactions to update, fetching fresh data...');
      get().fetchTransactions();
      return;
    }

    const status = updatedTransaction.status?.toLowerCase();
    const isCompleted = status === 'completed' || status === 'complete' || status === 'cancelled' || status === 'failed';
    
    // Check if we're viewing pending transactions
    const isPendingView = filter === 'pending-purchases' || filter === 'pending-cashouts';
    
    console.log('🔍 Store updateTransaction - ID:', updatedTransaction.id, 'Status:', updatedTransaction.status, 'IsCompleted:', isCompleted, 'Filter:', filter, 'IsPendingView:', isPendingView);

    // Find the index of the transaction to check if it already exists
    const transactionIndex = transactions.results.findIndex((t) => t.id === updatedTransaction.id);
    
    if (transactionIndex >= 0) {
      // Item EXISTS in the list
      if (isPendingView && isCompleted) {
        // Remove completed items from pending view
        const updatedResults = transactions.results.filter((t) => t.id !== updatedTransaction.id);
        set({ 
          transactions: {
            ...transactions,
            results: updatedResults,
            count: Math.max(0, (transactions.count || 0) - 1),
          }
        });
        console.log('✅ Removed completed transaction from pending view:', updatedTransaction.id);
        return;
      }
      
      // Update existing transaction (for status changes like pending -> processing)
      // Merge WebSocket update with existing transaction to preserve user data from API
      const existingTransaction = transactions.results[transactionIndex];
      const mergedTransaction: Transaction = {
        ...existingTransaction,
        ...updatedTransaction,
        // Preserve user data from API if WebSocket update doesn't have it
        user_username: updatedTransaction.user_username || existingTransaction.user_username || '',
        user_email: updatedTransaction.user_email || existingTransaction.user_email || '',
      };
      
      const updatedResults = [...transactions.results];
      updatedResults[transactionIndex] = mergedTransaction;
      set({ 
        transactions: {
          ...transactions,
          results: updatedResults,
        }
      });
      console.log('✅ Transaction updated:', mergedTransaction.id, 'Status:', mergedTransaction.status);
    } else {
      // Item is NEW - don't add if it's already completed and we're viewing pending
      if (isPendingView && isCompleted) {
        console.log('⏭️ Store: Not adding new completed transaction to pending view:', updatedTransaction.id);
        return;
      }
      
      // Add new transaction to the beginning of the list
      const updatedResults = [updatedTransaction, ...transactions.results];
      set({ 
        transactions: {
          ...transactions,
          results: updatedResults,
          count: (transactions.count || 0) + 1,
        }
      });
      console.log('✅ New transaction added:', updatedTransaction.id, 'Status:', updatedTransaction.status);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

