import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser } from '@/types';

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
  refetch: () => void;
  fetchAllPlayers: () => Promise<void>;
  loadMorePlayers: () => Promise<void>; // Load next page
  hasMorePlayers: boolean; // Whether there are more pages
  refreshActiveChats: () => Promise<void>; // Refresh chat list from API
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
  markChatAsRead: (params: { chatId?: string; userId?: number }) => void;
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
    lastMessageTime: chat.last_message_time || undefined,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance || player.winningBalance ? 
      String(player.winning_balance || player.winningBalance) : undefined,
    gamesPlayed: player.games_played || player.gamesPlayed || undefined,
    winRate: player.win_rate || player.winRate || undefined,
    phone: player.phone_number || player.mobile_number || player.phone || player.mobile || undefined,
    unreadCount: chat.unread_message_count || chat.unreadCount || 0,
    notes: player.notes || undefined,
  };
}

/**
 * Transform REST API player data to frontend ChatUser format
 * REST API format: player object from /api/v1/admin/chat/?request_type=all_players
 * This endpoint includes chat context (last message, unread count, chatroom info)
 */
function transformPlayerToUser(player: any): ChatUser {
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
    lastMessageTime: player.last_message_timestamp || undefined,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
    gamesPlayed: player.games_played || player.gems || undefined,
    winRate: player.win_rate || undefined,
    phone: player.phone_number || player.mobile_number || undefined,
    // Use unread_messages_count from API if available
    unreadCount: player.unread_messages_count || 0,
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
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ PERFORMANCE: Cache for fetchAllPlayers (5 min TTL)
  const playersCacheRef = useRef<{ data: ChatUser[]; timestamp: number } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  // ✅ Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePlayers, setHasMorePlayers] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 50;
  
  // ✅ Track last API refresh to prevent WebSocket from overwriting fresh API data
  const lastApiRefreshRef = useRef<number>(0);
  const API_REFRESH_COOLDOWN = 2000; // 2 seconds - ignore WebSocket updates after API refresh

  const connect = useCallback(() => {
    if (!enabled || !adminId) return;

    try {
      // Build WebSocket URL for chat list (as specified by Bimal)
      const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBaseUrl}/ws/chatlist/?user_id=${adminId}`;

      !IS_PROD && console.log('🔌 Connecting to chat list WebSocket:', wsUrl);
      setIsLoading(true);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        !IS_PROD && console.log('✅ Chat list WebSocket connected to:', wsUrl);
        !IS_PROD && console.log('   Ready to receive unread count updates in real-time');
        setError(null);
        setIsLoading(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          !IS_PROD && console.log('📨 [Chat List WS] Received message:', {
            type: data.type || data.message?.type,
            hasChats: !!data.chats || !!data.message?.chats,
            chatId: data.chat_id || data.message?.chat_id,
          });
          !IS_PROD && console.log('📨 [Chat List WS] Full message data:', data);

          // ✅ IGNORE typing events - they should not update the chat list
          const messageType = data.type || data.message?.type;
          if (messageType === 'typing') {
            !IS_PROD && console.log('⌨️ [Chat List WS] Typing event received - ignoring for chat list');
            return; // Don't update chat list for typing events
          }
          
          // ✅ Handle "message" type from chat list WebSocket (if it sends them)
          if (messageType === 'message' && data.player_id) {
            !IS_PROD && console.log('💬 [Chat List WS] Message event received:', {
              playerId: data.player_id,
              message: data.message?.substring(0, 30),
              isPlayerSender: data.is_player_sender,
            });
            
            // Refresh chat list from API to get latest counts and messages
            !IS_PROD && console.log('🔄 [Chat List WS] Refreshing chat list after message...');
            refreshActiveChats();
            
            // ✅ Return early to prevent other handlers from overwriting API data
            return;
          }

          // Handle "add_new_chats" message type
          if (data.message && data.message.type === 'add_new_chats' && Array.isArray(data.message.chats)) {
            // ✅ Check if we recently refreshed from API - if so, skip WebSocket update
            const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
            if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
              !IS_PROD && console.log(`⏭️ [Chat List WS] Skipping add_new_chats - API refresh happened ${timeSinceLastRefresh}ms ago (cooldown: ${API_REFRESH_COOLDOWN}ms)`);
              return; // Skip this WebSocket update to prevent overwriting fresh API data
            }
            
            const chatList = data.message.chats;
            
            // Log raw data to debug unread counts
            if (!IS_PROD) {
              console.log(`✅ [Chat List WS] Received ${chatList.length} chat users`);
              const chatsWithUnread = chatList.filter((c: any) => (c.unread_message_count ?? 0) > 0);
              if (chatsWithUnread.length > 0) {
                console.log(`📬 [Chat List WS] RAW data - ${chatsWithUnread.length} chats with unread_message_count:`,
                  chatsWithUnread.map((c: any) => ({
                    chat_id: c.chat_id,
                    username: c.player?.username,
                    unread_message_count: c.unread_message_count
                  }))
                );
              }
            }
            
            const incomingUsers = chatList.map(transformChatToUser);
            
            // ✅ PERFORMANCE: Smart merge - preserve existing data and only update what changed
            setActiveChats((prevChats) => {
              // If this is the initial load (prevChats is empty), just use incoming data
              if (prevChats.length === 0) {
                return incomingUsers;
              }
              
              // Build a map of incoming users by ID for O(1) lookup
              const incomingMap = new Map<string, ChatUser>(
                incomingUsers.map((user: ChatUser) => [user.id, user])
              );
              
              // Update existing chats and preserve order if possible
              const updatedChats = prevChats.map(existingChat => {
                const incomingChat = incomingMap.get(existingChat.id);
                
                if (incomingChat) {
                  incomingMap.delete(existingChat.id); // Mark as processed
                  
                  // ✅ PERFORMANCE: Only create new object if there are actual changes
                  if (!hasSignificantChanges(existingChat, incomingChat)) {
                    return existingChat; // No changes, return same reference to prevent re-render
                  }
                  
                  // Merge: preserve local state but update server data
                  return {
                    ...existingChat,
                    // Update fields that come from server
                    lastMessage: incomingChat.lastMessage ?? existingChat.lastMessage,
                    lastMessageTime: incomingChat.lastMessageTime ?? existingChat.lastMessageTime,
                    unreadCount: incomingChat.unreadCount ?? existingChat.unreadCount,
                    isOnline: incomingChat.isOnline ?? existingChat.isOnline,
                    balance: incomingChat.balance ?? existingChat.balance,
                    winningBalance: incomingChat.winningBalance ?? existingChat.winningBalance,
                    // Preserve notes and other local data
                    notes: existingChat.notes || incomingChat.notes,
                  };
                }
                
                // Chat not in incoming list - keep it but mark as potentially stale
                return existingChat;
              });
              
              // Add any new chats that weren't in the previous list
              const newChats = Array.from(incomingMap.values());
              if (newChats.length > 0) {
                !IS_PROD && console.log(`➕ [Chat List WS] Adding ${newChats.length} new chats`);
              }
              
              // Log unread count updates
              if (!IS_PROD) {
                const chatsWithUnread = [...updatedChats, ...newChats].filter(c => (c.unreadCount ?? 0) > 0);
                if (chatsWithUnread.length > 0) {
                  console.log(`📬 [Chat List WS] Updated unread counts for ${chatsWithUnread.length} chats:`,
                    chatsWithUnread.map(c => ({ username: c.username, unreadCount: c.unreadCount }))
                  );
                }
              }
              
              return newChats.length > 0 ? [...newChats, ...updatedChats] : updatedChats;
            });
            
            setIsLoading(false);
          }
          // Handle "update_chat" or "new_message" to update existing chat in list
          else if ((data.message && data.message.type === 'update_chat') || 
                   (data.message && data.message.type === 'new_message') ||
                   (data.type === 'update_chat') ||
                   (data.type === 'new_message')) {
            const updateData = data.message || data;
            
            // ✅ Only update if there's an actual message, not just typing
            if (!updateData.last_message && !updateData.message) {
              !IS_PROD && console.log('⚠️ [Chat List WS] Update event without message content - likely typing, ignoring');
              return;
            }
            
            !IS_PROD && console.log('🔄 [Chat List WS] Chat update received:', {
              chatId: updateData.chat_id,
              lastMessage: updateData.last_message?.substring(0, 30),
              lastMessageTime: updateData.last_message_time,
              unreadCount: updateData.unread_message_count,
            });
            
            setActiveChats((prevChats) => {
              const chatIndex = prevChats.findIndex(
                (chat) => chat.id === String(updateData.chat_id)
              );
              
              if (chatIndex === -1) {
                // New chat - add it to the list
                !IS_PROD && console.log('➕ [Chat List WS] New chat detected, adding to list');
                const newChat = transformChatToUser(updateData);
                return [newChat, ...prevChats];
              }
              
              // Update existing chat
              !IS_PROD && console.log('🔄 [Chat List WS] Updating existing chat at index', chatIndex);
              const updatedChats = [...prevChats];
              const updatedChat = {
                ...updatedChats[chatIndex],
                lastMessage: updateData.last_message || updatedChats[chatIndex].lastMessage,
                lastMessageTime: updateData.last_message_time || updatedChats[chatIndex].lastMessageTime,
                unreadCount: updateData.unread_message_count ?? updatedChats[chatIndex].unreadCount,
              };
              
              // Move to top of list
              updatedChats.splice(chatIndex, 1);
              return [updatedChat, ...updatedChats];
            });
          }
          // Handle "remove_chat_from_list" message type (format 1: wrapped in message)
          else if (data.message && data.message.type === 'remove_chat_from_list') {
            const chatIdToRemove = data.message.chat_id;
            !IS_PROD && console.log(`🗑️ [Chat List WS] Removing chat with ID: ${chatIdToRemove}`);
            setActiveChats((prevUsers) => 
              prevUsers.filter((user) => user.id !== String(chatIdToRemove))
            );
          }
          // Handle "remove_chat_from_list" message type (format 2: direct)
          else if (data.type === 'remove_chat_from_list') {
            const chatIdToRemove = data.chat_id;
            !IS_PROD && console.log(`🗑️ [Chat List WS] Removing chat with ID: ${chatIdToRemove}`);
            setActiveChats((prevUsers) => 
              prevUsers.filter((user) => user.id !== String(chatIdToRemove))
            );
          }
          // Handle "re_arrange" message type - single chat update with unread count
          else if ((data.message && data.message.type === 're_arrange') || data.type === 're_arrange') {
            const chatData = data.message || data;
            !IS_PROD && console.log('🔄 [Chat List WS] Re-arrange event (RAW):', chatData);
            !IS_PROD && console.log('🔄 [Chat List WS] Re-arrange event:', {
              chatId: chatData.chat_id,
              username: chatData.username || chatData.player?.username,
              unreadCount: chatData.unread_message_count,
              lastMessage: chatData.last_message,
              lastMessageTime: chatData.last_message_time,
            });
            
            // Refresh chat list from API to get canonical state from backend
            !IS_PROD && console.log('🔄 [Chat List WS] Refreshing chat list after re_arrange...');
            refreshActiveChats();
            
            // ✅ Return early - API refresh provides the latest data
            return;
          }
          // Fallback for other formats
          else if (data.chats && Array.isArray(data.chats)) {
            // ✅ Check if we recently refreshed from API - if so, skip WebSocket update
            const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
            if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
              !IS_PROD && console.log(`⏭️ [Chat List WS] Skipping fallback chats - API refresh happened ${timeSinceLastRefresh}ms ago`);
              return;
            }
            
            const transformedUsers = data.chats.map(transformChatToUser);
            !IS_PROD && console.log(`✅ [Chat List WS] Received ${transformedUsers.length} chat users (fallback format)`);
            setActiveChats(transformedUsers);
            setIsLoading(false);
          }
          // Handle single chat update
          else if (data.chat_id || (data.player && data.player.id)) {
            // ✅ Check if we recently refreshed from API - if so, skip WebSocket update
            const timeSinceLastRefresh = Date.now() - lastApiRefreshRef.current;
            if (timeSinceLastRefresh < API_REFRESH_COOLDOWN) {
              !IS_PROD && console.log(`⏭️ [Chat List WS] Skipping single chat update - API refresh happened ${timeSinceLastRefresh}ms ago`);
              return;
            }
            
            !IS_PROD && console.log('🔄 [Chat List WS] Single chat update (direct format)');
            const singleChat = transformChatToUser(data);
            setActiveChats((prevChats) => {
              const chatIndex = prevChats.findIndex(
                (chat) => chat.id === singleChat.id
              );
              
              if (chatIndex === -1) {
                !IS_PROD && console.log('➕ [Chat List WS] Adding new chat to list');
                return [singleChat, ...prevChats];
              }
              
              !IS_PROD && console.log('🔄 [Chat List WS] Updating existing chat');
              const updatedChats = [...prevChats];
              updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                ...singleChat,
              };
              
              // Move to top
              const [updated] = updatedChats.splice(chatIndex, 1);
              return [updated, ...updatedChats];
            });
          }
          else {
            !IS_PROD && console.log('ℹ️ [Chat List WS] Unknown message format:', data);
          }
        } catch (error) {
          console.error('❌ [Chat List WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (event: Event) => {
        // WebSocket error events may be ErrorEvent or generic Event
        // Extract meaningful information safely
        const errorInfo: Record<string, unknown> = {
          type: event.type,
          timestamp: event.timeStamp,
        };

        // If it's an ErrorEvent, extract additional properties
        if (event instanceof ErrorEvent) {
          errorInfo.message = event.message || 'Unknown WebSocket error';
          errorInfo.filename = event.filename || 'unknown';
          errorInfo.lineno = event.lineno || 'unknown';
          errorInfo.colno = event.colno || 'unknown';
          errorInfo.error = event.error || null;
        } else {
          // For generic Event, try to get more info from the WebSocket state
          const currentWs = wsRef.current;
          if (currentWs) {
            errorInfo.readyState = currentWs.readyState;
            errorInfo.url = currentWs.url;
          }
        }

        !IS_PROD && console.error('❌ Chat list WebSocket error:', errorInfo);
        // ✅ Don't set error - we have REST API fallback
        setIsLoading(false);
      };

      ws.onclose = (event) => {
        !IS_PROD && console.log('🔌 Chat list WebSocket closed:', event.code, event.reason);
        wsRef.current = null;

        // ✅ PERFORMANCE: Debounced reconnection with exponential backoff
        if (enabled && !reconnectTimeoutRef.current) {
          const reconnectDelay = 5000;
          !IS_PROD && console.log(`🔄 Reconnecting to chat list in ${reconnectDelay}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connect();
          }, reconnectDelay);
        }
      };
    } catch (error) {
      console.error('❌ Failed to create chat list WebSocket:', error);
      // ✅ Don't set error - we have REST API fallback
      setIsLoading(false);
    }
  }, [adminId, enabled]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      console.log('🔌 Disconnecting chat list WebSocket');
      wsRef.current.close();
      wsRef.current = null;
    }
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
      // ✅ Use the correct admin chat endpoint that returns chat context
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
      
      // ✅ Use the 'player' array - it has complete data including chat context
      if (data.player && Array.isArray(data.player)) {
        const transformedUsers = data.player.map(transformPlayerToUser);
        !IS_PROD && console.log(`✅ [refreshActiveChats] Fetched ${transformedUsers.length} players with chat data`);
        
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
        
        // ✅ Mark the time of this API refresh to prevent WebSocket from overwriting it
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
        !IS_PROD && console.log(`✅ [refreshActiveChats] Fetched ${transformedUsers.length} chats (fallback format)`);
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
   * ✅ PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   * Note: Last messages are provided by WebSocket and merged in chat-component
   */
  const fetchAllPlayers = useCallback(async () => {
    // Set loading state IMMEDIATELY before any checks
    !IS_PROD && console.log('🚀 fetchAllPlayers - Starting');
    setIsLoadingAllPlayers(true);
    
    try {
      // ✅ PERFORMANCE: Check cache first
      const now = Date.now();
      if (playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        !IS_PROD && console.log('✅ Using cached chats data, count:', playersCacheRef.current.data.length);
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
        
        // ✅ PERFORMANCE: Update cache
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

  // ✅ PERFORMANCE: Memoize online users using both chat list and player directory
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
    !IS_PROD && console.log(`📝 [updateChatLastMessage] Called with:`, {
      userId,
      chatId,
      lastMessage: lastMessage.substring(0, 30),
      lastMessageTime,
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
        lastMessageTime,
      };
      
      // Move updated chat to the top of the list for better UX
      const [updatedChat] = updatedChats.splice(chatIndex, 1);
      !IS_PROD && console.log(`✅ [updateChatLastMessage] Chat updated and moved to top`);
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
        lastMessageTime,
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

  return {
    users: activeChats, // For backward compatibility - return active chats as "users"
    allPlayers,
    onlineUsers,
    isLoading,
    isLoadingAllPlayers,
    isLoadingMore,
    error,
    refetch,
    fetchAllPlayers,
    loadMorePlayers,
    hasMorePlayers,
    refreshActiveChats,
    updateChatLastMessage,
    markChatAsRead,
  };
}

