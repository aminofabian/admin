import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  GameSettings,
  UpdateGameSettingsRequest
} from '@/types';

// Game Settings API (PATCH only)
export const gameSettingsApi = {
  patch: (id: number, data: UpdateGameSettingsRequest) =>
    apiClient.patch<GameSettings>(API_ENDPOINTS.GAMES.DETAIL(id), data),
};
