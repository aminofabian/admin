import { apiClient } from './client';
import type { 
  GameSettings,
  UpdateGameSettingsRequest
} from '@/types';

// Game Settings API (PATCH only)
export const gameSettingsApi = {
  patch: (id: number, data: UpdateGameSettingsRequest) =>
    apiClient.patch<GameSettings>(`api/admin/games/${id}`, data),
};
