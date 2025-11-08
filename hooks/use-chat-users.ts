import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { API_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser } from '@/types';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

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
  error: string | null;
  refetch: () => void;
  fetchAllPlayers: () => Promise<void>;
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
}

/**
 * Transform backend chat data to frontend ChatUser format
 * WebSocket format: chat object with nested player data
 */
function transformChatToUser(chat: any): ChatUser {
  const player = chat.player || {};
  
  return {
    // Use chat_id as the main ID so we can match remove_chat_from_list messages
    id: String(chat.chat_id || chat.id || player.id || ''),
    user_id: Number(player.id || 0),
    username: player.username || player.full_name || 'Unknown',
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
  };
}

/**
 * Transform REST API player data to frontend ChatUser format
 * REST API format: simple player object from /api/v1/players/
 */
function transformPlayerToUser(player: any): ChatUser {
  return {
    // Use player.id as the main ID (no chatroom_id in REST API response)
    id: String(player.id || ''),
    user_id: Number(player.id || 0),
    username: player.username || player.full_name || 'Unknown',
    fullName: player.full_name || player.name || undefined,
    email: player.email || '',
    avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
    isOnline: player.is_online || false,
    lastMessage: undefined, // REST API doesn't include chat-specific data
    lastMessageTime: undefined,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
    gamesPlayed: player.games_played || undefined,
    winRate: player.win_rate || undefined,
    phone: player.phone_number || player.mobile_number || undefined,
    unreadCount: 0, // REST API doesn't include unread count
  };
}

export function useChatUsers({ adminId, enabled = true }: UseChatUsersParams): UseChatUsersReturn {
  // Separate state for active chats (WebSocket) and all players (REST API)
  const [activeChats, setActiveChats] = useState<ChatUser[]>([]);
  const [allPlayers, setAllPlayers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For WebSocket connection
  const [isLoadingAllPlayers, setIsLoadingAllPlayers] = useState(false); // For REST API
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // ✅ PERFORMANCE: Cache for fetchAllPlayers (5 min TTL)
  const playersCacheRef = useRef<{ data: ChatUser[]; timestamp: number } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
        !IS_PROD && console.log('✅ Chat list WebSocket connected');
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

          // ✅ IGNORE typing events - they should not update the chat list
          const messageType = data.type || data.message?.type;
          if (messageType === 'typing') {
            !IS_PROD && console.log('⌨️ [Chat List WS] Typing event received - ignoring for chat list');
            return; // Don't update chat list for typing events
          }

          // Handle "add_new_chats" message type
          if (data.message && data.message.type === 'add_new_chats' && Array.isArray(data.message.chats)) {
            const chatList = data.message.chats;
            const transformedUsers = chatList.map(transformChatToUser);
            !IS_PROD && console.log(`✅ [Chat List WS] Received ${transformedUsers.length} chat users`);
            setActiveChats(transformedUsers);
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
          // Fallback for other formats
          else if (data.chats && Array.isArray(data.chats)) {
            const transformedUsers = data.chats.map(transformChatToUser);
            !IS_PROD && console.log(`✅ [Chat List WS] Received ${transformedUsers.length} chat users (fallback format)`);
            setActiveChats(transformedUsers);
            setIsLoading(false);
          }
          // Handle single chat update
          else if (data.chat_id || (data.player && data.player.id)) {
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

      ws.onerror = (error) => {
        console.error('❌ Chat list WebSocket error:', error);
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

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (wsRef.current) {
      console.log('🔌 Disconnecting chat list WebSocket');
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Fetch active chats via REST API (primary method when WebSocket is disabled)
   * Used for polling to keep chat list updated
   */
  const fetchActiveChatsREST = useCallback(async () => {
    if (!adminId) return;

    try {
      const token = storage.get(TOKEN_KEY);
      const response = await fetch(`/api/chat-list?user_id=${adminId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        console.error('❌ [REST API] Failed to fetch active chats:', response.status);
        // Only set error if it's a real backend error (not 404 or backend not ready)
        if (response.status !== 404) {
          setError(`Failed to fetch chats: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      !IS_PROD && console.log('📥 [REST API] Response received');
      
      // ✅ Clear any previous errors since REST API is working
      setError(null);
      
      // Handle different response formats
      let chats: any[] | null = null;
      if (data.chats && Array.isArray(data.chats)) {
        chats = data.chats;
      } else if (data.users && Array.isArray(data.users)) {
        chats = data.users;
      } else if (Array.isArray(data)) {
        chats = data;
      }

      if (Array.isArray(chats)) {
        const transformedUsers = chats.map(transformChatToUser);

        if (transformedUsers.length === 0) {
          !IS_PROD && console.log('ℹ️ [REST API] Empty chat list response - preserving existing active chats');
          return;
        }

        !IS_PROD && console.log(`🔄 [REST API] Updated ${transformedUsers.length} active chats`);
        setActiveChats(transformedUsers);
      } else {
        !IS_PROD && console.log('ℹ️ [REST API] Unexpected chat list payload - keeping existing data');
      }
    } catch (err) {
      console.error('❌ [REST API] Error:', err);
      // Only set error if we couldn't fetch at all
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch chats';
      setError(errorMessage);
    }
  }, [adminId]);

  const refetch = useCallback(() => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  /**
   * Fetch ALL players from REST API endpoint
   * ✅ PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   */
  const fetchAllPlayers = useCallback(async () => {
    // Set loading state IMMEDIATELY before any checks
    !IS_PROD && console.log('🚀 fetchAllPlayers - Starting');
    setIsLoadingAllPlayers(true);
    
    try {
      // ✅ PERFORMANCE: Check cache first
      const now = Date.now();
      if (playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        !IS_PROD && console.log('✅ Using cached players data, count:', playersCacheRef.current.data.length);
        setAllPlayers(playersCacheRef.current.data);
        // Small delay to show skeleton briefly even with cache
        await new Promise(resolve => setTimeout(resolve, 150));
        return;
      }

      setError(null);
      !IS_PROD && console.log('📥 Fetching all players via REST API...');

      const token = storage.get(TOKEN_KEY);
      const response = await fetch('/api/chat-all-players?page=1&page_size=50', { // ✅ PERFORMANCE: Reduced from 100 to 50
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
      !IS_PROD && console.log(`📊 REST API returned ${data.results?.length || 0} of ${data.count || 0} players`);

      if (data.results && Array.isArray(data.results)) {
        const transformedUsers = data.results.map(transformPlayerToUser);
        setAllPlayers(transformedUsers);
        
        // ✅ PERFORMANCE: Update cache
        playersCacheRef.current = {
          data: transformedUsers,
          timestamp: now,
        };
      } else {
        console.warn('⚠️ No results array in response');
        setAllPlayers([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all players';
      console.error('❌ Error fetching all players:', errorMessage);
      setError(errorMessage);
    } finally {
      !IS_PROD && console.log('🏁 fetchAllPlayers - Complete');
      setIsLoadingAllPlayers(false); // Use separate loading state
    }
  }, [CACHE_TTL]);

  // Connect on mount and setup polling
  useEffect(() => {
    if (enabled && adminId) {
      // WebSocket connection is disabled
      connect(); // This will just log and return early
      
      // ✅ Fetch chat list immediately
      fetchActiveChatsREST();
      
      // ✅ Setup polling to keep chat list updated (every 10 seconds)
      const POLL_INTERVAL = 10000; // 10 seconds
      pollIntervalRef.current = setInterval(() => {
        !IS_PROD && console.log('🔄 [REST API] Polling for chat updates...');
        fetchActiveChatsREST();
      }, POLL_INTERVAL);
      
      !IS_PROD && console.log(`✅ Chat list polling enabled (every ${POLL_INTERVAL / 1000}s)`);
    }

    return () => {
      disconnect();
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        !IS_PROD && console.log('🛑 Chat list polling stopped');
      }
    };
  }, [enabled, adminId, connect, disconnect, fetchActiveChatsREST]);

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
    !IS_PROD && console.log(`📝 Updating chat list - userId: ${userId}, chatId: ${chatId}, lastMessage: ${lastMessage.substring(0, 30)}...`);
    
    setActiveChats((prevChats) => {
      // Find and update the matching chat
      const chatIndex = prevChats.findIndex(
        (chat) => chat.id === chatId || chat.user_id === userId
      );
      
      if (chatIndex === -1) {
        // Chat not found in active chats - this could be a new conversation
        // The WebSocket should send an update to add it, but we can log this
        !IS_PROD && console.log(`⚠️ Chat not found in active chats list - waiting for WebSocket update`);
        return prevChats;
      }
      
      // Create updated chat list with the new last message
      const updatedChats = [...prevChats];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        lastMessage,
        lastMessageTime,
      };
      
      // Move updated chat to the top of the list for better UX
      const [updatedChat] = updatedChats.splice(chatIndex, 1);
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

  return {
    users: activeChats, // For backward compatibility - return active chats as "users"
    allPlayers,
    onlineUsers,
    isLoading,
    isLoadingAllPlayers,
    error,
    refetch,
    fetchAllPlayers,
    updateChatLastMessage,
  };
}

