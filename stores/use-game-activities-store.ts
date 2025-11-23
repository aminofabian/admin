import { create } from 'zustand';
import { gamesApi, transactionsApi } from '@/lib/api';
import type { Game, TransactionQueue, PaginatedResponse } from '@/types';

interface GameActivitiesData {
  activeGames: number;
  inactiveGames: number;
  pendingQueues: number;
  totalGames: number;
}

interface GameActivitiesState {
  data: GameActivitiesData;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface GameActivitiesActions {
  fetchGameActivities: () => Promise<void>;
  reset: () => void;
}

type GameActivitiesStore = GameActivitiesState & GameActivitiesActions;

const initialData: GameActivitiesData = {
  activeGames: 0,
  inactiveGames: 0,
  pendingQueues: 0,
  totalGames: 0,
};

const initialState: GameActivitiesState = {
  data: initialData,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

export const useGameActivitiesStore = create<GameActivitiesStore>((set, get) => ({
  ...initialState,

  fetchGameActivities: async () => {
    // Prevent concurrent requests
    const state = get();
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      // Fetch all games
      const gamesResponse: Game[] = await gamesApi.list({
        page_size: 1000, // Get all games
      });

      // Fetch pending transaction queues
      const queuesResponse: PaginatedResponse<TransactionQueue> = await transactionsApi.queues({
        type: 'processing',
        page_size: 1000, // Get all pending queues
      });

      // Calculate active/inactive games
      const activeGames = gamesResponse.filter(game => game.game_status === true).length;
      const inactiveGames = gamesResponse.filter(game => game.game_status === false).length;
      const totalGames = gamesResponse.length;
      const pendingQueues = queuesResponse.count;

      set({
        data: {
          activeGames,
          inactiveGames,
          pendingQueues,
          totalGames,
        },
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

    } catch (err: unknown) {
      let errorMessage = 'Failed to load game activities';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need appropriate privileges to view game activities.';
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

  reset: () => {
    set(initialState);
  },
}));
