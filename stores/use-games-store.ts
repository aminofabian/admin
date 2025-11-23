import { create } from 'zustand';
import { gamesApi } from '@/lib/api';
import type { 
  Game, 
  UpdateGameRequest,
  CheckStoreBalanceRequest,
  CheckStoreBalanceResponse,
  ApiError,
} from '@/types';

interface GamesState {
  games: Game[] | null;
  isLoading: boolean;
  error: string | null;
  searchTerm: string;
  balanceCheckLoading: boolean;
}

interface GamesActions {
  fetchGames: () => Promise<void>;
  updateGame: (id: number, data: UpdateGameRequest) => Promise<Game>;
  checkStoreBalance: (data: CheckStoreBalanceRequest) => Promise<CheckStoreBalanceResponse>;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type GamesStore = GamesState & GamesActions;

const initialState: GamesState = {
  games: null,
  isLoading: false,
  error: null,
  searchTerm: '',
  balanceCheckLoading: false,
};

export const useGamesStore = create<GamesStore>((set, get) => ({
  ...initialState,

  fetchGames: async () => {
    // Prevent concurrent requests
    const state = get();
    if (state.isLoading) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const { searchTerm } = get();
      
      const filters = {
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await gamesApi.list(filters);
      
      set({ 
        games: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load games';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view games.';
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

  updateGame: async (id: number, data: UpdateGameRequest) => {
    try {
      const game = await gamesApi.update(id, data);
      
      if (!game) {
        throw new Error('No data returned from server');
      }
      
      // Refresh the games list after update
      await get().fetchGames();
      
      return game;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update game';
      
      // If it's already an ApiError, preserve it
      if (err && typeof err === 'object' && 'status' in err && err.status === 'error') {
        const apiError = err as ApiError;
        errorMessage = apiError.message || apiError.detail || apiError.error || errorMessage;
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update games.';
        }
        
        set({ error: errorMessage });
        // Preserve the full ApiError structure
        throw apiError;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        // Handle case where error has detail but not full ApiError structure
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update games.';
        }
        
        set({ error: errorMessage });
        // Create ApiError-like structure
        throw {
          status: 'error' as const,
          message: errorMessage,
          detail: errorMessage,
        } as ApiError;
      } else if (err instanceof Error) {
        errorMessage = err.message;
        set({ error: errorMessage });
        throw err;
      } else {
        set({ error: errorMessage });
        throw new Error(errorMessage);
      }
    }
  },

  checkStoreBalance: async (data: CheckStoreBalanceRequest) => {
    set({ balanceCheckLoading: true });
    
    try {
      const response = await gamesApi.checkStoreBalance(data);
      
      if (response.status !== 'success') {
        throw new Error(response.message || 'Failed to check store balance');
      }
      
      set({ balanceCheckLoading: false });
      return response;
    } catch (err: unknown) {
      let errorMessage = 'Failed to check store balance';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
        } else if ('message' in err) {
          errorMessage = String(err.message);
        }
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ balanceCheckLoading: false });
      throw new Error(errorMessage);
    }
  },

  setSearchTerm: (term: string) => {
    const currentTerm = get().searchTerm;
    // Only update and fetch if the term actually changed
    if (currentTerm !== term) {
      set({ 
        searchTerm: term,
      });
      get().fetchGames();
    }
  },

  reset: () => {
    set(initialState);
  },
}));

