import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser } from '@/types';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

// Performance constants
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for REST API
const REFRESH_INTERVAL = 60 * 1000; // Auto-refresh every 60 seconds
const WS_RECONNECT_DELAY = 5000; // 5 seconds reconnect delay

interface UseOnlinePlayersParams {
  adminId: number;
  enabled?: boolean;
}

interface UseOnlinePlayersReturn {
  onlinePlayers: ChatUser[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isConnected: boolean; // WebSocket connection status
}

/**
 * Transform REST API data to ChatUser format
 * Handles multiple formats:
 * 1. Chat objects from 'chats' array: {id: chatroom_id, player_id: user_id, player_username: ...}
 * 2. Chat objects with nested player: {chat_id: ..., player: {id: user_id, ...}}
 * 3. Direct player objects: {id: user_id, username: ...}
 */
function transformPlayerToUser(data: any): ChatUser {
  // Format 1: Chats array format - player data is at root level with 'player_' prefix
  if (data.player_id && data.player_username) {
    return {
      id: String(data.id || ''), // chatroom_id
      user_id: Number(data.player_id || 0),
      username: data.player_username || data.player_full_name || 'Unknown',
      fullName: data.player_full_name || undefined,
      email: data.player_email || '',
      avatar: data.player_profile_pic || undefined,
      isOnline: true, // Players in online list are online
      lastMessage: data.last_message || undefined,
      lastMessageTime: data.last_message_timestamp || data.last_message_time || undefined,
      balance: undefined, // Not included in chats format
      winningBalance: undefined,
      gamesPlayed: undefined,
      winRate: undefined,
      phone: undefined,
      unreadCount: data.unread_messages_count || data.unread_message_count || 0,
    };
  }
  
  // Format 2 & 3: Chat object with nested player OR direct player object
  const hasNestedPlayer = data.player && typeof data.player === 'object';
  const player = hasNestedPlayer ? data.player : data;
  
  return {
    // Use chat_id/chatroom_id if available, otherwise fall back to player.id
    id: String(data.chat_id || data.chatroom_id || data.id || player.id || ''),
    user_id: Number(player.id || data.player_id || 0),
    username: player.username || player.full_name || 'Unknown',
    fullName: player.full_name || player.name || undefined,
    email: player.email || '',
    avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
    isOnline: player.is_online !== undefined ? Boolean(player.is_online) : true,
    lastMessage: data.last_message || undefined,
    lastMessageTime: data.last_message_time || undefined,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
    gamesPlayed: player.games_played || undefined,
    winRate: player.win_rate || undefined,
    phone: player.phone_number || player.mobile_number || undefined,
    unreadCount: data.unread_message_count || 0,
  };
}

/**
 * ✨ OPTIMIZED HOOK: Combines REST API + WebSocket for real-time online players
 * 
 * Strategy:
 * 1. Initial load: Fetch from REST API (fast, cached)
 * 2. Real-time updates: Listen to WebSocket for status changes
 * 3. Periodic refresh: Auto-refresh from API every 60s for accuracy
 * 4. Smart caching: Cache REST responses to minimize API calls
 */
export function useOnlinePlayers({ adminId, enabled = true }: UseOnlinePlayersParams): UseOnlinePlayersReturn {
  const [onlinePlayers, setOnlinePlayers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const cacheRef = useRef<{ data: ChatUser[]; timestamp: number } | null>(null);
  const isMountedRef = useRef(true);
  
  /**
   * Fetch online players from REST API
   * ✅ PERFORMANCE: Cached for 2 minutes
   */
  const fetchFromApi = useCallback(async (forceRefresh = false): Promise<ChatUser[]> => {
    const now = Date.now();
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && cacheRef.current && (now - cacheRef.current.timestamp) < CACHE_TTL) {
      !IS_PROD && console.log('✅ [Online Players] Using cached data');
      return cacheRef.current.data;
    }
    
    try {
      !IS_PROD && console.log('📥 [Online Players] Fetching from REST API...');
      
      const token = storage.get(TOKEN_KEY);
      const response = await fetch('/api/chat-online-players', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      !IS_PROD && console.log('📊 [Online Players] API response:', data);

      // Parse different response formats
      // ✅ IMPORTANT: Check 'chats' FIRST - it has the correct chatroom_id mapping
      let players: any[] = [];
      if (Array.isArray(data)) {
        players = data;
      } else if (data.chats && Array.isArray(data.chats)) {
        // ✅ PRIORITY: Use chats array - it has proper chat_id + player data
        players = data.chats;
        !IS_PROD && console.log('📋 [Online Players] Using chats array format');
      } else if (data.players && Array.isArray(data.players)) {
        players = data.players;
      } else if (data.results && Array.isArray(data.results)) {
        players = data.results;
      } else if (data.online_players && Array.isArray(data.online_players)) {
        players = data.online_players;
      } else if (data.player && Array.isArray(data.player)) {
        // Fallback: Use player array if chats not available
        players = data.player;
        !IS_PROD && console.log('📋 [Online Players] Using player array format (fallback)');
      }

      const transformedPlayers = players.map(transformPlayerToUser);
      
      // Log first player to verify transformation
      if (!IS_PROD && transformedPlayers.length > 0) {
        console.log('🔍 [Online Players] Sample transformed player:', {
          id: transformedPlayers[0].id,
          user_id: transformedPlayers[0].user_id,
          username: transformedPlayers[0].username,
        });
      }
      
      // Update cache
      cacheRef.current = {
        data: transformedPlayers,
        timestamp: now,
      };
      
      !IS_PROD && console.log(`✅ [Online Players] Loaded ${transformedPlayers.length} players from API`);
      return transformedPlayers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch online players';
      console.error('❌ [Online Players] API error:', errorMessage);
      throw err;
    }
  }, []);

  /**
   * Connect to WebSocket for real-time status updates
   * ✅ PERFORMANCE: Only updates player status, doesn't re-fetch entire list
   */
  const connectWebSocket = useCallback(() => {
    if (!enabled || !adminId || wsRef.current) return;

    try {
      const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const wsUrl = `${wsBaseUrl}/ws/chatlist/?user_id=${adminId}`;

      !IS_PROD && console.log('🔌 [Online Players] Connecting to WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        !IS_PROD && console.log('✅ [Online Players] WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const messageType = data.type || data.message?.type;
          
          // ✅ PERFORMANCE: Only process live_status messages for online players
          if (messageType === 'live_status') {
            const playerId = Number(data.player_id || data.message?.player_id);
            const isActive = Boolean(data.is_active ?? data.message?.is_active);
            
            !IS_PROD && console.log(`🟢 [Online Players] Status update: Player ${playerId} is ${isActive ? 'ONLINE' : 'OFFLINE'}`);
            
            setOnlinePlayers((prev) => {
              if (isActive) {
                // Player came online - add if not already present
                const exists = prev.some(p => p.user_id === playerId);
                if (!exists) {
                  !IS_PROD && console.log(`➕ [Online Players] Adding player ${playerId} to online list`);
                  // We might not have full player data, so we need to fetch it
                  // For now, we'll trigger a background refresh
                  return prev;
                }
                return prev;
              } else {
                // Player went offline - remove from list
                const filtered = prev.filter(p => p.user_id !== playerId);
                if (filtered.length !== prev.length) {
                  !IS_PROD && console.log(`➖ [Online Players] Removed player ${playerId} from online list`);
                }
                return filtered;
              }
            });
          }
          // Also handle full chat list updates if available
          else if (data.message?.type === 'add_new_chats' && Array.isArray(data.message.chats)) {
            !IS_PROD && console.log('🔄 [Online Players] Received full chat list update');
            // Extract online players from chat list
            const onlineFromChats = data.message.chats
              .filter((chat: any) => chat.player?.is_online)
              .map((chat: any) => transformPlayerToUser(chat.player));
            
            if (onlineFromChats.length > 0) {
              setOnlinePlayers((prev) => {
                // Merge with existing, deduplicate by user_id
                const merged = new Map<number, ChatUser>();
                prev.forEach(p => merged.set(p.user_id, p));
                onlineFromChats.forEach((p: ChatUser) => merged.set(p.user_id, p));
                return Array.from(merged.values());
              });
            }
          }
        } catch (err) {
          console.error('❌ [Online Players] WebSocket message parse error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ [Online Players] WebSocket error:', error);
      };

      ws.onclose = (event) => {
        !IS_PROD && console.log('🔌 [Online Players] WebSocket closed:', event.code);
        setIsConnected(false);
        wsRef.current = null;

        // Reconnect if still enabled
        if (enabled && isMountedRef.current && !reconnectTimeoutRef.current) {
          !IS_PROD && console.log(`🔄 [Online Players] Reconnecting in ${WS_RECONNECT_DELAY}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, WS_RECONNECT_DELAY);
        }
      };
    } catch (err) {
      console.error('❌ [Online Players] Failed to create WebSocket:', err);
    }
  }, [adminId, enabled]);

  /**
   * Disconnect WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      !IS_PROD && console.log('🔌 [Online Players] Disconnecting WebSocket');
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Fetch/refresh online players
   */
  const refetch = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const players = await fetchFromApi(true); // Force refresh
      if (isMountedRef.current) {
        setOnlinePlayers(players);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch online players';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [enabled, fetchFromApi]);

  /**
   * Initial load and periodic refresh
   */
  useEffect(() => {
    if (!enabled || !adminId) return;

    // Initial load
    (async () => {
      setIsLoading(true);
      try {
        const players = await fetchFromApi(false);
        if (isMountedRef.current) {
          setOnlinePlayers(players);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch online players';
        if (isMountedRef.current) {
          setError(errorMessage);
        }
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    })();

    // ✅ PERFORMANCE: Auto-refresh every 60 seconds
    refreshIntervalRef.current = setInterval(() => {
      !IS_PROD && console.log('🔄 [Online Players] Auto-refreshing...');
      fetchFromApi(true).then((players) => {
        if (isMountedRef.current) {
          setOnlinePlayers(players);
        }
      }).catch((err) => {
        console.error('❌ [Online Players] Auto-refresh failed:', err);
      });
    }, REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [enabled, adminId, fetchFromApi]);

  /**
   * WebSocket connection management
   */
  useEffect(() => {
    if (enabled && adminId) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [enabled, adminId, connectWebSocket, disconnectWebSocket]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    onlinePlayers,
    isLoading,
    error,
    refetch,
    isConnected,
  };
}
