'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { ChatUser } from '@/types';

interface ChatUsersContextType {
  users: ChatUser[];
  allPlayers: ChatUser[];
  onlineUsers: ChatUser[];
  isLoading: boolean;
  isLoadingAllPlayers: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
  fetchAllPlayers: () => Promise<void>;
  loadMorePlayers: () => Promise<void>;
  hasMorePlayers: boolean;
  refreshActiveChats: () => Promise<void>;
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
  markChatAsRead: (params: { chatId?: string; userId?: number }) => void;
  markChatAsReadDebounced: (params: { chatId?: string; userId?: number }) => void;
}

const ChatUsersContext = createContext<ChatUsersContextType | undefined>(undefined);

export function ChatUsersProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const adminId = user?.id ?? 0;
  const enabled = adminId > 0 && user?.role !== USER_ROLES.SUPERADMIN;

  const chatUsersData = useChatUsers({
    adminId,
    enabled,
  });

  return (
    <ChatUsersContext.Provider value={chatUsersData}>
      {children}
    </ChatUsersContext.Provider>
  );
}

export function useChatUsersContext() {
  const context = useContext(ChatUsersContext);
  if (!context) {
    throw new Error('useChatUsersContext must be used within ChatUsersProvider');
  }
  return context;
}
