import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Game,
  UserGame,
  UpdateGameRequest,
  CheckStoreBalanceRequest,
  CheckStoreBalanceResponse,
  PaginatedResponse 
} from '@/types';

interface GameFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

interface UserGameFilters {
  user_id?: number;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const gamesApi = {
  list: (filters?: GameFilters) => 
    apiClient.get<PaginatedResponse<Game>>(API_ENDPOINTS.GAMES.LIST, {
      params: filters,
    }),

  update: (id: number, data: UpdateGameRequest) => 
    apiClient.patch<Game>(API_ENDPOINTS.GAMES.DETAIL(id), data),

  userGames: (filters?: UserGameFilters) => 
    apiClient.get<PaginatedResponse<UserGame>>(API_ENDPOINTS.GAMES.USER_GAMES, {
      params: filters,
    }),

  checkStoreBalance: (data: CheckStoreBalanceRequest) => 
    apiClient.post<CheckStoreBalanceResponse>(
      API_ENDPOINTS.GAMES.CHECK_STORE_BALANCE, 
      data
    ),
};

