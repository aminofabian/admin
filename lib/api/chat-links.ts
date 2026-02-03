import { apiClient } from './client';
import type { ChatLink, UpdateChatLinkRequest } from '@/types';

export const chatLinksApi = {
  list: () => apiClient.get<ChatLink[]>('api/chat-links'),

  get: (id: number) => apiClient.get<ChatLink>(`api/chat-links/${id}`),

  update: (id: number, data: UpdateChatLinkRequest) =>
    apiClient.patch<ChatLink>(`api/chat-links/${id}`, data),
};

