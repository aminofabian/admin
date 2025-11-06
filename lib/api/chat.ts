import { apiClient } from './client';
import type { ChatListResponse } from '@/types';

export const chatApi = {
  /**
   * Fetch the list of users available for chat
   * @param userId - The admin user ID
   */
  async getChatList(userId: number): Promise<ChatListResponse> {
    // Use Next.js API route as proxy (like other endpoints)
    // This provides better error handling and fallback when backend is not ready
    return apiClient.get<ChatListResponse>('api/chat-list', {
      params: { user_id: userId },
    });
  },
};

