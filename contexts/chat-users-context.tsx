'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { ChatUser } from '@/types';

interface ChatUsersContextType {
  users: ChatUser[];
  /** Online chats seeded/updated by the chat-list socket. */
  onlineChats: ChatUser[];
  /** Chats the server flags `is_unreplied` — the Unreplied tab. */
  unrepliedChats: ChatUser[];
  allPlayers: ChatUser[];
  onlineUsers: ChatUser[];
  isLoading: boolean;
  isLoadingAllPlayers: boolean;
  isLoadingMore: boolean;
  error: string | null;
  isConnected: boolean;
  refetch: () => Promise<void>;
  /** `force` bypasses the 5-minute directory cache (manual refresh). */
  fetchAllPlayers: (options?: { force?: boolean }) => Promise<void>;
  loadMorePlayers: () => Promise<void>;
  hasMorePlayers: boolean;
  playersWithChatsTotalCount: number | null;
  chatListOnlinePlayersCount: number | null;
  chatListAllPlayersCount: number | null;
  chatListUnrepliedPlayersCount: number | null;
  unrepliedListLive: boolean;
  socketOfflineUserIds: number[];
  acknowledgeStaffReply: (userId: number) => void;
  /** One-shot REST fill for Unreplied when the socket has not seeded the list. */
  seedUnrepliedFromRest: () => Promise<void>;
  refreshActiveChats: () => Promise<void>;
  /** Drop the cached all-players snapshot; call after any mutation. */
  invalidatePlayersCache: () => void;
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
