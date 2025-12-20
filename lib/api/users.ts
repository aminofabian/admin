import { apiClient } from './client';
import { API_ENDPOINTS, API_PREFIX } from '@/lib/constants/api';
import type { 
  Agent,
  Manager,
  Staff,
  Player,
  PlayerGame,
  ChatPurchase,
  GameActivity,
  CreateUserRequest,
  UpdateUserRequest,
  CheckPlayerGameBalanceRequest,
  CheckPlayerGameBalanceResponse,
  PaginatedResponse
} from '@/types';

interface UserFilters {
  search?: string;
  page?: number;
  page_size?: number;
  [key: string]: string | number | boolean | undefined;
}

export const managersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Manager>>(API_ENDPOINTS.MANAGERS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Manager>('api/admin/managers', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Manager>(`api/admin/managers/${id}`, data),
};

export const agentsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Agent>>(API_ENDPOINTS.AGENTS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Agent>('api/admin/agents', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Agent>(`api/admin/agents/${id}`, data),
};

export const staffsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Staff>>(API_ENDPOINTS.STAFFS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Staff>('api/admin/staffs', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Staff>(`api/admin/staffs/${id}`, data),
};

export const playersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Player>>(API_ENDPOINTS.PLAYERS.LIST, {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Player>('api/admin/players', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Player>(`api/admin/players/${id}`, data),

  viewDetails: (id: number) => 
    apiClient.get<{ total_purchases: number; total_cashouts: number; total_transfers: number }>(
      `api/view-player/${id}`
    ),

  manualPayment: (data: {
    player_id: number;
    value: number;
    type: 'increase' | 'decrease';
    balanceType: 'main' | 'winning';
  }) =>
    apiClient.post<{ 
      status: string; 
      player_bal: number; 
      player_winning_bal: number 
    }>('/api/v1/admin/manual-payment/', data),

  games: (playerId: number) =>
    apiClient.get<PlayerGame[]>(API_ENDPOINTS.GAMES.PLAYER_GAMES, {
      params: { player_id: playerId },
    }),

  createGame: (data: { username: string; password: string; code: string; user_id: number }) =>
    apiClient.post<{ 
      status: string; 
      message: string;
      game_name: string;
      game_url: string | null;
      username: string;
      password: string;
    }>(API_ENDPOINTS.GAMES.PLAYER_GAMES, data),

  purchases: (chatroomId: string | number) => {
    console.log('🔍 Fetching purchases for chatroom_id:', chatroomId);
    return apiClient.get<{ pending_cashout: ChatPurchase[] }>(API_ENDPOINTS.CHAT.ADMIN_CHAT, {
      params: { 
        request_type: 'purchases_list',
        chatroom_id: chatroomId 
      },
    }).then(response => {
      console.log('📦 Purchases response:', response);
      return response.pending_cashout || [];
    });
  },

  cashouts: (chatroomId: string | number) => {
    console.log('🔍 Fetching cashouts for chatroom_id:', chatroomId);
    return apiClient.get<{ cashouts: ChatPurchase[] }>(API_ENDPOINTS.CHAT.ADMIN_CHAT, {
      params: { 
        request_type: 'cashouts_list',
        chatroom_id: chatroomId 
      },
    }).then(response => {
      console.log('💰 Cashouts response:', response);
      return response.cashouts || [];
    });
  },

  gameActivities: (userId?: number) => {
    console.log('🔍 Fetching game activities for user_id:', userId);
    const params: Record<string, string | number> = { 
      request_type: 'game_activities'
    };
    // Add user_id filter if provided
    if (userId) {
      params.user_id = userId;
    }
    return apiClient.get<{ status: string; results: GameActivity[]; count: number }>(API_ENDPOINTS.CHAT.ADMIN_CHAT, {
      params,
    }).then(response => {
      console.log('🎮 Game activities response:', response);
      // Handle new response structure: { status, results, count }
      if (response.status === 'success' && Array.isArray(response.results)) {
        return response.results;
      }
      // Fallback for old structure
      return (response as { game_activities?: GameActivity[] }).game_activities || [];
    });
  },

  assignToAgent: (data: {
    player_id: number;
    agent_username: string;
  }) =>
    apiClient.post<{
      status: string;
      message: string;
      data: {
        player_id: number;
        player_username: string;
        agent_id: number;
        agent_username: string;
      };
    }>(`${API_PREFIX}/assign-player-to-agent/`, data),

  removeFromAgent: (data: {
    player_id: number;
  }) =>
    apiClient.post<{
      status: string;
      message: string;
      data: {
        player_id: number;
        player_username: string;
        agent_id: null;
        agent_username: null;
      };
    }>(`${API_PREFIX}/remove-player-from-agent/`, data),

  checkGameBalance: (data: CheckPlayerGameBalanceRequest) =>
    apiClient.post<CheckPlayerGameBalanceResponse>(
      API_ENDPOINTS.PLAYERS.CHECK_GAME_BALANCE,
      data
    ),

  deleteGame: (gameId: number) =>
    apiClient.delete<{ status: string; message: string }>(
      API_ENDPOINTS.GAMES.PLAYER_GAMES,
      {
        params: { id: gameId },
      }
    ),

  updateGame: (gameId: number, data: { username?: string; password?: string; status?: 'active' | 'inactive' }) =>
    apiClient.patch<PlayerGame>(
      API_ENDPOINTS.GAMES.PLAYER_GAMES,
      data,
      {
        params: { id: gameId },
      }
    ),
};

