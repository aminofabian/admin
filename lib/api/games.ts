import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { 
  Game,
  UserGame,
  UpdateGameRequest,
  CheckStoreBalanceRequest,
  CheckStoreBalanceResponse,
} from '@/types';
import type { Company } from '@/types';

interface GameFilters {
  search?: string;
  [key: string]: string | number | boolean | undefined;
}

interface UserGameFilters {
  user_id?: number;
  [key: string]: string | number | boolean | undefined;
}

interface OffmarketGame extends Game {
  enabled_by_superadmin?: boolean;
  company_id?: number;
  company_name?: string;
}

interface OffmarketGamesManagementResponse {
  status: string;
  role?: string;
  companies: Company[];
  selected_company?: Company;
  company_games: OffmarketGame[];
}

interface ToggleGameStatusRequest {
  type: 'toggle_enabled_by_superadmin';
  game_id: number;
}

interface EnableAllGamesRequest {
  type: 'enable_all_games';
  company_id: number;
}

interface DisableAllGamesRequest {
  type: 'disable_all_games';
  company_id: number;
}

export const gamesApi = {
  list: (filters?: GameFilters) => 
    apiClient.get<Game[]>(API_ENDPOINTS.GAMES.LIST, {
      params: filters,
    }),

  update: (id: number, data: UpdateGameRequest) => 
    apiClient.patch<Game>(API_ENDPOINTS.GAMES.DETAIL(id), data),

  userGames: (filters?: UserGameFilters) => 
    apiClient.get<UserGame[]>(API_ENDPOINTS.GAMES.USER_GAMES, {
      params: filters,
    }),

  checkStoreBalance: (data: CheckStoreBalanceRequest) => 
    apiClient.post<CheckStoreBalanceResponse>(
      API_ENDPOINTS.GAMES.CHECK_STORE_BALANCE, 
      data
    ),

  // Offmarket Games Management
  getOffmarketCompanies: () =>
    apiClient.get<OffmarketGamesManagementResponse>(API_ENDPOINTS.GAMES.OFFMARKET_MANAGEMENT),

  getOffmarketCompanyGames: (companyId: number) =>
    apiClient.get<OffmarketGamesManagementResponse>(API_ENDPOINTS.GAMES.OFFMARKET_MANAGEMENT, {
      params: { company_id: companyId },
    }),

  toggleGameStatus: (gameId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      API_ENDPOINTS.GAMES.OFFMARKET_MANAGEMENT,
      { type: 'toggle_enabled_by_superadmin', game_id: gameId } as ToggleGameStatusRequest
    ),

  enableAllGames: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      API_ENDPOINTS.GAMES.OFFMARKET_MANAGEMENT,
      { type: 'enable_all_games', company_id: companyId } as EnableAllGamesRequest
    ),

  disableAllGames: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      API_ENDPOINTS.GAMES.OFFMARKET_MANAGEMENT,
      { type: 'disable_all_games', company_id: companyId } as DisableAllGamesRequest
    ),
};

