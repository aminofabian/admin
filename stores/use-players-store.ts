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
  statusFilter: 'all' | 'active' | 'inactive';
  stateFilter: string; // 'all' or state code
  dateFilter: 'all' | 'today' | 'week' | 'month' | 'year';
}

interface PlayersActions {
  fetchPlayers: () => Promise<void>;
  createPlayer: (data: CreatePlayerRequest) => Promise<Player>;
  updatePlayer: (id: number, data: UpdateUserRequest) => Promise<Player>;
  setPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'active' | 'inactive') => void;
  setStateFilter: (state: string) => void;
  setDateFilter: (date: 'all' | 'today' | 'week' | 'month' | 'year') => void;
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
  statusFilter: 'all',
  stateFilter: 'all',
  dateFilter: 'all',
};

export const usePlayersStore = create<PlayersStore>((set, get) => ({
  ...initialState,

  fetchPlayers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { currentPage, pageSize, searchTerm, statusFilter, stateFilter, dateFilter } = get();
      
      // derive created_from/created_to from dateFilter
      const now = new Date();
      let created_from: string | undefined;
      let created_to: string | undefined;
      
      const toIsoEnd = (d: Date) => {
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);
        return end.toISOString();
      };
      const toIsoStart = (d: Date) => {
        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        return start.toISOString();
      };
      
      if (dateFilter === 'today') {
        created_from = toIsoStart(now);
        created_to = toIsoEnd(now);
      } else if (dateFilter === 'week') {
        const day = now.getDay(); // 0=Sun..6=Sat
        const diffToMonday = (day + 6) % 7; // 0 for Mon, 6 for Sun
        const monday = new Date(now);
        monday.setDate(now.getDate() - diffToMonday);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        created_from = toIsoStart(monday);
        created_to = toIsoEnd(sunday);
      } else if (dateFilter === 'month') {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        created_from = toIsoStart(first);
        created_to = toIsoEnd(last);
      } else if (dateFilter === 'year') {
        const first = new Date(now.getFullYear(), 0, 1);
        const last = new Date(now.getFullYear(), 11, 31);
        created_from = toIsoStart(first);
        created_to = toIsoEnd(last);
      }
      
      const filters = {
        page: currentPage,
        page_size: pageSize,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(stateFilter !== 'all' && { state: stateFilter }),
        ...(created_from && { created_from }),
        ...(created_to && { created_to }),
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

  setStatusFilter: (status: 'all' | 'active' | 'inactive') => {
    set({ statusFilter: status, currentPage: 1 });
    get().fetchPlayers();
  },

  setStateFilter: (state: string) => {
    set({ stateFilter: state, currentPage: 1 });
    get().fetchPlayers();
  },

  setDateFilter: (date: 'all' | 'today' | 'week' | 'month' | 'year') => {
    set({ dateFilter: date, currentPage: 1 });
    get().fetchPlayers();
  },

  reset: () => {
    set(initialState);
  },
}));

