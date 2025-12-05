import { create } from 'zustand';
import { transactionsApi } from '@/lib/api';
import type { 
  TransactionQueue,
  QueueFilters,
  GameActionRequest,
  PaginatedResponse
} from '@/types';

type FilterType = 
  | 'processing' 
  | 'history' 
  | 'recharge_game' 
  | 'redeem_game' 
  | 'add_user_game'
  | 'create_game';

interface TransactionQueuesState {
  queues: TransactionQueue[] | null;
  isLoading: boolean;
  error: string | null;
  filter: FilterType;
  actionLoading: boolean;
  advancedFilters: Record<string, string>;
  count: number;
  next: string | null;
  previous: string | null;
  currentPage: number;
  pageSize: number;
  expectedUsername: string | null;
  blockUnfilteredRequests: boolean;
}

interface TransactionQueuesActions {
  fetchQueues: () => Promise<void>;
  setFilter: (filter: FilterType) => void;
  setFilterWithoutFetch: (filter: FilterType) => void;
  handleGameAction: (data: GameActionRequest) => Promise<void>;
  setAdvancedFilters: (filters: Record<string, string>) => void;
  setAdvancedFiltersWithoutFetch: (filters: Record<string, string>) => void;
  clearAdvancedFilters: () => void;
  clearAdvancedFiltersWithoutFetch: () => void;
  updateQueue: (updatedQueue: TransactionQueue) => void;
  setPage: (page: number) => Promise<void>;
  setExpectedUsername: (username: string | null) => void;
  setBlockUnfilteredRequests: (block: boolean) => void;
  reset: () => void;
}

type TransactionQueuesStore = TransactionQueuesState & TransactionQueuesActions;

const initialState: TransactionQueuesState = {
  queues: null,
  isLoading: false,
  error: null,
  filter: 'processing',
  actionLoading: false,
  advancedFilters: {},
  count: 0,
  next: null,
  previous: null,
  currentPage: 1,
  pageSize: 10,
  expectedUsername: null,
  blockUnfilteredRequests: false, // Only block when explicitly set (e.g., when username filter is being applied)
};

export const useTransactionQueuesStore = create<TransactionQueuesStore>((set, get) => ({
  ...initialState,

  fetchQueues: async () => {
    // Skip fetch if we're already loading (prevent concurrent requests)
    const currentState = get();
    if (currentState.isLoading) {
      console.log('⏭️ Skipping fetch - already loading');
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // ALWAYS get fresh state right before building filters to avoid stale data
      const freshState = get();
      const { filter, advancedFilters, currentPage, pageSize } = freshState;

      // Log to verify we're using the correct username
      console.log('📡 fetchQueues - Fresh state:', {
        filter,
        username: advancedFilters.username,
        allFilters: advancedFilters,
        currentPage,
        pageSize,
      });
      
      // Build base filters without type (filter type is handled separately per endpoint)
      const baseFilters: QueueFilters = {
        page: currentPage,
        page_size: pageSize,
      };

      const cleanedAdvancedFilters: Record<string, string> = {};
      
      // Pass all filters including game_username and type (activity type) to backend for server-side filtering
      Object.entries(advancedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          // Username and email: trim and send as-is for partial search (like transactions store)
          if (key === 'username' || key === 'email') {
            const trimmedValue = String(value).trim();
            if (trimmedValue) {
              cleanedAdvancedFilters[key] = trimmedValue;
            }
          } else {
            // Include all other filters: game_username, type (activity type), game, operator, etc.
            cleanedAdvancedFilters[key] = value;
          }
        }
      });

      // Merge base filters with advanced filters
      const filters: QueueFilters = {
        ...baseFilters,
        ...cleanedAdvancedFilters,
      };

      // Log filters for debugging (especially username)
      if (cleanedAdvancedFilters.username || cleanedAdvancedFilters.email) {
        console.log('📊 Fetching transaction queues:', {
          filter,
          filters,
          cleanedAdvancedFilters,
          originalAdvancedFilters: advancedFilters,
          username: filters.username,
          email: filters.email,
          allFilterKeys: Object.keys(filters),
        });
      }

      // Use new separate endpoints based on filter type
      let response: PaginatedResponse<TransactionQueue>;
      
      if (filter === 'history') {
        // Use transaction-queues-history endpoint
        // Filters already include activity type from advancedFilters if provided
        console.log('🌐 Final API filters for queuesHistory:', {
          filters,
          username: filters.username,
          email: filters.email,
          game_username: filters.game_username,
          type: filters.type, // Activity type (e.g., 'recharge_game', 'redeem_game')
          allKeys: Object.keys(filters),
        });
        
        response = await transactionsApi.queuesHistory(filters);
      } else if (filter === 'processing') {
        // Use transaction-queues-processing endpoint
        // Filters already include activity type from advancedFilters if provided
        response = await transactionsApi.queuesProcessing(filters);
      } else {
        // Use legacy endpoint for specific queue types (recharge_game, redeem_game, etc.)
        // Set the filter type as the activity type
        const legacyFilters = {
          ...filters,
          type: filter, // This is the activity type (recharge_game, redeem_game, etc.)
        };
        response = await transactionsApi.queues(legacyFilters);
      }
      
      // Normalize API response to match the structure we expect (same as WebSocket transformation)
      const normalizedQueues: TransactionQueue[] = response.results.map((queue: TransactionQueue) => {
        // If data has nested fields, promote them to top level for consistency
        if (queue.data && typeof queue.data === 'object') {
          const data = queue.data as any;
          
          // Ensure amount is always a string
          let normalizedAmount = queue.amount;
          if (!normalizedAmount) {
            if (data.amount != null) {
              normalizedAmount = String(data.amount);
            } else if (data.get_total_amount != null) {
              normalizedAmount = String(data.get_total_amount);
            } else {
              normalizedAmount = '0';
            }
          }
          
          return {
            ...queue,
            game: queue.game || data.game_title || data.game || '',
            game_username: queue.game_username || data.get_usergame_username || data.username || data.game_username,
            amount: normalizedAmount,
            // Explicitly preserve company fields from API response
            company_id: queue.company_id,
            company_username: queue.company_username,
          };
        }
        // Even when there's no data object, ensure company fields are preserved
        return {
          ...queue,
          company_id: queue.company_id,
          company_username: queue.company_username,
        };
      });
      
      // All filtering is now handled by the backend (including game_username and type)
      // No client-side filtering needed
      const filteredQueues = normalizedQueues;
      
      // Filter out completed activities when in processing view
      const finalFilteredQueues = filter === 'processing' 
        ? filteredQueues.filter(queue => {
            const isCompleted = queue.status === 'completed';
            if (isCompleted) {
              console.log('⏭️ Filtering out completed activity from fetch:', queue.id, queue.status);
            }
            return !isCompleted;
          })
        : filteredQueues;

      set({ 
        queues: finalFilteredQueues, 
        isLoading: false,
        error: null,
        count: response.count, // Use backend count (handles pagination correctly)
        next: response.next ?? null,
        previous: response.previous ?? null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load transaction queues';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need appropriate privileges to view transaction queues.';
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

  setFilter: (filter: FilterType) => {
    set({ filter, currentPage: 1 });
    get().fetchQueues();
  },

  setFilterWithoutFetch: (filter: FilterType) => {
    set({ filter, currentPage: 1 });
    // Note: Does not call fetchQueues() - let component handle it
  },

  setAdvancedFilters: (filtersMap: Record<string, string>) => {
    set({
      advancedFilters: filtersMap,
      currentPage: 1,
    });
    get().fetchQueues();
  },

  setAdvancedFiltersWithoutFetch: (filtersMap: Record<string, string>) => {
    set({
      advancedFilters: filtersMap,
      currentPage: 1,
    });
    // Note: Does not call fetchQueues() - let component handle it
  },

  clearAdvancedFilters: () => {
    set({
      advancedFilters: {},
      currentPage: 1,
    });
    get().fetchQueues();
  },

  clearAdvancedFiltersWithoutFetch: () => {
    set({
      advancedFilters: {},
      currentPage: 1,
    });
    // Note: Does not call fetchQueues() - let component handle it
  },

  handleGameAction: async (data: GameActionRequest) => {
    set({ actionLoading: true, error: null });

    try {
      console.log('Handling game action:', data);

      await transactionsApi.handleGameAction(data);
      
      set({ actionLoading: false });
      
      await get().fetchQueues();
    } catch (err: unknown) {
      let errorMessage = 'Failed to process game action';
      
      if (err && typeof err === 'object') {
        // Try to extract error message from various possible fields
        if ('detail' in err) {
          errorMessage = String(err.detail);
        } else if ('message' in err) {
          errorMessage = String(err.message);
        } else if ('error' in err) {
          errorMessage = String(err.error);
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      console.error('Game action error:', err);
      
      set({ 
        error: errorMessage,
        actionLoading: false,
      });
      
      throw new Error(errorMessage);
    }
  },

  /**
   * Update a single queue item (real-time WebSocket updates)
   * 
   * This method efficiently updates or adds a single queue without
   * refetching all data from the server. Used by WebSocket to merge
   * real-time updates.
   * 
   * @param updatedQueue - The queue item to update or add
   */
  updateQueue: (updatedQueue: TransactionQueue) => {
    const state = get();
    const { queues, filter } = state;
    
    // Don't update queues when viewing history - history should only be updated via API calls
    if (filter === 'history') {
      console.log('⏭️ Store: Skipping queue update - history view does not receive real-time updates');
      return;
    }
    
    if (!queues || !Array.isArray(queues)) {
      console.log('No queues to update, fetching fresh data...');
      get().fetchQueues();
      return;
    }

    const status = updatedQueue.status?.toLowerCase();
    const isCompleted = status === 'completed' || status === 'complete';
    
    // Check if we're viewing processing queues
    const isProcessingView = filter === 'processing';
    
    console.log('🔍 Store updateQueue - ID:', updatedQueue.id, 'Status:', updatedQueue.status, 'IsCompleted:', isCompleted, 'Filter:', filter, 'IsProcessingView:', isProcessingView);

    // Find the index of the queue to check if it already exists
    const queueIndex = queues.findIndex((q) => q.id === updatedQueue.id);
    
    if (queueIndex >= 0) {
      // Item EXISTS in the list
      if (isProcessingView && isCompleted) {
        // Remove completed items from processing view
        const updatedQueues = queues.filter((q) => q.id !== updatedQueue.id);
        set({ 
          queues: updatedQueues,
          count: Math.max(0, (state.count || 0) - 1),
        });
        console.log('✅ Removed completed activity from processing view:', updatedQueue.id);
        return;
      }
      
      // Update existing queue (for status changes like pending -> processing)
      // Merge WebSocket update with existing queue to preserve user data from API
      const existingQueue = queues[queueIndex];
      const mergedQueue: TransactionQueue = {
        ...existingQueue,
        ...updatedQueue,
        // Preserve user data from API if WebSocket update doesn't have it
        user_username: updatedQueue.user_username || existingQueue.user_username,
        user_email: updatedQueue.user_email || existingQueue.user_email,
        // Preserve other optional fields
        game_username: updatedQueue.game_username || existingQueue.game_username,
        operator: updatedQueue.operator || existingQueue.operator,
        bonus_amount: updatedQueue.bonus_amount || existingQueue.bonus_amount,
        new_game_balance: updatedQueue.new_game_balance || existingQueue.new_game_balance,
        remarks: updatedQueue.remarks || existingQueue.remarks,
        data: updatedQueue.data || existingQueue.data,
      };
      
      const updatedQueues = [...queues];
      updatedQueues[queueIndex] = mergedQueue;
      set({ 
        queues: updatedQueues,
        // Preserve other state properties
        count: state.count,
        next: state.next,
        previous: state.previous,
      });
      console.log('✅ Queue updated:', mergedQueue.id, 'Status:', mergedQueue.status);
    } else {
      // Item is NEW - don't add if it's already completed and we're viewing processing
      if (isProcessingView && isCompleted) {
        console.log('⏭️ Store: Not adding new completed activity to processing view:', updatedQueue.id);
        return;
      }
      
      // Add new queue to the beginning of the list (same as purchases)
      const updatedQueues = [updatedQueue, ...queues];
      set({ 
        queues: updatedQueues,
        count: (state.count || 0) + 1,
        // Preserve other state properties
        next: state.next,
        previous: state.previous,
      });
      console.log('✅ New queue added:', updatedQueue.id, 'Status:', updatedQueue.status, 'Total count:', (state.count || 0) + 1);
    }
  },

  setPage: async (page: number) => {
    const nextPage = Math.max(1, page);
    set({ currentPage: nextPage });
    await get().fetchQueues();
  },

  setExpectedUsername: (username: string | null) => {
    console.log('🎯 Setting expected username:', username);
    set({ expectedUsername: username });
  },

  setBlockUnfilteredRequests: (block: boolean) => {
    console.log('🚫 Setting blockUnfilteredRequests:', block);
    set({ blockUnfilteredRequests: block });
  },

  reset: () => {
    set(initialState);
  },
}));

