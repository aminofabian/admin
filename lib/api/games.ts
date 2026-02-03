import { apiClient } from './client';
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

interface GamesListResponse {
  results: Game[];
  minimum_redeem_multiplier?: string;
}

interface UpdateMinimumRedeemMultiplierRequest {
  minimum_redeem_multiplier: number;
}

interface UpdateMinimumRedeemMultiplierResponse {
  status: 'success';
  message: string;
  minimum_redeem_multiplier: string;
}

export const gamesApi = {
  list: (filters?: GameFilters) => 
    apiClient.get<GamesListResponse | Game[]>('api/admin/games', {
      params: filters,
    }),

  update: (id: number, data: UpdateGameRequest) => 
    apiClient.patch<Game>(`api/admin/games/${id}`, data),

  userGames: (filters?: UserGameFilters) => 
    apiClient.get<UserGame[]>('api/admin/user-games-list', {
      params: filters,
    }),

  checkStoreBalance: (data: CheckStoreBalanceRequest) => 
    apiClient.post<CheckStoreBalanceResponse>(
      'api/check-store-balance', 
      data
    ),

  updateMinimumRedeemMultiplier: (data: UpdateMinimumRedeemMultiplierRequest) =>
    apiClient.post<UpdateMinimumRedeemMultiplierResponse>(
      'api/admin/update-minimum-redeem-multiplier',
      data
    ),

  // Offmarket Games Management
  getOffmarketCompanies: () =>
    apiClient.get<OffmarketGamesManagementResponse>('api/admin/offmarket-games-management'),

  getOffmarketCompanyGames: (companyId: number) =>
    apiClient.get<OffmarketGamesManagementResponse>('api/admin/offmarket-games-management', {
      params: { company_id: companyId },
    }),

  toggleGameStatus: (gameId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/offmarket-games-management',
      { type: 'toggle_enabled_by_superadmin', game_id: gameId } as ToggleGameStatusRequest
    ),

  enableAllGames: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/offmarket-games-management',
      { type: 'enable_all_games', company_id: companyId } as EnableAllGamesRequest
    ),

  disableAllGames: (companyId: number) =>
    apiClient.post<{ status: string; message?: string }>(
      'api/admin/offmarket-games-management',
      { type: 'disable_all_games', company_id: companyId } as DisableAllGamesRequest
    ),
};

