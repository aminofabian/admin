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
          !IS_PROD && console.log('📨 Received WebSocket message:', data);

          // Handle "add_new_chats" message type
          if (data.message && data.message.type === 'add_new_chats' && Array.isArray(data.message.chats)) {
            const chatList = data.message.chats;
            const transformedUsers = chatList.map(transformChatToUser);
            !IS_PROD && console.log(`✅ Received ${transformedUsers.length} chat users from WebSocket`);
            setActiveChats(transformedUsers);
            setIsLoading(false);
          }
          // Handle "remove_chat_from_list" message type (format 1: wrapped in message)
          else if (data.message && data.message.type === 'remove_chat_from_list') {
            const chatIdToRemove = data.message.chat_id;
            !IS_PROD && console.log(`🗑️ Removing chat with ID: ${chatIdToRemove}`);
            setActiveChats((prevUsers) => 
              prevUsers.filter((user) => user.id !== String(chatIdToRemove))
            );
          }
          // Handle "remove_chat_from_list" message type (format 2: direct)
          else if (data.type === 'remove_chat_from_list') {
            const chatIdToRemove = data.chat_id;
            !IS_PROD && console.log(`🗑️ Removing chat with ID: ${chatIdToRemove}`);
            setActiveChats((prevUsers) => 
              prevUsers.filter((user) => user.id !== String(chatIdToRemove))
            );
          }
          // Fallback for other formats
          else if (data.chats && Array.isArray(data.chats)) {
            const transformedUsers = data.chats.map(transformChatToUser);
            !IS_PROD && console.log(`✅ Received ${transformedUsers.length} chat users`);
            setActiveChats(transformedUsers);
            setIsLoading(false);
          }
          else {
            !IS_PROD && console.log('ℹ️ Unknown message format:', data);
          }
        } catch (error) {
          console.error('❌ Failed to parse chat list WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Chat list WebSocket error:', error);
        setError('Failed to connect to chat service');
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
      setError('Failed to establish connection');
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
   * Fetch ALL players from REST API endpoint
   * ✅ PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   */
  const fetchAllPlayers = useCallback(async () => {
    // Set loading state IMMEDIATELY before any checks
    console.log('🚀 fetchAllPlayers - Setting isLoadingAllPlayers to TRUE');
    setIsLoadingAllPlayers(true);
    
    try {
      // ✅ PERFORMANCE: Check cache first
      const now = Date.now();
      if (playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        console.log('✅ Using cached players data, count:', playersCacheRef.current.data.length);
        setAllPlayers(playersCacheRef.current.data);
        // Small delay to show skeleton briefly even with cache
        await new Promise(resolve => setTimeout(resolve, 150));
        console.log('⏱️ Cache delay complete, setting isLoadingAllPlayers to FALSE');
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
      console.log('🏁 fetchAllPlayers - Setting isLoadingAllPlayers to FALSE (finally)');
      setIsLoadingAllPlayers(false); // Use separate loading state
    }
  }, [CACHE_TTL]);

  // Connect on mount
  useEffect(() => {
    if (enabled && adminId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, adminId, connect, disconnect]);

  // ✅ PERFORMANCE: Memoize online users calculation (from active chats only)
  const onlineUsers = useMemo(() => {
    return activeChats.filter((user) => user.isOnline);
  }, [activeChats]);

  return {
    users: activeChats, // For backward compatibility - return active chats as "users"
    allPlayers,
    onlineUsers,
    isLoading,
    isLoadingAllPlayers,
    error,
    refetch,
    fetchAllPlayers,
  };
}

