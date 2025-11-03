import { create } from 'zustand';
import { gamesApi } from '@/lib/api';
import type { 
  Game, 
  UpdateGameRequest,
  CheckStoreBalanceRequest,
  CheckStoreBalanceResponse,
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
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update games.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
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
    set({ 
      searchTerm: term,
    });
    get().fetchGames();
  },

  reset: () => {
    set(initialState);
  },
}));

