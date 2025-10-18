import { create } from 'zustand';
import { gameSettingsApi } from '@/lib/api';
import type { 
  GameSettings,
  UpdateGameSettingsRequest
} from '@/types';

interface GameSettingsState {
  isLoading: boolean;
  error: string | null;
}

interface GameSettingsActions {
  updateGameSettings: (id: number, data: UpdateGameSettingsRequest) => Promise<GameSettings>;
  reset: () => void;
}

type GameSettingsStore = GameSettingsState & GameSettingsActions;

const initialState: GameSettingsState = {
  isLoading: false,
  error: null,
};

export const useGameSettingsStore = create<GameSettingsStore>((set, get) => ({
  ...initialState,

  updateGameSettings: async (id: number, data: UpdateGameSettingsRequest) => {
    set({ isLoading: true, error: null });

    try {
      const gameSettings = await gameSettingsApi.patch(id, data);
      
      set({ 
        isLoading: false,
        error: null,
      });
      
      return gameSettings;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update game settings';
      
      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);
        
        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update game settings.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      set({ 
        error: errorMessage,
        isLoading: false,
      });
      
      throw new Error(errorMessage);
    }
  },

  reset: () => {
    set(initialState);
  },
}));
