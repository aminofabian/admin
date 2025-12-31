import { apiClient } from './client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import type { ChatLink, UpdateChatLinkRequest } from '@/types';

export const chatLinksApi = {
  list: () => apiClient.get<ChatLink[]>('api/chat-links'),

  get: (id: number) => apiClient.get<ChatLink>(API_ENDPOINTS.CHAT_LINKS.DETAIL(id)),

  update: (id: number, data: UpdateChatLinkRequest) =>
    apiClient.patch<ChatLink>(`api/chat-links/${id}`, data),
};

