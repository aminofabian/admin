import { apiClient } from './client';
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
  AgentDashboardResponse,
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
    apiClient.get<PaginatedResponse<Manager>>('api/admin/managers', {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Manager>('api/admin/managers', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Manager>(`api/admin/managers/${id}`, data),
};

export const agentsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Agent>>('api/admin/agents', {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Agent>('api/admin/agents', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Agent>(`api/admin/agents/${id}`, data),

  getDashboard: (params?: { date_from?: string; date_to?: string }) =>
    apiClient.get<AgentDashboardResponse>('api/admin/agent-dashboard', {
      params,
    }),

  getStats: (agentId: number) =>
    apiClient.get<AgentDashboardResponse>('api/admin/agent-stats', {
      params: { agent_id: agentId },
    }),
};

export const staffsApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Staff>>('api/admin/staffs', {
      params: filters,
    }),

  create: (data: CreateUserRequest) => 
    apiClient.post<Staff>('api/admin/staffs', data),

  update: (id: number, data: UpdateUserRequest) => 
    apiClient.patch<Staff>(`api/admin/staffs/${id}`, data),
};

export const playersApi = {
  list: (filters?: UserFilters) => 
    apiClient.get<PaginatedResponse<Player>>('api/admin/players', {
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
    reason: string;
    remarks?: string;
  }) =>
    apiClient.post<{ 
      status: string; 
      player_bal: number; 
      player_winning_bal: number 
    }>('api/admin/manual-payment', data),

  games: (playerId: number) =>
    apiClient.get<PlayerGame[]>('api/admin/user-games', {
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
    }>('api/admin/user-games', data),

  purchases: (chatroomId: string | number) => {
    return apiClient.get<{ pending_cashout: ChatPurchase[] }>('api/chat-purchases', {
      params: { chatroom_id: chatroomId },
    }).then(response => response.pending_cashout || []);
  },

  cashouts: (chatroomId: string | number) => {
    return apiClient.get<{ cashouts: ChatPurchase[] }>('api/chat-cashouts', {
      params: { chatroom_id: chatroomId },
    }).then(response => response.cashouts || []);
  },

  gameActivities: (userId?: number) => {
    const params: Record<string, string | number> = {};
    if (userId) params.user_id = userId;
    return apiClient.get<{ status: string; results: GameActivity[]; count: number; game_activities?: GameActivity[] }>(
      'api/chat-game-activities',
      Object.keys(params).length ? { params } : undefined
    ).then(response => {
      if (response.status === 'success' && Array.isArray(response.results)) {
        return response.results;
      }
      return response.game_activities || [];
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
        agent_id: number | null;
        agent_username: string | null;
      };
    }>('api/admin/assign-player-to-agent', data),

  checkGameBalance: (data: CheckPlayerGameBalanceRequest) =>
    apiClient.post<CheckPlayerGameBalanceResponse>(
      'api/check-player-game-balance',
      data
    ),

  deleteGame: (gameId: number) =>
    apiClient.delete<{ status: string; message: string }>(
      'api/admin/user-games',
      {
        params: { id: gameId },
      }
    ),

  updateGame: (gameId: number, data: { username?: string; password?: string; status?: 'active' | 'inactive' }) =>
    apiClient.patch<PlayerGame>(
      'api/admin/user-games',
      data,
      {
        params: { id: gameId },
      }
    ),
};

