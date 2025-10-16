import { create } from 'zustand';
import { gamesApi } from '@/lib/api';
import type { 
  Game, 
  UpdateGameRequest,
  PaginatedResponse 
} from '@/types';

interface GamesState {
  games: PaginatedResponse<Game> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface GamesActions {
  fetchGames: () => Promise<void>;
  updateGame: (id: number, data: UpdateGameRequest) => Promise<Game>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type GamesStore = GamesState & GamesActions;

const initialState: GamesState = {
  games: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const useGamesStore = create<GamesStore>((set, get) => ({
  ...initialState,

  fetchGames: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
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

  setPage: (page: number) => {
    set({ currentPage: page });
    get().fetchGames();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchGames();
  },

  reset: () => {
    set(initialState);
  },
}));

