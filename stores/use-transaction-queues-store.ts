import { create } from 'zustand';
import { transactionsApi } from '@/lib/api';
import type { 
  TransactionQueue,
  QueueFilters,
  PaginatedResponse,
  GameActionRequest
} from '@/types';

type FilterType = 
  | 'processing' 
  | 'history' 
  | 'recharge_game' 
  | 'redeem_game' 
  | 'add_user_game';

interface TransactionQueuesState {
  queues: PaginatedResponse<TransactionQueue> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  filter: FilterType;
  pageSize: number;
  actionLoading: boolean;
}

interface TransactionQueuesActions {
  fetchQueues: () => Promise<void>;
  setPage: (page: number) => void;
  setFilter: (filter: FilterType) => void;
  handleGameAction: (data: GameActionRequest) => Promise<void>;
  reset: () => void;
}

type TransactionQueuesStore = TransactionQueuesState & TransactionQueuesActions;

const initialState: TransactionQueuesState = {
  queues: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  filter: 'processing',
  pageSize: 10,
  actionLoading: false,
};

export const useTransactionQueuesStore = create<TransactionQueuesStore>((set, get) => ({
  ...initialState,

  fetchQueues: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, filter } = get();
      
      const filters: QueueFilters = {
        page: currentPage,
        page_size: pageSize,
        type: filter,
      };

      console.log('Fetching transaction queues with filters:', filters);

      const data = await transactionsApi.queues(filters);
      
      set({ 
        queues: data, 
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

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchQueues();
  },

  setFilter: (filter: FilterType) => {
    set({ 
      filter,
      currentPage: 1,
    });
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

  reset: () => {
    set(initialState);
  },
}));

