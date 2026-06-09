import { apiClient } from './client';

export interface GameOperationQueueResponse {
  status: string;
  message: string;
  queue_id?: string;
  player_id: number;
  balance?: number;
  amount?: number;
}

function toGameIdParam(gameId: number): string {
  return String(gameId);
}

export const gameOperationsApi = {
  addUserGame: (body: { player_id: number; game_id: number }) =>
    apiClient.post<GameOperationQueueResponse>('api/admin/game-operations/add-user-game', {
      player_id: body.player_id,
      game_id: toGameIdParam(body.game_id),
    }),

  resetPassword: (body: { player_id: number; game_id: number }) =>
    apiClient.post<GameOperationQueueResponse>('api/admin/game-operations/reset-password', {
      player_id: body.player_id,
      game_id: toGameIdParam(body.game_id),
    }),

  recharge: (body: { player_id: number; game_id: number; amount: number }) =>
    apiClient.post<GameOperationQueueResponse>('api/admin/game-operations/recharge', {
      player_id: body.player_id,
      game_id: toGameIdParam(body.game_id),
      amount: body.amount,
    }),

  redeem: (body: { player_id: number; game_id: number }) =>
    apiClient.post<GameOperationQueueResponse>('api/admin/game-operations/redeem', {
      player_id: body.player_id,
      game_id: toGameIdParam(body.game_id),
    }),
};
