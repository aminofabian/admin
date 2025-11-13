import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatMessage, WebSocketMessage } from '@/types';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';
const MESSAGES_PER_PAGE = 20;

type HistoryMergeMode = 'prepend' | 'replace';

const ensurePositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

interface HistoryPayload {
  messages: ChatMessage[];
  page: number;
  totalPages: number;
}

const mapHistoryMessage = (msg: any): ChatMessage => {
  const sender: 'player' | 'admin' =
    msg.sender === 'company' || msg.sender === 'admin' ? 'admin' : 'player';

  const timestamp = msg.sent_time ?? msg.timestamp ?? new Date().toISOString();
  const messageDate = new Date(timestamp);

  return {
    id: String(msg.id ?? msg.message_id ?? Date.now()),
    text: msg.message ?? '',
    sender,
    timestamp: messageDate.toISOString(),
    date: messageDate.toISOString().split('T')[0],
    time: messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isRead: msg.is_read ?? true,
    userId: msg.sender_id,
    type: msg.type,
    isComment: msg.is_comment ?? false,
    isFile: msg.is_file ?? false,
    fileExtension: msg.file_extension ?? undefined,
    fileUrl: msg.file || msg.file_url || undefined,
    userBalance: msg.user_balance ?? msg.balance,
    isPinned: msg.is_pinned ?? msg.isPinned ?? false,
  };
};

const normalizeHistoryMessages = (rawMessages: any[]): ChatMessage[] =>
  rawMessages.map(mapHistoryMessage).reverse();

const mergeMessageLists = (
  incoming: ChatMessage[],
  existing: ChatMessage[],
  mode: HistoryMergeMode,
): ChatMessage[] => {
  const combined = mode === 'prepend' ? [...incoming, ...existing] : incoming;
  const deduped = new Map<string, ChatMessage>();

  combined.forEach((message) => {
    if (deduped.has(message.id)) {
      return;
    }
    deduped.set(message.id, message);
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    return leftTime - rightTime;
  });
};

interface UseChatWebSocketParams {
  userId: number | null;
  chatId: string | null; // The chatroom ID for fetching message history
  adminId: number;
  enabled: boolean;
  onMessageReceived?: (message: ChatMessage) => void; // Callback to update chat list
}

interface UseChatWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  isUserOnline: boolean;
  sendMessage: (text: string) => void;
  markAsRead: (messageId: string) => void;
  markAllAsRead: () => void;
  connectionError: string | null;
  purchaseHistory: ChatMessage[];
  fetchPurchaseHistory: () => Promise<void>;
  isPurchaseHistoryLoading: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  hasMoreHistory: boolean;
  isHistoryLoading: boolean;
  updateMessagePinnedState: (messageId: string, pinned: boolean) => void;
  refreshMessages: () => Promise<void>;
}

export function useChatWebSocket({
  userId,
  chatId,
  adminId,
  enabled,
  onMessageReceived,
}: UseChatWebSocketParams): UseChatWebSocketReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<ChatMessage[]>([]);
  const [isPurchaseHistoryLoading, setIsPurchaseHistoryLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 0, totalPages: 0 });
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const historyRequestRef = useRef(0);
  const purchaseRequestRef = useRef(0);
  const activeConnectionKeyRef = useRef('');
  
  // Use ref to avoid reconnecting WebSocket when callback changes
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    setMessages([]);
    setPurchaseHistory([]);
    setIsTyping(false);
    setIsUserOnline(false);
    setIsHistoryLoading(false);
    setHasMoreHistory(false);
    setHistoryPagination({ page: 0, totalPages: 0 });

    if (enabled) {
      setConnectionError(null);
    }
  }, [chatId, userId, enabled]);

  const requestHistory = useCallback(async (page: number): Promise<HistoryPayload | null> => {
    if (!chatId && !userId) {
      return null;
    }

    try {
      !IS_PROD && console.log('📜 Fetching message history...', { chatId, userId, page });

      const token = storage.get(TOKEN_KEY);
      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return null;
      }

      const params = new URLSearchParams({
        per_page: String(MESSAGES_PER_PAGE),
        page: String(page),
      });

      if (chatId) {
        params.append('chatroom_id', chatId);
      }

      if (userId) {
        params.append('user_id', String(userId));
      }

      const response = await fetch(`/api/chat-messages?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch message history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
        });

        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Authentication failed - redirecting to login');
          storage.clear();
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }

        return null;
      }

      const data = await response.json();
      const requestedPage = ensurePositiveInteger(page, 1);
      const resolvedPage = ensurePositiveInteger(
        data.page ?? data.current_page,
        requestedPage,
      );

      const resolvedTotalPages = ensurePositiveInteger(
        data.total_pages ?? data.totalPages ?? data.page_count,
        resolvedPage,
      );

      const payload: HistoryPayload = {
        messages: Array.isArray(data.messages) ? normalizeHistoryMessages(data.messages) : [],
        page: resolvedPage,
        totalPages: resolvedTotalPages,
      };

      !IS_PROD && console.log(
        `✅ Loaded ${payload.messages.length} of ${data.total_count ?? payload.messages.length} messages (page ${payload.page}/${payload.totalPages})`,
      );

      return payload;
    } catch (error) {
      console.error('❌ Failed to fetch message history:', error);
      return null;
    }
  }, [chatId, userId]);

  const fetchMessageHistory = useCallback(
    async (page: number, mode: HistoryMergeMode): Promise<number> => {
      if (!chatId && !userId) {
        return 0;
      }

      const requestId = historyRequestRef.current + 1;
      historyRequestRef.current = requestId;
      setIsHistoryLoading(true);

      try {
        const payload = await requestHistory(page);
        if (!payload) {
          return 0;
        }

        if (historyRequestRef.current !== requestId) {
          !IS_PROD && console.log('⚠️ Ignoring stale message history response');
          return 0;
        }

        let added = 0;
        setMessages((prev) => {
          const merged = mergeMessageLists(payload.messages, prev, mode);
          added = merged.length - prev.length;
          return merged;
        });

        setHistoryPagination({
          page: payload.page,
          totalPages: payload.totalPages,
        });
        setHasMoreHistory(payload.page < payload.totalPages);

        return added;
      } finally {
        if (historyRequestRef.current === requestId) {
          setIsHistoryLoading(false);
        }
      }
    },
    [chatId, userId, requestHistory],
  );

  const loadOlderMessages = useCallback(async () => {
    if (isHistoryLoading) {
      return { added: 0 };
    }

    const currentPage = Number.isFinite(historyPagination.page)
      ? historyPagination.page
      : 0;
    const nextPage = currentPage > 0 ? currentPage + 1 : 1;

    if (currentPage > 0 && !hasMoreHistory) {
      return { added: 0 };
    }

    const mode: HistoryMergeMode = currentPage > 0 ? 'prepend' : 'replace';
    const added = await fetchMessageHistory(nextPage, mode);
    return { added };
  }, [fetchMessageHistory, hasMoreHistory, historyPagination.page, isHistoryLoading]);

  // ✅ Fetch purchase/transaction history for the chatroom
  const fetchPurchaseHistory = useCallback(async () => {
    if (!chatId && !userId) return;

    const requestId = purchaseRequestRef.current + 1;
    purchaseRequestRef.current = requestId;

    try {
      setIsPurchaseHistoryLoading(true);
      !IS_PROD && console.log(`💰 Fetching purchase history...`, { chatId, userId });
      
      const token = storage.get(TOKEN_KEY);
      
      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return;
      }
      
      // ✅ Try chatId first (could be chatroom_id), fallback to userId (player_id)
      const params = new URLSearchParams();
      if (chatId) params.append('chatroom_id', chatId);
      if (userId) params.append('user_id', String(userId));
      
      const response = await fetch(`/api/chat-purchases?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch purchase history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
        });
        
        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Authentication failed - redirecting to login');
          storage.clear();
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }
        return;
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        // ✅ Transform purchase messages from new JWT endpoint format
        const purchases: ChatMessage[] = data.messages.map((msg: any) => {
          // Determine sender: "company" = admin, "player" = player
          const sender: 'player' | 'admin' = 
            msg.sender === 'company' || msg.sender === 'admin'
              ? 'admin' 
              : 'player';
          
          const timestamp = msg.sent_time || new Date().toISOString();
          const messageDate = new Date(timestamp);

          return {
            id: String(msg.id),
            text: msg.message || '',
            sender,
            timestamp: messageDate.toISOString(),
            date: messageDate.toISOString().split('T')[0],
            time: messageDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isRead: true, // Purchase history is always marked as read
            userId: msg.sender_id,
            type: msg.type, // 'message' or other transaction types
            isComment: msg.is_comment || false,
            isFile: msg.is_file || false,
            fileUrl: msg.file || undefined,
          };
        });

        !IS_PROD && console.log(`✅ Loaded ${purchases.length} purchase records (total: ${data.total_count || purchases.length})`);
        if (purchaseRequestRef.current !== requestId) {
          !IS_PROD && console.log('⚠️ Ignoring stale purchase history response');
          return;
        }

        setPurchaseHistory(purchases.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('❌ Failed to fetch purchase history:', error);
    } finally {
      setIsPurchaseHistoryLoading(false);
    }
  }, [chatId, userId]); // Include userId in dependency array

  const connect = useCallback(() => {
    if (!userId || !enabled) return;

    try {
      const connectionKey = `${userId}:${chatId ?? 'none'}`;
      activeConnectionKeyRef.current = connectionKey;

      // Build WebSocket URL
      const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const roomName = `P${userId}Chat`;
      const wsUrl = `${wsBaseUrl}/ws/cschat/${roomName}/?user_id=${adminId}`;

      !IS_PROD && console.log('🔌 Connecting to chat WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (activeConnectionKeyRef.current !== connectionKey) {
          !IS_PROD && console.log('⚠️ Stale WebSocket open event ignored');
          ws.close();
          return;
        }

        !IS_PROD && console.log('✅ Chat WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Fetch message history after connecting
        void fetchMessageHistory(1, 'replace');
      };

      ws.onmessage = (event) => {
        if (activeConnectionKeyRef.current !== connectionKey) {
          !IS_PROD && console.log('⚠️ Ignoring message from stale WebSocket connection');
          return;
        }

        try {
          const rawData = JSON.parse(event.data);
          !IS_PROD && console.log('📨 Received WebSocket message:', {
            type: rawData.type,
            message: rawData.message?.substring(0, 50),
            sender: rawData.is_player_sender ? 'player' : 'admin',
            timestamp: rawData.sent_time,
            userBalance: rawData.user_balance,
          });

          // Handle different message types from backend
          const messageType = rawData.type;

          if (messageType === 'message') {
            // Determine sender based on backend fields
            const isPlayerSender = rawData.is_player_sender ?? true;
            const sender: 'player' | 'admin' = isPlayerSender ? 'player' : 'admin';
            
            // Parse timestamp
            const timestamp = rawData.sent_time || rawData.timestamp || new Date().toISOString();
            const messageDate = new Date(timestamp);

            const newMessage: ChatMessage = {
              id: rawData.id || rawData.message_id || Date.now().toString(),
              text: rawData.message || '',
              sender,
              timestamp: messageDate.toISOString(),
              date: messageDate.toISOString().split('T')[0],
              time: messageDate.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isRead: false,
              userId: rawData.sender_id || rawData.player_id,
              // Include additional metadata from the backend
              isFile: rawData.is_file || false,
              fileExtension: rawData.file_extension || undefined,
              fileUrl: rawData.file || rawData.file_url || undefined,
              isComment: rawData.is_comment || false,
              isPinned: rawData.is_pinned ?? false,
            };

            !IS_PROD && console.log('✅ Parsed message and adding to state:', {
              id: newMessage.id,
              text: newMessage.text.substring(0, 50),
              sender: newMessage.sender,
              time: newMessage.time,
              isFile: newMessage.isFile,
              userBalance: rawData.user_balance,
            });
            
            // ✅ Check for duplicate messages before adding
            setMessages((prev) => {
              // Prevent duplicate messages by checking if message with same ID exists
              const isDuplicate = prev.some(msg => msg.id === newMessage.id);
              if (isDuplicate) {
                !IS_PROD && console.log('⚠️ Duplicate message detected, skipping:', newMessage.id);
                return prev;
              }
              
              const updated = [...prev, newMessage];
              !IS_PROD && console.log(`📝 Messages state updated: ${prev.length} -> ${updated.length} messages`);
              return updated;
            });
            
            // ✅ Update user balance if provided in the message
            if (rawData.user_balance !== undefined) {
              !IS_PROD && console.log('💰 User balance update:', rawData.user_balance);
              // You can emit this to a balance update callback if needed
            }
            
            // Notify parent component to update chat list (ONLY for actual messages, not typing)
            !IS_PROD && console.log('🔔 Calling onMessageReceived callback...');
            if (onMessageReceivedRef.current) {
              onMessageReceivedRef.current(newMessage);
              !IS_PROD && console.log('✅ onMessageReceived callback executed');
            } else {
              !IS_PROD && console.warn('⚠️ onMessageReceived callback is not defined');
            }
          } else if (messageType === 'typing') {
            !IS_PROD && console.log('⌨️ User is typing...');
            setIsTyping(true);
            // ✅ Clear typing indicator after 3 seconds
            setTimeout(() => setIsTyping(false), 3000);
            
            // ✅ IMPORTANT: Do NOT call onMessageReceived for typing events
            // This prevents the chat list from updating when user is just typing
          } else if (messageType === 'mark_message_as_read' || messageType === 'read') {
            const messageId = rawData.message_id || rawData.id;
            const senderId = rawData.sender_id;
            const isPlayerSender = rawData.is_player_sender ?? true;
            
            if (messageId) {
              // Mark specific message as read
              !IS_PROD && console.log('✅ Message marked as read:', messageId);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId ? { ...msg, isRead: true } : msg
                )
              );
            } else if (senderId) {
              // When a user reads messages, mark all messages from the OTHER side as read
              // If admin (is_player_sender: false) read, mark all player messages as read
              // If player (is_player_sender: true) read, mark all admin messages as read
              const targetSender: 'player' | 'admin' = isPlayerSender ? 'admin' : 'player';
              !IS_PROD && console.log(`✅ Marking all ${targetSender} messages as read (read by ${isPlayerSender ? 'player' : 'admin'} with sender_id: ${senderId})`);
              setMessages((prev) =>
                prev.map((msg) => {
                  // Mark messages from the opposite sender as read
                  if (msg.sender === targetSender) {
                    return { ...msg, isRead: true };
                  }
                  return msg;
                })
              );
            }
          } else if (messageType === 'live_status') {
            const isActive = rawData.is_active ?? false;
            const playerId = rawData.player_id;
            
            !IS_PROD && console.log(`🟢 Live status: ${rawData.username || `Player ${playerId}`} is ${isActive ? 'ONLINE' : 'OFFLINE'}`);
            
            // Update online status if this is the player we're chatting with
            if (String(playerId) === String(userId)) {
              setIsUserOnline(isActive);
            }
          } else if (messageType === 'error') {
            console.error('❌ WebSocket error message:', rawData.error || rawData.message);
            setConnectionError(rawData.error || rawData.message || 'Unknown error');
          } else {
            !IS_PROD && console.log('ℹ️ Unhandled message type:', messageType);
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Chat WebSocket error:', error);
        // Don't set blocking error - just log it
      };

      ws.onclose = (event) => {
        if (activeConnectionKeyRef.current !== connectionKey) {
          return;
        }

        !IS_PROD && console.log('🔌 Chat WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Don't attempt reconnection if backend returned 404 or similar
        if (event.code === 1006 || event.code === 1001) {
          !IS_PROD && console.log('⚠️ Backend WebSocket not available, using REST API fallback');
          return;
        }

        // ✅ PERFORMANCE: Exponential backoff reconnection with max attempts
        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          !IS_PROD && console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          !IS_PROD && console.log('⚠️ Max reconnection attempts reached, using REST API fallback');
        }
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }, [userId, chatId, adminId, enabled, fetchMessageHistory]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      !IS_PROD && console.log('🔌 Disconnecting chat WebSocket');
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    reconnectAttemptsRef.current = 0;
  }, []);

  const sendMessage = useCallback((text: string) => {
    // ✅ Try WebSocket first, fallback to REST API if not connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        // Send message via WebSocket
        const message = {
          type: 'message',
          sender_id: adminId,
          is_player_sender: false,
          message: text,
          sent_time: new Date().toISOString(),
        };

        wsRef.current.send(JSON.stringify(message));
        !IS_PROD && console.log('📤 Sent message via WebSocket - waiting for confirmation');
        return;
      } catch (error) {
        console.error('❌ Failed to send via WebSocket, trying REST API:', error);
      }
    }

    // Fallback to REST API if WebSocket is not available
    !IS_PROD && console.log('📤 WebSocket not available, sending via REST API...');
    
    fetch(`${API_BASE_URL}/api/v1/chat/send/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${storage.get(TOKEN_KEY)}`,
      },
      body: JSON.stringify({
        sender_id: adminId,
        receiver_id: userId,
        message: text,
        is_player_sender: false,
        sent_time: new Date().toISOString(),
      }),
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            console.error('🚨 Authentication failed - redirecting to login');
            storage.clear();
            if (typeof window !== 'undefined') {
              window.location.replace('/login');
            }
          }
          throw new Error(`Failed to send message: ${response.status}`);
        }
        !IS_PROD && console.log('✅ Message sent successfully via REST API');
        
        // Add the message to local state for instant feedback
        const messageDate = new Date();
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text,
          sender: 'admin',
          timestamp: messageDate.toISOString(),
          date: messageDate.toISOString().split('T')[0],
          time: messageDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isRead: false,
          userId: adminId,
          isPinned: false,
        };

        setMessages((prev) => [...prev, newMessage]);
        
        if (onMessageReceivedRef.current) {
          onMessageReceivedRef.current(newMessage);
        }
      })
      .catch(error => {
        console.error('❌ Failed to send message:', error);
        setConnectionError('Failed to send message. Please try again.');
      });
  }, [adminId, userId]);

  const markAsRead = useCallback((messageId: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      const message = {
        type: 'mark_message_as_read',
        sender_id: adminId,
        is_player_sender: false,
        message_id: messageId,
      };

      wsRef.current.send(JSON.stringify(message));
      !IS_PROD && console.log('✅ Marked message as read:', messageId);
    } catch (error) {
      console.error('❌ Failed to mark message as read:', error);
    }
  }, [adminId]);

  const markAllAsRead = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      !IS_PROD && console.log('⚠️ Cannot mark all as read: WebSocket not connected');
      return;
    }

    try {
      // Send mark_message_as_read without message_id to mark all player messages as read
      const message = {
        type: 'mark_message_as_read',
        sender_id: adminId,
        is_player_sender: false,
      };

      wsRef.current.send(JSON.stringify(message));
      !IS_PROD && console.log('✅ Sent mark all as read message to backend');
    } catch (error) {
      console.error('❌ Failed to mark all messages as read:', error);
    }
  }, [adminId]);

  const updateMessagePinnedState = useCallback((messageId: string, pinned: boolean) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, isPinned: pinned } : message,
      ),
    );
  }, []);

  // Refresh the latest messages to get real IDs from backend
  const refreshMessages = useCallback(async () => {
    if (!chatId && !userId) {
      return;
    }

    !IS_PROD && console.log('🔄 Refreshing messages to get real IDs...');
    // Fetch page 1 (latest messages) and merge with existing, replacing temporary IDs
    await fetchMessageHistory(1, 'replace');
  }, [chatId, userId, fetchMessageHistory]);

  // Connect/disconnect based on enabled state and userId
  useEffect(() => {
    if (enabled && userId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, userId, connect, disconnect]);

  return {
    messages,
    isConnected,
    isTyping,
    isUserOnline,
    sendMessage,
    markAsRead,
    markAllAsRead,
    connectionError,
    purchaseHistory,
    fetchPurchaseHistory,
    isPurchaseHistoryLoading,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading,
    updateMessagePinnedState,
    refreshMessages,
  };
}

