import { create } from 'zustand';
import {
  CASHAPP_PAY_PROVIDER_FILTER_VALUE,
  normalizePaymentMethodFilterQueryValue,
} from '@/lib/utils/transaction-provider-filter-options';
import { transactionsApi } from '@/lib/api';
import { shouldPreserveLedgerBalancesWhenMerging } from '@/lib/utils/transaction-ledger-ws';
import { mergeTransactionTextSnapshot } from '@/lib/utils/transaction-ws-merge';
import { getTransactionKind } from '@/lib/utils/transaction-display';
import type { 
  Transaction,
  TransactionFilters,
  PaginatedResponse 
} from '@/types';

function transactionHistorySortKey(tx: Transaction): number {
  const raw = tx.created_at || tx.created || '';
  const n = new Date(raw).getTime();
  return Number.isFinite(n) ? n : 0;
}

/** Max rows to pull per txn_type when merging card + all types (avoid tiny caps that break deep pages). */
const CARD_MERGE_MAX_DEPTH = 2500;

/**
 * Floor per-type fetch size so page-1 merged length isn't tiny vs inflated summed API counts
 * (otherwise UI shows "Page 1 of 6" while only ~1–2 pages of rows exist).
 */
const CARD_MERGE_MIN_DEPTH = 200;

/** When a fetch runs while another is in flight, rerun once afterward with latest filters. */
let deferTransactionsFetch = false;

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
  setFilterWithoutFetch: (filter: FilterType) => void;
  setAdvancedFilters: (filters: Record<string, string>) => void;
  setAdvancedFiltersWithoutFetch: (filters: Record<string, string>) => void;
  clearAdvancedFilters: () => void;
  clearAdvancedFiltersWithoutFetch: () => void;
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
    // Skip concurrent requests — schedule one follow-up with the newest filter/page state.
    const currentState = get();
    if (currentState.isLoading) {
      deferTransactionsFetch = true;
      console.log('⏭️ Skipping transactions fetch - already loading (scheduled refetch)');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // ALWAYS get fresh state right before building filters to avoid stale data
      const freshState = get();
      const { currentPage, pageSize, searchTerm, filter, advancedFilters } = freshState;

      // Log to verify we're using the correct username
      console.log('📡 fetchTransactions - Fresh state:', {
        filter,
        username: advancedFilters.username,
        allFilters: advancedFilters,
        currentPage,
        pageSize,
      });
      
      const filters: TransactionFilters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      // Clean and process advanced filters
      const cleanedAdvancedFilters: Record<string, string | number> = {};
      let cashappPayProviderLocksPaymentMethod = false;

      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          // Convert agent_id to number if it's a valid number
          // company_username is passed as a string, company_id is converted to number for backwards compatibility
          if (key === 'agent_id') {
            const idNum = Number(value);
            if (!isNaN(idNum)) {
              cleanedAdvancedFilters[key] = idNum;
            } else {
              cleanedAdvancedFilters[key] = value;
            }
          } else if (key === 'company_id') {
            // Backwards compatibility: convert company_id to number if it exists
            const idNum = Number(value);
            if (!isNaN(idNum)) {
              cleanedAdvancedFilters[key] = idNum;
            } else {
              cleanedAdvancedFilters[key] = value;
            }
          } else if (key === 'company_username') {
            // company_username is passed as a string
            const trimmedValue = String(value).trim();
            if (trimmedValue) {
              cleanedAdvancedFilters[key] = trimmedValue;
            }
          } else if (key === 'username' || key === 'email') {
            // Username and email: trim and send as-is for partial search (like player section)
            // Backend should handle partial matching when these parameters are provided
            const trimmedValue = String(value).trim();
            if (trimmedValue) {
              cleanedAdvancedFilters[key] = trimmedValue;
            }
          } else if (key === 'provider') {
            const trimmed = String(value).trim();
            if (trimmed === CASHAPP_PAY_PROVIDER_FILTER_VALUE) {
              cleanedAdvancedFilters.provider = 'bitcoin_lightning';
              const normalizedPm = normalizePaymentMethodFilterQueryValue('cashapp');
              if (normalizedPm) {
                cleanedAdvancedFilters.payment_method = normalizedPm;
              }
              cashappPayProviderLocksPaymentMethod = true;
            } else if (trimmed) {
              cleanedAdvancedFilters[key] = trimmed;
            }
          } else if (key === 'payment_method') {
            if (cashappPayProviderLocksPaymentMethod) {
              return;
            }
            const trimmed = String(value).trim();
            if (trimmed) {
              const normalized = normalizePaymentMethodFilterQueryValue(trimmed);
              if (normalized) {
                cleanedAdvancedFilters[key] = normalized;
              }
            }
          } else {
            cleanedAdvancedFilters[key] = value;
          }
        }
      });

      Object.assign(filters, cleanedAdvancedFilters);

      // Apply filter logic based on the selected filter type
      const hasAgentFilter = cleanedAdvancedFilters.agent || cleanedAdvancedFilters.agent_id;
      
      // For history filter, always exclude pending status
      const isHistoryFilter = filter === 'history';
      
      // Preserve txn from advancedFilters if it was explicitly set by user
      // This allows transaction type filtering to work even when agent filters are present
      const txnFromAdvancedFilters = cleanedAdvancedFilters.txn;
      
      // When agent filters are present, ensure we only send one agent parameter
      // Prefer agent_id over agent username for better backend compatibility
      if (hasAgentFilter) {
        if (cleanedAdvancedFilters.agent_id) {
          // If agent_id is present, use it and remove agent username
          delete filters.agent;
        } else if (cleanedAdvancedFilters.agent) {
          // If only agent username is present, keep it (agent_id will be resolved by component)
          // But ensure we don't send both
        }
      }
      
      // Apply type filters from main filter dropdown
      // For history filter, respect advanced filter type if set, otherwise use 'history'
      // NOTE: API uses txn_type for purchase/cashout, and type for processing/history
      const hasAdvancedTypeFilter =
        cleanedAdvancedFilters.type === 'purchase' ||
        cleanedAdvancedFilters.type === 'cashout' ||
        cleanedAdvancedFilters.type === 'add' ||
        cleanedAdvancedFilters.type === 'deduct';
      
      console.log('🔍 Type filter processing:', {
        filter,
        hasAdvancedTypeFilter,
        cleanedAdvancedFiltersType: cleanedAdvancedFilters.type,
        filtersTypeBefore: filters.type,
        filtersTxnTypeBefore: filters.txn_type,
      });
      
      if (filter === 'purchases') {
        // Main filter explicitly sets purchases - use txn_type parameter
        filters.txn_type = 'purchase';
        delete filters.type; // Remove type if it was set
      } else if (filter === 'cashouts') {
        // Main filter explicitly sets cashouts - use txn_type parameter
        filters.txn_type = 'cashout';
        delete filters.type; // Remove type if it was set
      } else if (filter === 'pending-purchases') {
        filters.txn_type = 'purchase';
        filters.txn = 'purchases';
        delete filters.type;
      } else if (filter === 'pending-cashouts') {
        filters.txn_type = 'cashout';
        filters.txn = 'cashouts';
        delete filters.type;
      } else if (filter === 'processing') {
        filters.type = 'processing';
        delete filters.txn_type; // Remove txn_type if it was set
      } else if (filter === 'history') {
        // If user selected a type filter (purchase/cashout), use txn_type
        // Otherwise, use 'history' to exclude pending transactions
        if (!hasAdvancedTypeFilter) {
          filters.type = 'history';
          delete filters.txn_type;
        } else {
          filters.txn_type = cleanedAdvancedFilters.type as 'purchase' | 'cashout' | 'add' | 'deduct';
          delete filters.type; // Don't use type when txn_type is set
        }
      } else if (filter === 'all') {
        // For 'all' filter, respect advanced type filter if set
        // If no advanced type filter, don't set type (show all types)
        if (!hasAdvancedTypeFilter) {
          // Don't set type - let it be undefined to show all types
          delete filters.type;
          delete filters.txn_type;
        } else {
          filters.txn_type = cleanedAdvancedFilters.type as 'purchase' | 'cashout' | 'add' | 'deduct';
          delete filters.type;
        }
      }
      // For any other filter values, preserve the advanced type filter if set
      
      console.log('🔍 Type filter after processing:', {
        filter,
        filtersTypeAfter: filters.type,
        filtersTxnTypeAfter: filters.txn_type,
        hasAdvancedTypeFilter,
      });
      
      // When agent filters are present, preserve txn from advancedFilters if user explicitly set it
      // Otherwise, remove it to allow all transaction types for the agent
      if (hasAgentFilter && !txnFromAdvancedFilters) {
        delete filters.txn;
      }

      // Exclude pending status from history filter
      // When filter is 'history', the backend should exclude pending automatically
      // But we'll also ensure status filter doesn't include pending
      if (isHistoryFilter) {
        // If status is explicitly set to pending, remove it (history shouldn't show pending)
        if (cleanedAdvancedFilters.status === 'pending') {
          delete filters.status;
        }
        // Backend should handle excluding pending when type is 'history'
        // If backend doesn't support this, we may need to filter client-side
      }

      // Fix transaction type filter to exclude pending when in history
      // When txn_type is purchase or cashout in history, ensure pending is excluded
      // According to API docs: type=history excludes pending, but txn_type=cashout includes all cashouts
      // So when using txn_type=cashout in history view, we need to exclude pending
      if (
        isHistoryFilter &&
        (cleanedAdvancedFilters.type === 'purchase' ||
          cleanedAdvancedFilters.type === 'cashout' ||
          cleanedAdvancedFilters.type === 'add' ||
          cleanedAdvancedFilters.type === 'deduct')
      ) {
        console.log('🔍 History view with type filter - ensuring txn_type is preserved:', {
          cleanedAdvancedFiltersType: cleanedAdvancedFilters.type,
          filtersTxnTypeBefore: filters.txn_type,
          isHistoryFilter,
        });
        
        // CRITICAL: Ensure txn_type is set correctly (it might have been lost)
        filters.txn_type = cleanedAdvancedFilters.type as 'purchase' | 'cashout' | 'add' | 'deduct';
        delete filters.type; // Don't use type when txn_type is set
        
        // If status is pending, remove it (history shouldn't show pending)
        if (cleanedAdvancedFilters.status === 'pending') {
          delete filters.status;
        }
        // When no status filter is set, we need to exclude pending
        // Try Django REST framework style: status__ne=pending
        // If API doesn't support this, backend should handle it or we filter client-side
        if (!filters.status) {
          // Exclude pending transactions - try status__ne (Django style)
          // Note: If API doesn't support this, transactions will be filtered client-side
          filters.status__ne = 'pending';
        }
        
        console.log('🔍 History view with type filter - after processing:', {
          filtersTxnTypeAfter: filters.txn_type,
          hasStatusNe: 'status__ne' in filters,
          status: filters.status,
        });
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
          .filter(([_key, value]) => value !== undefined && value !== '')
          .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
          .join('&');
        console.log('🌐 API Request URL: /api/v1/transactions/?' + apiParams);
        const excludedKeys = ['agent', 'agent_id', 'page', 'page_size'];
        const otherFilterKeys = Object.keys(filters).filter((key) => !excludedKeys.includes(key));
        console.log('📋 Filter Summary:', {
          hasAgentFilter: true,
          agent: filters.agent,
          agent_id: filters.agent_id,
          page: filters.page,
          page_size: filters.page_size,
          otherFilters: otherFilterKeys,
        });
      }

      // Log username/email specifically for debugging partial search
      if (filters.username || filters.email) {
        const usernameStr = typeof filters.username === 'string' ? filters.username : String(filters.username || '');
        const emailStr = typeof filters.email === 'string' ? filters.email : String(filters.email || '');
        console.log('🔍 Username/Email filters being sent:', {
          username: filters.username,
          email: filters.email,
          usernameType: typeof filters.username,
          emailType: typeof filters.email,
          usernameLength: usernameStr.length,
          emailLength: emailStr.length,
        });
      }

      console.log('📊 Fetching transactions:', {
        filter,
        filters,
        cleanedAdvancedFilters,
        originalAdvancedFilters: advancedFilters,
        hasAgentFilter,
        hasAdvancedTypeFilter,
        type: filters.type,
        username: filters.username,
        email: filters.email,
        dateFilters: {
          date_from: filters.date_from,
          date_to: filters.date_to,
        },
        allFilterKeys: Object.keys(filters),
      });

      // Pass username and email as query params to backend for server-side filtering
      const apiFilters = { ...filters };

      // FINAL CHECK: Ensure txn_type filter is preserved if it was set in advanced filters
      // This is a safety check in case the txn_type got lost during processing
      if (
        isHistoryFilter &&
        (cleanedAdvancedFilters.type === 'purchase' ||
          cleanedAdvancedFilters.type === 'cashout' ||
          cleanedAdvancedFilters.type === 'add' ||
          cleanedAdvancedFilters.type === 'deduct')
      ) {
        if (
          !apiFilters.txn_type ||
          (apiFilters.txn_type !== 'purchase' &&
            apiFilters.txn_type !== 'cashout' &&
            apiFilters.txn_type !== 'add' &&
            apiFilters.txn_type !== 'deduct')
        ) {
          console.warn('⚠️ txn_type filter was lost! Restoring from cleanedAdvancedFilters:', {
            originalType: cleanedAdvancedFilters.type,
            currentApiFiltersTxnType: apiFilters.txn_type,
          });
          apiFilters.txn_type = cleanedAdvancedFilters.type as 'purchase' | 'cashout' | 'add' | 'deduct';
          delete apiFilters.type; // Ensure type is not set when txn_type is used
        }
      }

      console.log('🌐 Final API filters being sent:', {
        apiFilters,
        type: apiFilters.type,
        txn_type: apiFilters.txn_type,
        hasType: 'type' in apiFilters,
        hasTxnType: 'txn_type' in apiFilters,
        status__ne: apiFilters.status__ne,
        company_id: apiFilters.company_id,
        company_id_type: typeof apiFilters.company_id,
        company_username: apiFilters.company_username,
        company_username_type: typeof apiFilters.company_username,
        allKeys: Object.keys(apiFilters),
        filterKeysWithValues: Object.entries(apiFilters)
          .filter(([_key, value]) => value !== undefined && value !== '')
          .map(([key, value]) => `${key}=${value}`)
          .join('&'),
      });

      // Use new separate endpoints based on filter type
      let response: PaginatedResponse<Transaction>;
      
      if (filter === 'history') {
        const historyFilters = { ...apiFilters };
        delete historyFilters.type;
        delete historyFilters.txn;
        delete historyFilters.status__ne;

        const normalizedPaymentMethod = normalizePaymentMethodFilterQueryValue(
          String(cleanedAdvancedFilters.payment_method ?? ''),
        );
        const cardAllTxnTypes =
          normalizedPaymentMethod === 'card' && !hasAdvancedTypeFilter;

        if (cardAllTxnTypes) {
          const { page: historyPage, page_size: historyPageSize, txn_type: _omitTxn, ...historyRest } =
            historyFilters;
          const page = typeof historyPage === 'number' ? historyPage : Number(historyPage) || 1;
          const pageSize =
            typeof historyPageSize === 'number' ? historyPageSize : Number(historyPageSize) || 25;
          const depth = Math.min(
            Math.max(Math.max(1, page) * pageSize, CARD_MERGE_MIN_DEPTH),
            CARD_MERGE_MAX_DEPTH,
          );

          const txnTypes = ['purchase', 'cashout', 'add', 'deduct'] as const;
          const partials = await Promise.all(
            txnTypes.map((txn_type) =>
              transactionsApi.listHistory({
                ...historyRest,
                txn_type,
                page: 1,
                page_size: depth,
              }),
            ),
          );

          const merged = partials.flatMap((p) => p.results);
          merged.sort((a, b) => transactionHistorySortKey(b) - transactionHistorySortKey(a));

          const seenIds = new Set<string>();
          const deduped: Transaction[] = [];
          for (const tx of merged) {
            if (seenIds.has(tx.id)) continue;
            seenIds.add(tx.id);
            deduped.push(tx);
          }

          const start = (page - 1) * pageSize;
          const pageRows = deduped.slice(start, start + pageSize);
          const totalApprox = partials.reduce((sum, p) => sum + (p.count ?? 0), 0);
          const mergedLen = deduped.length;

          let displayCount = totalApprox;
          if (mergedLen < totalApprox) {
            displayCount = mergedLen;
          }
          if (page > 1 && pageRows.length === 0) {
            displayCount = mergedLen;
          }

          response = {
            count: displayCount,
            next: null,
            previous: null,
            results: pageRows,
          };
        } else {
          response = await transactionsApi.listHistory(historyFilters);
        }
      } else if (filter === 'purchases' || filter === 'pending-purchases') {
        // Use transaction-purchases endpoint - remove type/txn/txn_type since endpoint handles it
        const purchaseFilters = { ...apiFilters };
        delete purchaseFilters.type;
        delete purchaseFilters.txn;
        delete purchaseFilters.txn_type;
        response = await transactionsApi.listPurchases(purchaseFilters);
      } else if (filter === 'cashouts' || filter === 'pending-cashouts') {
        // Use transaction-cashouts endpoint - remove type/txn/txn_type since endpoint handles it
        const cashoutFilters = { ...apiFilters };
        delete cashoutFilters.type;
        delete cashoutFilters.txn;
        delete cashoutFilters.txn_type;
        response = await transactionsApi.listCashouts(cashoutFilters);
      } else {
        // Use legacy endpoint for other filters (all, processing, etc.)
        response = await transactionsApi.list(apiFilters);
      }
      
      // Normalize API response to ensure user data is at top level (similar to game activities)
      let normalizedTransactions: Transaction[] = response.results.map((transaction: Transaction) => {
        const kind = getTransactionKind(transaction);
        const withKind =
          kind !== ''
            ? { ...transaction, type: kind as Transaction['type'] }
            : { ...transaction };

        // If transaction has nested data, check for user info there
        if (withKind && typeof withKind === 'object') {
          // Check if user data might be in a nested user object
          const anyTxn = withKind as Transaction & { user?: Record<string, unknown> };
          if (anyTxn.user && typeof anyTxn.user === 'object') {
            return {
              ...withKind,
              user_username:
                withKind.user_username ||
                (anyTxn.user.username as string) ||
                (anyTxn.user.user_username as string) ||
                '',
              user_email:
                withKind.user_email ||
                (anyTxn.user.email as string) ||
                (anyTxn.user.user_email as string) ||
                '',
              // Explicitly preserve company fields from API response
              company_id: withKind.company_id,
              company_username: withKind.company_username,
            };
          }
        }
        // Ensure company fields are preserved even when there's no nested user object
        return {
          ...withKind,
          company_id: withKind.company_id,
          company_username: withKind.company_username,
        };
      });

      set({
        transactions: {
          ...response,
          results: normalizedTransactions,
          count: response.count ?? normalizedTransactions.length,
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

    const shouldRefetchAfter = deferTransactionsFetch;
    deferTransactionsFetch = false;
    if (shouldRefetchAfter) {
      void get().fetchTransactions();
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

  setFilterWithoutFetch: (filter: FilterType) => {
    set({
      filter,
      currentPage: 1,
    });
    // Note: Does not call fetchTransactions() - let component handle it
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

  clearAdvancedFiltersWithoutFetch: () => {
    set({
      advancedFilters: {},
      currentPage: 1,
    });
    // Note: Does not call fetchTransactions() - let component handle it
  },

  updateTransactionStatus: async ({ id, status }: { id: string; status: 'completed' | 'cancelled' }) => {
    set({ isUpdatingTransaction: true, updatingTransactionId: id });

    try {
      await transactionsApi.updateStatus(id, { status });
      await get().fetchTransactions();
    } catch (err: unknown) {
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
    
    // Don't update transactions when viewing history - history should only be updated via API calls
    if (filter === 'history') {
      console.log('⏭️ Store: Skipping transaction update - history view does not receive real-time updates');
      return;
    }
    
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
    const transactionIndex = transactions.results.findIndex((t: Transaction) => t.id === updatedTransaction.id);
    
    if (transactionIndex >= 0) {
      // Item EXISTS in the list
      if (isPendingView && isCompleted) {
        // Remove completed items from pending view
        const updatedResults = transactions.results.filter((t: Transaction) => t.id !== updatedTransaction.id);
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
      // Merge WebSocket update with existing transaction. WebSocket is prioritized for provider and payment_details.
      // API data is only used on page load/reload; once WebSocket sends data, it takes precedence.
      const existingTransaction = transactions.results[transactionIndex];
      const hasWsProvider = updatedTransaction.provider != null && String(updatedTransaction.provider).trim() !== '';
      const hasWsPaymentDetails = updatedTransaction.payment_details != null
        && typeof updatedTransaction.payment_details === 'object'
        && Object.keys(updatedTransaction.payment_details).length > 0;
      const hasWsPaymentMethod = updatedTransaction.payment_method != null
        && String(updatedTransaction.payment_method).trim() !== '';
      const hasWsProviderStatus = (key: 'binpay_status' | 'tierlock_status' | 'taparcadia_status') => {
        const v = updatedTransaction[key];
        return v != null && String(v).trim() !== '';
      };
      const mergedDescription = mergeTransactionTextSnapshot(
        existingTransaction.description,
        updatedTransaction.description,
      );
      const mergedRemarksRaw = mergeTransactionTextSnapshot(
        existingTransaction.remarks,
        updatedTransaction.remarks,
      );
      const mergedTransaction: Transaction = {
        ...existingTransaction,
        ...updatedTransaction,
        user_username: updatedTransaction.user_username || existingTransaction.user_username || '',
        user_email: updatedTransaction.user_email || existingTransaction.user_email || '',
        description: mergedDescription,
        remarks: mergedRemarksRaw === '' ? null : mergedRemarksRaw,
        provider: hasWsProvider ? updatedTransaction.provider : existingTransaction.provider,
        payment_details: hasWsPaymentDetails ? updatedTransaction.payment_details : existingTransaction.payment_details,
        payment_method: hasWsPaymentMethod ? updatedTransaction.payment_method : existingTransaction.payment_method,
        binpay_status: hasWsProviderStatus('binpay_status') ? updatedTransaction.binpay_status : existingTransaction.binpay_status,
        tierlock_status: hasWsProviderStatus('tierlock_status') ? updatedTransaction.tierlock_status : existingTransaction.tierlock_status,
        taparcadia_status: hasWsProviderStatus('taparcadia_status') ? updatedTransaction.taparcadia_status : existingTransaction.taparcadia_status,
      };

      if (
        shouldPreserveLedgerBalancesWhenMerging(existingTransaction, updatedTransaction)
      ) {
        mergedTransaction.previous_balance = existingTransaction.previous_balance;
        mergedTransaction.new_balance = existingTransaction.new_balance;
      }
      
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

