import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WEBSOCKET_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import { isValidTimestamp } from '@/lib/utils/formatters';
import { websocketManager, createWebSocketUrl, debounce, type WebSocketListeners } from '@/lib/websocket-manager';
import type { ChatUser } from '@/types';


// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

/**
 * Extract unread count from various field names consistently
 * Handles both unread_message_count and unread_messages_count fields
 */
const extractUnreadCount = (data: any): number => {
  const count1 = data.unread_message_count;
  const count2 = data.unread_messages_count;

  // Validate both are numbers and non-negative
  const validCount1 = typeof count1 === 'number' && count1 >= 0 ? count1 : 0;
  const validCount2 = typeof count2 === 'number' && count2 >= 0 ? count2 : 0;

  // Use the higher of the two valid counts for safety
  return Math.max(validCount1, validCount2);
};

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
    existing.winningBalance !== incoming.winningBalance
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
  refetch: () => void;
  fetchAllPlayers: () => Promise<void>;
  loadMorePlayers: () => Promise<void>; // Load next page
  hasMorePlayers: boolean; // Whether there are more pages
  refreshActiveChats: () => Promise<void>; // Refresh chat list from API
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
  markChatAsRead: (params: { chatId?: string; userId?: number }) => void;
  markChatAsReadDebounced: (params: { chatId?: string; userId?: number }) => void;
}

/**
 * Transform backend chat data to frontend ChatUser format
 * WebSocket format: chat object with nested player data OR re_arrange format
 */
function transformChatToUser(chat: any): ChatUser {
  const player = chat.player || {};

  // Handle re_arrange format where user_id is at top level
  const userId = Number(chat.user_id || player.id || 0);
  const username = chat.username || player.username || player.full_name || 'Unknown';

  // Validate timestamp before storing it
  const rawTimestamp = chat.last_message_time;
  const validTimestamp = isValidTimestamp(rawTimestamp) ? rawTimestamp : undefined;

  return {
    // Use chat_id as the main ID so we can match remove_chat_from_list messages
    id: String(chat.chat_id || chat.id || player.id || ''),
    user_id: userId,
    username: username,
    fullName: player.full_name || player.name || undefined,
    email: player.email || '',
    avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
    isOnline: player.is_online || player.isOnline || false,
    lastMessage: chat.last_message || undefined,
    lastMessageTime: validTimestamp,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance || player.winningBalance ?
      String(player.winning_balance || player.winningBalance) : undefined,
    gamesPlayed: player.games_played || player.gamesPlayed || undefined,
    winRate: player.win_rate || player.winRate || undefined,
    phone: player.phone_number || player.mobile_number || player.phone || player.mobile || undefined,
    unreadCount: extractUnreadCount(chat) || chat.unreadCount || 0,
    notes: player.notes || undefined,
  };
}

/**
 * Transform REST API player data to frontend ChatUser format
 * REST API format: player object from /api/v1/admin/chat/?request_type=all_players
 * This endpoint includes chat context (last message, unread count, chatroom info)
 */
function transformPlayerToUser(player: any): ChatUser {
  // Validate timestamp before storing it
  const rawTimestamp = player.last_message_timestamp;
  const validTimestamp = isValidTimestamp(rawTimestamp) ? rawTimestamp : undefined;

  return {
    // Use chatroom_id if available (for chat context), otherwise use player.id
    id: String(player.chatroom_id || player.id || ''),
    user_id: Number(player.id || 0),
    username: player.username || player.full_name || 'Unknown',
    fullName: player.full_name || player.name || undefined,
    email: player.email || '',
    avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
    isOnline: player.is_online || false,
    // Use last_message from API if available (new endpoint provides this)
    lastMessage: player.last_message || undefined,
    lastMessageTime: validTimestamp,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
    gamesPlayed: player.games_played || player.gems || undefined,
    winRate: player.win_rate || undefined,
    phone: player.phone_number || player.mobile_number || undefined,
    // Use unread_messages_count from API if available
    unreadCount: extractUnreadCount(player) || 0,
    notes: player.notes || undefined,
  };
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

  const connect = useCallback(() => {
    if (!enabled || !adminId) return;

    try {
      // Build WebSocket URL for chat list
      const wsUrl = createWebSocketUrl(WEBSOCKET_BASE_URL, '/ws/chatlist/', { user_id: adminId });
      wsUrlRef.current = wsUrl;

      !IS_PROD && console.log('🔌 [Chat Users] Connecting to managed WebSocket:', wsUrl);
      setIsLoading(true);

      // Create listeners for this hook
      const listeners: WebSocketListeners = {
        onOpen: () => {
          !IS_PROD && console.log('✅ [Chat Users] WebSocket connected');
          setError(null);
          setIsLoading(false);
          setIsConnected(true);
        },
        onMessage: (data) => {
          // Type assertion for WebSocket message data (consistent with handleWebSocketMessage)
          const messageData = data as any;
          !IS_PROD && console.log('📨 [Chat Users] Received message:', {
            type: messageData.type || messageData.message?.type,
            hasChats: !!messageData.chats || !!messageData.message?.chats,
            chatId: messageData.chat_id || messageData.message?.chat_id,
          });

          handleWebSocketMessage(messageData, refreshActiveChats);
        },
        onError: (error) => {
          console.error('❌ [Chat Users] WebSocket error:', error);
          setIsLoading(false);
          setIsConnected(false);
          setError('WebSocket connection error');
        },
        onClose: (event) => {
          !IS_PROD && console.log('🔌 [Chat Users] WebSocket closed:', event.code, event.reason);
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
  }, [adminId, enabled]);

  // Move the function definition after all dependencies are available
  const handleWebSocketMessage = useCallback((data: any, refreshCallback?: () => Promise<void>) => {
    try {
      !IS_PROD && console.log('📨 [Chat Users] Full message data:', data);

      // IGNORE typing events - they should not update the chat list
      const messageType = data.type || data.message?.type;
      if (messageType === 'typing') {
        !IS_PROD && console.log('⌨️ [Chat Users] Typing event received - ignoring for chat list');
        return;
      }

      // Handle "message" type from chat list WebSocket
      if (messageType === 'message' && data.player_id) {
        !IS_PROD && console.log('💬 [Chat Users] Message event received:', {
          playerId: data.player_id,
          message: data.message?.substring(0, 30),
          isPlayerSender: data.is_player_sender,
        });

        // Refresh chat list from API to get latest counts and messages
        refreshCallback?.();
        return;
      }

      // Handle "balanceUpdated" or "balance_updated" message type
      if (messageType === 'balanceUpdated' || messageType === 'balance_updated') {
        const playerId = data.player_id || data.user_id;
        const balance = data.balance ?? data.player_bal;
        const winningBalance = data.winning_balance ?? data.player_winning_bal;

        !IS_PROD && console.log('💰 [Chat Users] Balance updated notification received:', {
          playerId,
          balance,
          winningBalance,
        });

        if (playerId && (balance !== undefined || winningBalance !== undefined)) {
          setActiveChats((prevChats) => {
            return prevChats.map((chat) => {
              if (chat.user_id === Number(playerId)) {
                !IS_PROD && console.log(`💰 [Chat Users] Updating balance for player ${playerId}`);
                return {
                  ...chat,
                  balance: balance !== undefined ? String(balance) : chat.balance,
                  winningBalance: winningBalance !== undefined ? String(winningBalance) : chat.winningBalance,
                };
              }
              return chat;
            });
          });
        }
        return;
      }

      // Handle "add_new_chats" message type
      if (data.message && data.message.type === 'add_new_chats' && Array.isArray(data.message.chats)) {
        const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
        if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
          !IS_PROD && console.log(`⏭️ [Chat Users] Skipping add_new_chats - API refresh cooldown active`);
          return;
        }

        const chatList = data.message.chats;
        const incomingUsers = chatList.map(transformChatToUser);

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
                winningBalance: incomingChat.winningBalance ?? existingChat.winningBalance,
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

      // Handle chat updates with debouncing
      const handleChatUpdate = debounce((updateData: any) => {
        const chatId = String(updateData.chat_id);
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
          const playerData = updateData.player || {};
          const newBalance = updateData.balance ?? playerData.balance ?? updateData.player_bal;
          const newWinningBalance = updateData.winning_balance ?? playerData.winning_balance ?? updateData.player_winning_bal;
          
          // Extract unread count - handle both 0 and undefined/null cases
          const extractedUnreadCount = extractUnreadCount(updateData);
          const newUnreadCount = extractedUnreadCount !== undefined && extractedUnreadCount !== null 
            ? extractedUnreadCount 
            : existingChat.unreadCount;

          const updatedChat = {
            ...existingChat,
            lastMessage: updateData.last_message || existingChat.lastMessage,
            lastMessageTime: isValidTimestamp(updateData.last_message_time) ? updateData.last_message_time : existingChat.lastMessageTime,
            unreadCount: newUnreadCount,
            balance: newBalance !== undefined ? String(newBalance) : existingChat.balance,
            winningBalance: newWinningBalance !== undefined ? String(newWinningBalance) : existingChat.winningBalance,
          };

          updatedChats.splice(chatIndex, 1);
          return [updatedChat, ...updatedChats];
        });
      }, WS_UPDATE_COOLDOWN);

      if ((data.message && (data.message.type === 'update_chat' || data.message.type === 'new_message')) ||
          (data.type === 'update_chat' || data.type === 'new_message')) {
        const updateData = data.message || data;
        if (updateData.last_message || updateData.message) {
          handleChatUpdate(updateData);
        }
      }

      // Handle chat removal
      if ((data.message && data.message.type === 'remove_chat_from_list') || data.type === 'remove_chat_from_list') {
        const chatIdToRemove = data.message?.chat_id || data.chat_id;
        !IS_PROD && console.log(`🗑️ [Chat Users] Removing chat with ID: ${chatIdToRemove}`);
        setActiveChats((prevUsers) => prevUsers.filter((user) => user.id !== String(chatIdToRemove)));
      }

      // Handle mark_message_as_read - update unread count when messages are marked as read
      if (messageType === 'mark_message_as_read' || messageType === 'read') {
        const chatId = data.chat_id || data.message?.chat_id;
        const userId = data.user_id || data.player_id || data.message?.user_id || data.message?.player_id;
        
        if (chatId || userId) {
          !IS_PROD && console.log('✅ [Chat Users] Messages marked as read, updating unread count:', { chatId, userId });
          
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
      if ((data.message && data.message.type === 'update_chat') || data.type === 'update_chat') {
        const updateData = data.message || data;
        const chatId = String(updateData.chat_id || updateData.id || '');
        const unreadCount = extractUnreadCount(updateData);
        
        // If unread count is explicitly 0, update immediately (messages marked as read)
        if (unreadCount === 0 && chatId) {
          !IS_PROD && console.log('✅ [Chat Users] Unread count updated to 0 via WebSocket:', chatId);
          
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

      // Handle re_arrange
      if ((data.message && data.message.type === 're_arrange') || data.type === 're_arrange') {
        refreshCallback?.();
        return;
      }

      // Fallback for other formats
      if (data.chats && Array.isArray(data.chats)) {
        const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
        if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
          return;
        }

        const transformedUsers = data.chats.map(transformChatToUser);
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


  const refetch = useCallback(() => {
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
    !IS_PROD && console.log('🔄 [refreshActiveChats] Fetching latest chat list from backend...');
    
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
      !IS_PROD && console.log('🔄 [refreshActiveChats] Raw API response:', {
        hasPlayer: !!data.player,
        playerCount: data.player?.length,
        hasChats: !!data.chats,
        chatsCount: data.chats?.length,
        hasPagination: !!data.pagination,
      });
      
      //  Use the 'player' array - it has complete data including chat context
      if (data.player && Array.isArray(data.player)) {
        const transformedUsers = data.player.map(transformPlayerToUser);
        !IS_PROD && console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} players with chat data`);
        
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
        !IS_PROD && console.log('🕐 [refreshActiveChats] API refresh timestamp set:', lastApiRefreshRef.current);
        
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
          !IS_PROD && console.log('📭 [refreshActiveChats] No unread messages');
        }
      } else if (data.chats && Array.isArray(data.chats)) {
        // Fallback to chats format if player array is not present
        const transformedUsers = data.chats.map(transformChatToUser);
        !IS_PROD && console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} chats (fallback format)`);
        setActiveChats(transformedUsers);
      } else {
        console.warn('⚠️ [refreshActiveChats] Unexpected API response format - no player or chats array');
      }
    } catch (error) {
      console.error('❌ [refreshActiveChats] Error:', error);
    }
  }, []);

  /**
   * Fetch ALL players from REST API endpoint (First page)
   *  PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   * Note: Last messages are provided by WebSocket and merged in chat-component
   */
  const fetchAllPlayers = useCallback(async () => {
    // Set loading state IMMEDIATELY before any checks
    !IS_PROD && console.log('🚀 fetchAllPlayers - Starting');
    setIsLoadingAllPlayers(true);
    
    try {
      //  PERFORMANCE: Check cache first
      const now = Date.now();
      if (playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        !IS_PROD && console.log(' Using cached chats data, count:', playersCacheRef.current.data.length);
        setAllPlayers(playersCacheRef.current.data);
        // Small delay to show skeleton briefly even with cache
        await new Promise(resolve => setTimeout(resolve, 150));
        return;
      }

      setError(null);
      !IS_PROD && console.log('📥 Fetching all players via REST API (page 1)...');

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
      
      !IS_PROD && console.log(`📊 REST API returned ${playersArray?.length || 0} of ${totalCount} players`);
      !IS_PROD && console.log(`📄 Pagination:`, pagination);

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
      !IS_PROD && console.log('🏁 fetchAllPlayers - Complete');
      setIsLoadingAllPlayers(false); // Use separate loading state
    }
  }, [CACHE_TTL, pageSize]);

  /**
   * Load more players (next page) for infinite scroll
   */
  const loadMorePlayers = useCallback(async () => {
    if (!hasMorePlayers || isLoadingMore || isLoadingAllPlayers) {
      !IS_PROD && console.log('🚫 Cannot load more:', { hasMorePlayers, isLoadingMore, isLoadingAllPlayers });
      return;
    }

    const nextPage = currentPage + 1;
    !IS_PROD && console.log(`🔄 Loading more players - page ${nextPage}...`);
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

      !IS_PROD && console.log(`📊 Loaded ${playersArray?.length || 0} more players (page ${nextPage})`);
      !IS_PROD && console.log(`📄 Pagination:`, pagination);

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
      !IS_PROD && console.log('🏁 loadMorePlayers - Complete');
    }
  }, [hasMorePlayers, isLoadingMore, isLoadingAllPlayers, currentPage, pageSize, totalPages]);

  // Connect on mount
  useEffect(() => {
    if (enabled && adminId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, adminId, connect, disconnect]);

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

    !IS_PROD && console.log(`📝 [updateChatLastMessage] Called with:`, {
      userId,
      chatId,
      lastMessage: lastMessage.substring(0, 30),
      lastMessageTime,
      validTimestamp,
    });
    
    setActiveChats((prevChats) => {
      !IS_PROD && console.log(`📝 [updateChatLastMessage] Current activeChats count: ${prevChats.length}`);
      
      // Find and update the matching chat
      const chatIndex = prevChats.findIndex(
        (chat) => chat.id === chatId || chat.user_id === userId
      );
      
      !IS_PROD && console.log(`📝 [updateChatLastMessage] Found chat at index: ${chatIndex}`);
      
      if (chatIndex === -1) {
        // Chat not found in active chats - this could be a new conversation
        // The WebSocket should send an update to add it, but we can log this
        !IS_PROD && console.warn(`⚠️ [updateChatLastMessage] Chat not found! Looking for chatId: ${chatId} or userId: ${userId}`);
        !IS_PROD && console.log(`⚠️ [updateChatLastMessage] Available chats:`, prevChats.map(c => ({ id: c.id, user_id: c.user_id, username: c.username })));
        return prevChats;
      }
      
      const oldChat = prevChats[chatIndex];
      !IS_PROD && console.log(`📝 [updateChatLastMessage] Updating chat:`, {
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
      !IS_PROD && console.log(` [updateChatLastMessage] Chat updated and moved to top`);
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


