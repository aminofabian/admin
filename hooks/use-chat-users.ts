import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WEBSOCKET_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import { isValidTimestamp } from '@/lib/utils/formatters';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { websocketManager, createWebSocketUrl, debounce, type WebSocketListeners } from '@/lib/websocket-manager';
import type { ChatUser } from '@/types';
import {
  extractUnreadCount,
  mergeWinningBalanceFromPartialPayload,
  payloadIncludesWinningBalanceFields,
  transformChatToUser,
  transformPlayerToUser,
} from '@/lib/chat/map-chat-api';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Check if two chat objects have meaningful differences
 * Used to prevent unnecessary re-renders
 */
const hasSignificantChanges = (existing: ChatUser, incoming: ChatUser): boolean => {
  return (
    existing.lastMessage !== incoming.lastMessage ||
    existing.lastMessageTime !== incoming.lastMessageTime ||
    existing.unreadCount !== incoming.unreadCount ||
    existing.isOnline !== incoming.isOnline ||
    existing.balance !== incoming.balance ||
    existing.winningBalance !== incoming.winningBalance ||
    existing.cashoutLimit !== incoming.cashoutLimit ||
    existing.lockedBalance !== incoming.lockedBalance
  );
};

interface UseChatUsersParams {
  adminId: number;
  enabled?: boolean;
}

interface UseChatUsersReturn {
  users: ChatUser[]; // Active chats from WebSocket
  allPlayers: ChatUser[]; // All players from REST API
  onlineUsers: ChatUser[];
  isLoading: boolean;
  isLoadingAllPlayers: boolean; // Separate loading state for all players
  isLoadingMore: boolean; // Loading state for pagination
  error: string | null;
  isConnected: boolean; // WebSocket connection status
  refetch: () => Promise<void>;
  fetchAllPlayers: () => Promise<void>;
  loadMorePlayers: () => Promise<void>; // Load next page
  hasMorePlayers: boolean; // Whether there are more pages
  refreshActiveChats: () => Promise<void>; // Refresh chat list from API
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
  markChatAsRead: (params: { chatId?: string; userId?: number }) => void;
  markChatAsReadDebounced: (params: { chatId?: string; userId?: number }) => void;
}

export function useChatUsers({ adminId, enabled = true }: UseChatUsersParams): UseChatUsersReturn {
  // Separate state for active chats (WebSocket) and all players (REST API)
  const [activeChats, setActiveChats] = useState<ChatUser[]>([]);
  const [allPlayers, setAllPlayers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For WebSocket connection
  const [isLoadingAllPlayers, setIsLoadingAllPlayers] = useState(false); // For REST API
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For pagination
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const isAgent = user?.role === USER_ROLES.AGENT;
  const effectiveEnabled = enabled && !isAgent;

  // WebSocket management refs
  const wsUrlRef = useRef<string>('');
  const listenersRef = useRef<Set<WebSocketListeners>>(new Set());

  //  PERFORMANCE: Cache for fetchAllPlayers (5 min TTL)
  const playersCacheRef = useRef<{ data: ChatUser[]; timestamp: number } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  //  Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePlayers, setHasMorePlayers] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;

  //  Track last API refresh to prevent WebSocket from overwriting fresh API data
  const lastApiRefreshRef = useRef<number>(0);
  const API_REFRESH_COOLDOWN = 5000; // 5 seconds - ignore WebSocket updates after API refresh

  //  Track last update per chat to prevent rapid updates
  const chatLastUpdateRef = useRef<Map<string, number>>(new Map());
  const WS_UPDATE_COOLDOWN = 1000; // 1 second cooldown for WebSocket updates per chat

  // Store refreshActiveChats in a ref to avoid circular dependency
  const refreshActiveChatsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  // FIX #3: Single debounced function instance for chat updates (not recreated per message)
  const debouncedChatUpdateRef = useRef(
    debounce((...args: unknown[]) => {
      const updateData = args[0] as Record<string, unknown>;
      const chatId = String(updateData.chat_id ?? updateData.id ?? '');
      const now = Date.now();
      const lastUpdate = chatLastUpdateRef.current.get(chatId) || 0;

      if (now - lastUpdate < WS_UPDATE_COOLDOWN) {
        return;
      }

      chatLastUpdateRef.current.set(chatId, now);

      setActiveChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);

        if (chatIndex === -1) {
          const newChat = transformChatToUser(updateData);
          return [newChat, ...prevChats];
        }

        const updatedChats = [...prevChats];
        const existingChat = updatedChats[chatIndex];
        const playerData = (updateData.player as Record<string, unknown>) || undefined;
        const newBalance =
          updateData.balance ??
          (playerData ? playerData.balance : undefined) ??
          updateData.player_bal;
        const newCashoutLimit =
          updateData.cashout_limit ?? playerData?.cashout_limit ?? updateData.player_cashout_limit;
        const newLockedBalance =
          updateData.locked_balance ?? playerData?.locked_balance ?? updateData.player_locked_balance;

        const extractedUnreadCount = extractUnreadCount(updateData);
        const newUnreadCount = extractedUnreadCount !== undefined && extractedUnreadCount !== null
          ? extractedUnreadCount
          : existingChat.unreadCount;

        const updatedChat = {
          ...existingChat,
          lastMessage: (updateData.last_message as string | undefined) || existingChat.lastMessage,
          lastMessageTime: (() => {
            const t =
              (updateData.last_message_time as string | undefined) ||
              (updateData.last_message_timestamp as string | undefined);
            return isValidTimestamp(t) ? t : existingChat.lastMessageTime;
          })(),
          unreadCount: newUnreadCount,
          balance: newBalance !== undefined ? String(newBalance) : existingChat.balance,
          winningBalance: mergeWinningBalanceFromPartialPayload(
            updateData as Record<string, unknown>,
            playerData,
            existingChat.winningBalance,
          ),
          cashoutLimit:
            newCashoutLimit !== undefined && newCashoutLimit !== null
              ? String(newCashoutLimit)
              : existingChat.cashoutLimit,
          lockedBalance:
            newLockedBalance !== undefined && newLockedBalance !== null
              ? String(newLockedBalance)
              : existingChat.lockedBalance,
        };

        updatedChats.splice(chatIndex, 1);
        return [updatedChat, ...updatedChats];
      });
    }, WS_UPDATE_COOLDOWN) as (...args: unknown[]) => void
  );

  const connect = useCallback(() => {
    if (!effectiveEnabled || !adminId) return;

    try {
      // Build WebSocket URL for chat list
      const wsUrl = createWebSocketUrl(WEBSOCKET_BASE_URL, '/ws/chatlist/', { user_id: adminId });
      wsUrlRef.current = wsUrl;

      if (!IS_PROD) console.log('🔌 [Chat Users] Connecting to managed WebSocket:', wsUrl);
      setIsLoading(true);

      // Create listeners for this hook
      const listeners: WebSocketListeners = {
        onOpen: () => {
          if (!IS_PROD) console.log('✅ [Chat Users] WebSocket connected');
          setError(null);
          setIsLoading(false);
          setIsConnected(true);
        },
        onMessage: (data) => {
          // Type assertion for WebSocket message data (consistent with handleWebSocketMessage)
          const messageData = data as {
            type?: string;
            message?: { type?: string; chats?: unknown[]; chat_id?: string };
            chats?: unknown[];
            chat_id?: string;
          };
          if (!IS_PROD) console.log('📨 [Chat Users] Received message:', {
            type: messageData.type || messageData.message?.type,
            hasChats: !!messageData.chats || !!messageData.message?.chats,
            chatId: messageData.chat_id || messageData.message?.chat_id,
          });

          handleWebSocketMessage(messageData, refreshActiveChatsRef.current);
        },
        onError: (error) => {
          console.error('❌ [Chat Users] WebSocket error:', error);
          setIsLoading(false);
          setIsConnected(false);
          setError('WebSocket connection error');
        },
        onClose: (event) => {
          if (!IS_PROD) console.log('🔌 [Chat Users] WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setIsLoading(false);
        },
      };

      listenersRef.current.add(listeners);

      // Connect through manager
      websocketManager.connect({
        url: wsUrl,
        maxReconnectAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        connectionTimeout: 10000,
      }, listeners);

    } catch (error) {
      console.error('❌ [Chat Users] Failed to connect WebSocket:', error);
      setIsLoading(false);
      setError('Failed to connect to WebSocket');
    }
  }, [adminId, effectiveEnabled]);

  // Move the function definition after all dependencies are available
  const handleWebSocketMessage = useCallback((data: Record<string, unknown>, refreshCallback?: () => Promise<void>) => {
    try {
      if (!IS_PROD) console.log('📨 [Chat Users] Full message data:', data);

      // IGNORE typing events - they should not update the chat list
      const messageWrapper = data.message as Record<string, unknown> | undefined;
      const messageType = (data.type as string | undefined) || messageWrapper?.type;
      if (messageType === 'typing') {
        if (!IS_PROD) console.log('⌨️ [Chat Users] Typing event received - ignoring for chat list');
        return;
      }

      // Handle "message" type from chat list WebSocket
      if (messageType === 'message' && (data.player_id || (messageWrapper as Record<string, unknown>)?.player_id)) {
        const msg = (messageWrapper || data) as Record<string, unknown>;
        const playerId = data.player_id ?? msg.player_id;
        const messageText = typeof data.message === 'string' ? data.message.substring(0, 30) : String(data.message ?? msg.message ?? '').substring(0, 30);
        const isPlayerSender = data.is_player_sender ?? msg.is_player_sender;
        if (!IS_PROD) console.log('💬 [Chat Users] Message event received:', {
          playerId,
          message: messageText,
          isPlayerSender,
        });

        // Refresh chat list from API to get latest counts and messages
        refreshCallback?.();
        return;
      }

      // Handle "balanceUpdated" or "balance_updated" message type
      if (messageType === 'balanceUpdated' || messageType === 'balance_updated') {
        const playerId = data.player_id || data.user_id;
        const dataRecord = data as Record<string, unknown>;
        const nestedPlayer = (dataRecord.player as Record<string, unknown>) || undefined;
        const balance = data.balance ?? data.player_bal;
        const cashoutLimit =
          data.cashout_limit ??
          data.player_cashout_limit ??
          dataRecord.cashoutLimit ??
          nestedPlayer?.cashout_limit ??
          nestedPlayer?.player_cashout_limit ??
          nestedPlayer?.cashoutLimit;
        const lockedBalance =
          data.locked_balance ??
          data.player_locked_balance ??
          dataRecord.lockedBalance ??
          nestedPlayer?.locked_balance ??
          nestedPlayer?.player_locked_balance ??
          nestedPlayer?.lockedBalance;

        if (!IS_PROD) console.log('💰 [Chat Users] Balance updated notification received:', {
          playerId,
          balance,
          cashoutLimit,
          lockedBalance,
          hasWinningFields: payloadIncludesWinningBalanceFields(dataRecord, nestedPlayer),
        });

        if (
          playerId &&
          (balance !== undefined ||
            payloadIncludesWinningBalanceFields(dataRecord, nestedPlayer) ||
            cashoutLimit !== undefined ||
            lockedBalance !== undefined)
        ) {
          const pid = Number(playerId);
          const patch = (chat: ChatUser) => ({
            ...chat,
            balance: balance !== undefined ? String(balance) : chat.balance,
            winningBalance: mergeWinningBalanceFromPartialPayload(
              dataRecord,
              nestedPlayer,
              chat.winningBalance,
            ),
            cashoutLimit:
              cashoutLimit !== undefined && cashoutLimit !== null
                ? String(cashoutLimit)
                : chat.cashoutLimit,
            lockedBalance:
              lockedBalance !== undefined && lockedBalance !== null
                ? String(lockedBalance)
                : chat.lockedBalance,
          });

          setActiveChats((prevChats) => {
            return prevChats.map((chat) => {
              if (chat.user_id === pid) {
                if (!IS_PROD) console.log(`💰 [Chat Users] Updating balance for player ${playerId}`);
                return patch(chat);
              }
              return chat;
            });
          });

          setAllPlayers((prev) =>
            prev.map((player) => (player.user_id === pid ? patch(player) : player)),
          );
        }
        return;
      }

      // Handle "add_new_chats" message type
      if (messageWrapper && messageWrapper.type === 'add_new_chats' && Array.isArray(messageWrapper.chats)) {
        const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
        if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
          if (!IS_PROD) console.log(`⏭️ [Chat Users] Skipping add_new_chats - API refresh cooldown active`);
          return;
        }

        const chatList = messageWrapper.chats;
        const incomingUsers = chatList.map((c) => transformChatToUser(c as Record<string, unknown>));

        setActiveChats((prevChats) => {
          if (prevChats.length === 0) {
            return incomingUsers;
          }

          const incomingMap = new Map<string, ChatUser>(
            incomingUsers.map((user: ChatUser) => [user.id, user])
          );

          const updatedChats = prevChats.map(existingChat => {
            const incomingChat = incomingMap.get(existingChat.id);
            if (incomingChat) {
              incomingMap.delete(existingChat.id);

              if (!hasSignificantChanges(existingChat, incomingChat)) {
                return existingChat;
              }

              return {
                ...existingChat,
                lastMessage: incomingChat.lastMessage ?? existingChat.lastMessage,
                lastMessageTime: isValidTimestamp(incomingChat.lastMessageTime) ? incomingChat.lastMessageTime : existingChat.lastMessageTime,
                unreadCount: incomingChat.unreadCount ?? existingChat.unreadCount,
                isOnline: incomingChat.isOnline ?? existingChat.isOnline,
                balance: incomingChat.balance ?? existingChat.balance,
                winningBalance: Object.prototype.hasOwnProperty.call(incomingChat, 'winningBalance')
                  ? incomingChat.winningBalance
                  : undefined,
                cashoutLimit: incomingChat.cashoutLimit ?? existingChat.cashoutLimit,
                lockedBalance: incomingChat.lockedBalance ?? existingChat.lockedBalance,
                notes: existingChat.notes || incomingChat.notes,
              };
            }
            return existingChat;
          });

          const newChats = Array.from(incomingMap.values());
          return newChats.length > 0 ? [...newChats, ...updatedChats] : updatedChats;
        });

        setIsLoading(false);
      }

      if ((messageWrapper && (messageWrapper.type === 'update_chat' || messageWrapper.type === 'new_message')) ||
        (data.type === 'update_chat' || data.type === 'new_message')) {
        const updateData = (messageWrapper || data) as Record<string, unknown>;
        if (updateData.last_message || updateData.message) {
          debouncedChatUpdateRef.current(updateData);
        }
      }

      // Handle chat removal
      if ((messageWrapper && messageWrapper.type === 'remove_chat_from_list') || data.type === 'remove_chat_from_list') {
        const chatIdToRemove = messageWrapper?.chat_id || data.chat_id;
        if (!IS_PROD) console.log(`🗑️ [Chat Users] Removing chat with ID: ${chatIdToRemove}`);
        setActiveChats((prevUsers) => prevUsers.filter((user) => user.id !== String(chatIdToRemove)));
      }

      // Handle mark_message_as_read - update unread count when messages are marked as read
      if (messageType === 'mark_message_as_read' || messageType === 'read') {
        const chatId = data.chat_id || messageWrapper?.chat_id;
        const userId = data.user_id || data.player_id || messageWrapper?.user_id || messageWrapper?.player_id;

        if (chatId || userId) {
          if (!IS_PROD) console.log('✅ [Chat Users] Messages marked as read, updating unread count:', { chatId, userId });

          setActiveChats((prevChats) => {
            let hasChanges = false;
            const updatedChats = prevChats.map((chat) => {
              const isMatch =
                (chatId && chat.id === String(chatId)) ||
                (userId !== undefined && chat.user_id === Number(userId));

              if (isMatch && chat.unreadCount && chat.unreadCount > 0) {
                hasChanges = true;
                return {
                  ...chat,
                  unreadCount: 0,
                };
              }
              return chat;
            });

            return hasChanges ? updatedChats : prevChats;
          });

          setAllPlayers((prevPlayers) => {
            let hasChanges = false;
            const updatedPlayers = prevPlayers.map((player) => {
              const isMatch =
                (chatId && player.id === String(chatId)) ||
                (userId !== undefined && player.user_id === Number(userId));

              if (isMatch && player.unreadCount && player.unreadCount > 0) {
                hasChanges = true;
                return {
                  ...player,
                  unreadCount: 0,
                };
              }
              return player;
            });

            return hasChanges ? updatedPlayers : prevPlayers;
          });
        }
        return;
      }

      // Handle update_chat with unread_count = 0 (when messages are marked as read)
      if ((messageWrapper && messageWrapper.type === 'update_chat') || data.type === 'update_chat') {
        const updateData = messageWrapper || data;
        const chatId = String(updateData.chat_id || updateData.id || '');
        const unreadCount = extractUnreadCount(updateData);

        // If unread count is explicitly 0, update immediately (messages marked as read)
        if (unreadCount === 0 && chatId) {
          if (!IS_PROD) console.log('✅ [Chat Users] Unread count updated to 0 via WebSocket:', chatId);

          setActiveChats((prevChats) => {
            const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);
            if (chatIndex !== -1 && prevChats[chatIndex].unreadCount !== 0) {
              const updatedChats = [...prevChats];
              updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                unreadCount: 0,
              };
              return updatedChats;
            }
            return prevChats;
          });

          setAllPlayers((prevPlayers) => {
            const playerIndex = prevPlayers.findIndex((player) => player.id === chatId);
            if (playerIndex !== -1 && prevPlayers[playerIndex].unreadCount !== 0) {
              const updatedPlayers = [...prevPlayers];
              updatedPlayers[playerIndex] = {
                ...updatedPlayers[playerIndex],
                unreadCount: 0,
              };
              return updatedPlayers;
            }
            return prevPlayers;
          });
        }
      }

      // Handle re_arrange - refresh list
      if ((messageWrapper && messageWrapper.type === 're_arrange') || data.type === 're_arrange') {
        refreshCallback?.();
        return;
      }

      // Fallback for other formats
      if (data.chats && Array.isArray(data.chats)) {
        const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
        if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
          return;
        }

        const transformedUsers = data.chats.map((c) => transformChatToUser(c as Record<string, unknown>));
        setActiveChats(transformedUsers);
        setIsLoading(false);
      }

    } catch (error) {
      console.error('❌ [Chat Users] Failed to parse message:', error);
    }
  }, [setActiveChats, lastApiRefreshRef, API_REFRESH_COOLDOWN, chatLastUpdateRef, WS_UPDATE_COOLDOWN]);

  const disconnect = useCallback(() => {
    if (wsUrlRef.current) {
      // Disconnect all listeners for this URL
      listenersRef.current.forEach(listeners => {
        websocketManager.disconnect(wsUrlRef.current, listeners);
      });
      listenersRef.current.clear();
    }

    setIsConnected(false);
    setError(null);
  }, []);


  const refetch = useCallback(async () => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  /**
   * Refresh active chats from backend API
   * Called when a new message arrives to get updated counts and last messages
   * Uses the admin chat endpoint which returns chat data (unread counts, last messages, etc.)
   * 
   * API Response Format:
   * {
   *   chats: [...],           // Chat objects with basic info
   *   player: [...],          // Player objects with FULL data including chat context
   *   pagination: {...}
   * }
   */
  const refreshActiveChats = useCallback(async () => {
    if (!IS_PROD) console.log('🔄 [refreshActiveChats] Fetching latest chat list from backend...');

    try {
      const token = storage.get(TOKEN_KEY);
      //  Use the correct admin chat endpoint that returns chat context
      const response = await fetch('/api/chat-all-players?page=1&page_size=100', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.error('❌ [refreshActiveChats] Failed to fetch:', response.status);
        return;
      }

      const data = await response.json();
      if (!IS_PROD) console.log('🔄 [refreshActiveChats] Raw API response:', {
        hasPlayer: !!data.player,
        playerCount: data.player?.length,
        hasChats: !!data.chats,
        chatsCount: data.chats?.length,
        hasPagination: !!data.pagination,
      });

      //  Use the 'player' array - it has complete data including chat context
      if (data.player && Array.isArray(data.player)) {
        let transformedUsers: ChatUser[];
        try {
          transformedUsers = data.player.map(transformPlayerToUser);
        } catch (transformError) {
          console.error('❌ [refreshActiveChats] transformPlayerToUser failed:', transformError);
          return;
        }
        if (!IS_PROD) console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} players with chat data`);

        // Log raw data for first player to verify unread_messages_count is present
        if (!IS_PROD && data.player.length > 0) {
          console.log('🔍 [refreshActiveChats] Sample player data:', {
            username: data.player[0].username,
            unread_messages_count: data.player[0].unread_messages_count,
            last_message: data.player[0].last_message?.substring(0, 30),
            chatroom_id: data.player[0].chatroom_id,
          });
        }

        // Update state with fresh data from backend
        setActiveChats(transformedUsers);

        //  Mark the time of this API refresh to prevent WebSocket from overwriting it
        lastApiRefreshRef.current = Date.now();
        if (!IS_PROD) console.log('🕐 [refreshActiveChats] API refresh timestamp set:', lastApiRefreshRef.current);

        // Log chats with unread counts for debugging
        const chatsWithUnread = transformedUsers.filter((c: ChatUser) => (c.unreadCount ?? 0) > 0);
        if (!IS_PROD && chatsWithUnread.length > 0) {
          console.log(`📬 [refreshActiveChats] ${chatsWithUnread.length} chats with unread messages:`,
            chatsWithUnread.map((c: ChatUser) => ({
              username: c.username,
              unreadCount: c.unreadCount,
              lastMessage: c.lastMessage?.substring(0, 30)
            }))
          );
        } else {
          if (!IS_PROD) console.log('📭 [refreshActiveChats] No unread messages');
        }
      } else if (data.chats && Array.isArray(data.chats)) {
        // Fallback to chats format if player array is not present
        let transformedUsers: ChatUser[];
        try {
          transformedUsers = data.chats.map((c: unknown) => transformChatToUser(c as Record<string, unknown>));
        } catch (transformError) {
          console.error('❌ [refreshActiveChats] transformChatToUser failed:', transformError);
          return;
        }
        if (!IS_PROD) console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} chats (fallback format)`);
        setActiveChats(transformedUsers);
      } else {
        console.warn('⚠️ [refreshActiveChats] Unexpected API response format - no player or chats array');
      }
    } catch (error) {
      console.error('❌ [refreshActiveChats] Error:', error);
    }
  }, []);

  // FIX #4: Keep refreshActiveChats ref in sync via useEffect (not self-referencing)
  useEffect(() => {
    refreshActiveChatsRef.current = refreshActiveChats;
  }, [refreshActiveChats]);

  /**
   * Fetch ALL players from REST API endpoint (First page)
   *  PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   * Note: Last messages are provided by WebSocket and merged in chat-component
   */
  const fetchAllPlayers = useCallback(async () => {
    // Set loading state IMMEDIATELY before any checks
    if (!IS_PROD) console.log('🚀 fetchAllPlayers - Starting');
    setIsLoadingAllPlayers(true);

    try {
      //  PERFORMANCE: Check cache first
      const now = Date.now();
      if (playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        if (!IS_PROD) console.log(' Using cached chats data, count:', playersCacheRef.current.data.length);
        setAllPlayers(playersCacheRef.current.data);
        // Small delay to show skeleton briefly even with cache
        await new Promise(resolve => setTimeout(resolve, 150));
        return;
      }

      setError(null);
      if (!IS_PROD) console.log('📥 Fetching all players via REST API (page 1)...');

      const token = storage.get(TOKEN_KEY);
      const response = await fetch(`/api/chat-all-players?page=1&page_size=${pageSize}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to fetch all players');
      }

      const data = await response.json();

      // Handle both response formats: 'player' array (new endpoint) or 'results' array (old endpoint)
      const playersArray = data.player || data.results;
      const pagination = data.pagination;
      const totalCount = data.count || pagination?.total_count || playersArray?.length || 0;

      if (!IS_PROD) console.log(`📊 REST API returned ${playersArray?.length || 0} of ${totalCount} players`);
      if (!IS_PROD) console.log(`📄 Pagination:`, pagination);

      if (playersArray && Array.isArray(playersArray)) {
        const transformedUsers = playersArray.map(transformPlayerToUser);
        setAllPlayers(transformedUsers);

        // Update pagination state
        if (pagination) {
          setCurrentPage(pagination.page || 1);
          setTotalPages(pagination.total_pages || 1);
          setHasMorePlayers(pagination.has_next || false);
        } else {
          setCurrentPage(1);
          setHasMorePlayers(false);
        }

        //  PERFORMANCE: Update cache
        playersCacheRef.current = {
          data: transformedUsers,
          timestamp: now,
        };
      } else {
        console.warn('⚠️ No player or results array in response');
        setAllPlayers([]);
        setHasMorePlayers(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all players';
      console.error('❌ Error fetching all players:', errorMessage);
      setError(errorMessage);
    } finally {
      if (!IS_PROD) console.log('🏁 fetchAllPlayers - Complete');
      setIsLoadingAllPlayers(false); // Use separate loading state
    }
  }, [CACHE_TTL, pageSize]);

  /**
   * Load more players (next page) for infinite scroll
   */
  const loadMorePlayers = useCallback(async () => {
    if (!hasMorePlayers || isLoadingMore || isLoadingAllPlayers) {
      if (!IS_PROD) console.log('🚫 Cannot load more:', { hasMorePlayers, isLoadingMore, isLoadingAllPlayers });
      return;
    }

    const nextPage = currentPage + 1;
    if (!IS_PROD) console.log(`🔄 Loading more players - page ${nextPage}...`);
    setIsLoadingMore(true);

    try {
      const token = storage.get(TOKEN_KEY);
      const response = await fetch(`/api/chat-all-players?page=${nextPage}&page_size=${pageSize}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to load more players');
      }

      const data = await response.json();
      const playersArray = data.player || data.results;
      const pagination = data.pagination;

      if (!IS_PROD) console.log(`📊 Loaded ${playersArray?.length || 0} more players (page ${nextPage})`);
      if (!IS_PROD) console.log(`📄 Pagination:`, pagination);

      if (playersArray && Array.isArray(playersArray)) {
        const transformedUsers = playersArray.map(transformPlayerToUser);

        // Append new players to existing list
        setAllPlayers((prev) => [...prev, ...transformedUsers]);

        // Update pagination state
        if (pagination) {
          setCurrentPage(pagination.page || nextPage);
          setTotalPages(pagination.total_pages || totalPages);
          setHasMorePlayers(pagination.has_next || false);
        } else {
          setHasMorePlayers(false);
        }

        // Invalidate cache since we now have more data
        playersCacheRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more players';
      console.error('❌ Error loading more players:', errorMessage);
      // Don't set main error to avoid disrupting the UI
    } finally {
      setIsLoadingMore(false);
      if (!IS_PROD) console.log('🏁 loadMorePlayers - Complete');
    }
  }, [hasMorePlayers, isLoadingMore, isLoadingAllPlayers, currentPage, pageSize, totalPages]);

  // Connect on mount
  useEffect(() => {
    if (effectiveEnabled && adminId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [effectiveEnabled, adminId, connect, disconnect]);

  // Poll for new messages (fallback when WebSocket doesn't push - e.g. chat open, no player selected)
  const POLL_INTERVAL_MS = 10_000;
  useEffect(() => {
    if (!effectiveEnabled) return;
    void refreshActiveChats(); // Initial refresh to establish baseline
    const interval = setInterval(() => void refreshActiveChats(), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [effectiveEnabled, refreshActiveChats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  //  PERFORMANCE: Memoize online users using both chat list and player directory
  const onlineUsers = useMemo(() => {
    const seen = new Set<string>();

    return [...activeChats, ...allPlayers].filter((user) => {
      if (!user.isOnline) {
        return false;
      }

      const key = user.user_id ? String(user.user_id) : user.id;
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [activeChats, allPlayers]);

  /**
   * Update a specific chat's last message and time in the active chats list
   * This is called when a new message is received in real-time
   */
  const updateChatLastMessage = useCallback((
    userId: number,
    chatId: string,
    lastMessage: string,
    lastMessageTime: string
  ) => {
    // Validate timestamp before using it
    const validTimestamp = isValidTimestamp(lastMessageTime) ? lastMessageTime : undefined;

    if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Called with:`, {
      userId,
      chatId,
      lastMessage: lastMessage.substring(0, 30),
      lastMessageTime,
      validTimestamp,
    });

    setActiveChats((prevChats) => {
      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Current activeChats count: ${prevChats.length}`);

      // Find and update the matching chat
      const chatIndex = prevChats.findIndex(
        (chat) => chat.id === chatId || chat.user_id === userId
      );

      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Found chat at index: ${chatIndex}`);

      if (chatIndex === -1) {
        // Chat not found in active chats - this could be a new conversation
        // The WebSocket should send an update to add it, but we can log this
        if (!IS_PROD) console.warn(`⚠️ [updateChatLastMessage] Chat not found! Looking for chatId: ${chatId} or userId: ${userId}`);
        if (!IS_PROD) console.log(`⚠️ [updateChatLastMessage] Available chats:`, prevChats.map(c => ({ id: c.id, user_id: c.user_id, username: c.username })));
        return prevChats;
      }

      const oldChat = prevChats[chatIndex];
      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Updating chat:`, {
        username: oldChat.username,
        oldLastMessage: oldChat.lastMessage?.substring(0, 30),
        newLastMessage: lastMessage.substring(0, 30),
      });

      // Create updated chat list with the new last message
      const updatedChats = [...prevChats];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        lastMessage,
        lastMessageTime: validTimestamp,
      };

      // Move updated chat to the top of the list for better UX
      const [updatedChat] = updatedChats.splice(chatIndex, 1);
      if (!IS_PROD) console.log(` [updateChatLastMessage] Chat updated and moved to top`);
      return [updatedChat, ...updatedChats];
    });

    // Also update in allPlayers list if present
    setAllPlayers((prevPlayers) => {
      const playerIndex = prevPlayers.findIndex(
        (player) => player.user_id === userId
      );

      if (playerIndex === -1) {
        return prevPlayers;
      }

      const updatedPlayers = [...prevPlayers];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        lastMessage,
        lastMessageTime: validTimestamp,
      };

      return updatedPlayers;
    });
  }, []);

  /**
   * Reset unread count for a specific chat. Called when the admin opens a conversation.
   */
  const markChatAsRead = useCallback(({ chatId, userId }: { chatId?: string; userId?: number }) => {
    const normalizedChatId = chatId ? String(chatId) : null;
    const normalizedUserId = typeof userId === 'number' && Number.isFinite(userId) ? userId : null;

    if (!normalizedChatId && !normalizedUserId) {
      return;
    }

    setActiveChats((prevChats) => {
      let hasChanges = false;

      const updatedChats = prevChats.map((chat) => {
        const isMatch =
          (normalizedChatId && chat.id === normalizedChatId) ||
          (normalizedUserId !== null && chat.user_id === normalizedUserId);

        if (!isMatch || !chat.unreadCount) {
          return chat;
        }

        hasChanges = true;
        return {
          ...chat,
          unreadCount: 0,
        };
      });

      return hasChanges ? updatedChats : prevChats;
    });

    setAllPlayers((prevPlayers) => {
      let hasChanges = false;

      const updatedPlayers = prevPlayers.map((player) => {
        const isMatch =
          (normalizedChatId && player.id === normalizedChatId) ||
          (normalizedUserId !== null && player.user_id === normalizedUserId);

        if (!isMatch || !player.unreadCount) {
          return player;
        }

        hasChanges = true;
        return {
          ...player,
          unreadCount: 0,
        };
      });

      return hasChanges ? updatedPlayers : prevPlayers;
    });
  }, []);

  /**
   * Debounced version of markChatAsRead to prevent rapid calls
   */
  const markChatAsReadDebounced = useMemo(
    () => {
      const debouncedFn = debounce((...args: unknown[]) => {
        const params = args[0] as { chatId?: string; userId?: number };
        markChatAsRead(params);
      }, 300);
      return debouncedFn as (params: { chatId?: string; userId?: number }) => void;
    },
    [markChatAsRead]
  );

  return {
    users: activeChats, // For backward compatibility - return active chats as "users"
    allPlayers,
    onlineUsers,
    isLoading,
    isLoadingAllPlayers,
    isLoadingMore,
    error,
    isConnected, // Add connection status
    refetch,
    fetchAllPlayers,
    loadMorePlayers,
    hasMorePlayers,
    refreshActiveChats,
    updateChatLastMessage,
    markChatAsRead,
    markChatAsReadDebounced, // Debounced version for performance
  };
}


