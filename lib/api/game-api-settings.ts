import { apiClient } from './client';
import { readCategory2V2Api } from '@/lib/game-api-settings';
import type { GameApiSettings, UpdateGameApiSettingsRequest } from '@/types';

const ENDPOINT = 'api/admin/game-api-settings';

export const gameApiSettingsApi = {
  get: async (): Promise<GameApiSettings> => {
    const data = await apiClient.get<unknown>(ENDPOINT);
    return { category2_v2_api: readCategory2V2Api(data) };
  },

  update: async (body: UpdateGameApiSettingsRequest): Promise<GameApiSettings> => {
    const data = await apiClient.patch<unknown>(ENDPOINT, body);
    try {
      return { category2_v2_api: readCategory2V2Api(data) };
    } catch {
      return { category2_v2_api: body.category2_v2_api };
    }
  },
};
