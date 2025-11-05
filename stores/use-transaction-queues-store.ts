import { create } from 'zustand';
import { transactionsApi } from '@/lib/api';
import type { 
  TransactionQueue,
  QueueFilters,
  GameActionRequest
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
}

interface TransactionQueuesActions {
  fetchQueues: () => Promise<void>;
  setFilter: (filter: FilterType) => void;
  handleGameAction: (data: GameActionRequest) => Promise<void>;
  setAdvancedFilters: (filters: Record<string, string>) => void;
  clearAdvancedFilters: () => void;
  updateQueue: (updatedQueue: TransactionQueue) => void;
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
};

export const useTransactionQueuesStore = create<TransactionQueuesStore>((set, get) => ({
  ...initialState,

  fetchQueues: async () => {
    set({ isLoading: true, error: null });

    try {
      const { filter, advancedFilters } = get();
      
      const filters: QueueFilters = {
        type: filter,
      };

      const cleanedAdvancedFilters = Object.fromEntries(
        Object.entries(advancedFilters).filter(([, value]) => value !== undefined && value !== '')
      );

      Object.assign(filters, cleanedAdvancedFilters);

      const response = await transactionsApi.queues(filters);
      
      set({ 
        queues: response.results, 
        isLoading: false,
        error: null,
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
    set({ filter });
    get().fetchQueues();
  },

  setAdvancedFilters: (filtersMap: Record<string, string>) => {
    set({ advancedFilters: filtersMap });
    get().fetchQueues();
  },

  clearAdvancedFilters: () => {
    set({ advancedFilters: {} });
    get().fetchQueues();
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
    const { queues } = get();
    
    if (!queues || !Array.isArray(queues)) {
      console.log('No queues to update, fetching fresh data...');
      get().fetchQueues();
      return;
    }

    // Find the index of the queue to update
    const queueIndex = queues.findIndex((q) => q.id === updatedQueue.id);
    
    if (queueIndex >= 0) {
      // Update existing queue
      const updatedQueues = [...queues];
      updatedQueues[queueIndex] = updatedQueue;
      set({ queues: updatedQueues });
      console.log('✅ Queue updated:', updatedQueue.id);
    } else {
      // Add new queue to the beginning of the list
      const updatedQueues = [updatedQueue, ...queues];
      set({ queues: updatedQueues });
      console.log('✅ New queue added:', updatedQueue.id);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

