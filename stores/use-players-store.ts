import { create } from 'zustand';
import { playersApi } from '@/lib/api';
import type { 
  Player, 
  CreatePlayerRequest, 
  UpdateUserRequest,
  PaginatedResponse 
} from '@/types';

interface PlayersState {
  players: PaginatedResponse<Player> | null;
  isLoading: boolean;
  error: string | null;
  currentPage: number;
  searchTerm: string;
  pageSize: number;
}

interface PlayersActions {
  fetchPlayers: () => Promise<void>;
  createPlayer: (data: CreatePlayerRequest) => Promise<Player>;
  updatePlayer: (id: number, data: UpdateUserRequest) => Promise<Player>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  reset: () => void;
}

type PlayersStore = PlayersState & PlayersActions;

const initialState: PlayersState = {
  players: null,
  isLoading: false,
  error: null,
  currentPage: 1,
  searchTerm: '',
  pageSize: 10,
};

export const usePlayersStore = create<PlayersStore>((set, get) => ({
  ...initialState,

  fetchPlayers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm } = get();
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
      };

      const data = await playersApi.list(filters);
      
      set({ 
        players: data, 
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load players';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view players.';
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

  createPlayer: async (data: CreatePlayerRequest) => {
    try {
      const player = await playersApi.create(data);
      
      if (!player) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchPlayers();
      
      return player;
    } catch (err: unknown) {
      let errorMessage = 'Failed to create player';
      
      if (err && typeof err === 'object') {
        if ('detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need company or superadmin privileges to create players.';
          }
        } else {
          const validationErrors: string[] = [];
          Object.entries(err).forEach(([field, messages]) => {
            if (Array.isArray(messages)) {
              validationErrors.push(`${field}: ${messages.join(', ')}`);
            }
          });
          
          if (validationErrors.length > 0) {
            errorMessage = validationErrors.join('; ');
          }
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updatePlayer: async (id: number, data: UpdateUserRequest) => {
    try {
      const player = await playersApi.update(id, data);
      
      if (!player) {
        throw new Error('No data returned from server');
      }
      
      await get().fetchPlayers();
      
      return player;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update player';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update players.';
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
    get().fetchPlayers();
  },

  setSearchTerm: (term: string) => {
    set({ 
      searchTerm: term,
      currentPage: 1,
    });
    get().fetchPlayers();
  },

  reset: () => {
    set(initialState);
  },
}));

