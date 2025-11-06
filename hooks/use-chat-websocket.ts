import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatMessage, WebSocketMessage } from '@/types';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

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
  connectionError: string | null;
  purchaseHistory: ChatMessage[];
  fetchPurchaseHistory: () => Promise<void>;
  isPurchaseHistoryLoading: boolean;
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
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  
  // Use ref to avoid reconnecting WebSocket when callback changes
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  // ✅ PERFORMANCE: Fetch recent message history (optimized to 20 messages)
  const fetchMessageHistory = useCallback(async () => {
    if (!chatId) return;

    try {
      !IS_PROD && console.log(`📜 Fetching message history for chatroom ${chatId}...`);
      
      const token = storage.get(TOKEN_KEY);
      
      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return;
      }
      
      !IS_PROD && console.log('🔑 Using token:', token.substring(0, 20) + '...');
      
      // ✅ PERFORMANCE: Reduced from 50 to 20 messages (most recent conversations)
      const response = await fetch(`/api/chat-messages?chatroom_id=${chatId}&per_page=20`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include', // Important: sends cookies to Next.js API route
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch message history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
        });
        
        if (response.status === 401) {
          console.error('🚨 Authentication failed. You may need to log out and log back in to refresh your session cookies.');
        }
        return;
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        // ✅ PERFORMANCE: Memoized transformation logic
        const historyMessages: ChatMessage[] = data.messages.map((msg: any) => {
          const sender: 'player' | 'admin' = 
            msg.sender === 'company' || msg.sender === 'admin' || msg.sender_id === adminId 
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
            isRead: msg.is_read ?? true,
            userId: msg.sender_id,
          };
        });

        !IS_PROD && console.log(`✅ Loaded ${historyMessages.length} messages from history`);
        setMessages(historyMessages.reverse());
      }
    } catch (error) {
      console.error('❌ Failed to fetch message history:', error);
    }
  }, [chatId, adminId]);

  // ✅ Fetch purchase/transaction history for the chatroom
  const fetchPurchaseHistory = useCallback(async () => {
    if (!chatId) return;

    try {
      setIsPurchaseHistoryLoading(true);
      !IS_PROD && console.log(`💰 Fetching purchase history for chatroom ${chatId}...`);
      
      const token = storage.get(TOKEN_KEY);
      
      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return;
      }
      
      const response = await fetch(`/api/chat-purchases?chatroom_id=${chatId}`, {
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
        
        if (response.status === 401) {
          console.error('🚨 Authentication failed. You may need to log out and log back in to refresh your session cookies.');
        }
        return;
      }

      const data = await response.json();
      
      if (data.messages && Array.isArray(data.messages)) {
        // Transform purchase messages to ChatMessage format
        const purchases: ChatMessage[] = data.messages.map((msg: any) => {
          const sender: 'player' | 'admin' = 
            msg.sender === 'company' || msg.sender === 'admin' || msg.sender_id === adminId 
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
            type: msg.type, // 'balanceUpdated' or other transaction types
            isComment: msg.is_comment ?? false,
          };
        });

        !IS_PROD && console.log(`✅ Loaded ${purchases.length} purchase records`);
        setPurchaseHistory(purchases.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('❌ Failed to fetch purchase history:', error);
    } finally {
      setIsPurchaseHistoryLoading(false);
    }
  }, [chatId, adminId]);

  const connect = useCallback(() => {
    if (!userId || !enabled) return;

    try {
      // Build WebSocket URL
      const wsBaseUrl = API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://');
      const roomName = `P${userId}Chat`;
      const wsUrl = `${wsBaseUrl}/ws/cschat/${roomName}/?user_id=${adminId}`;

      !IS_PROD && console.log('🔌 Connecting to chat WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        !IS_PROD && console.log('✅ Chat WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Fetch message history after connecting
        fetchMessageHistory();
      };

      ws.onmessage = (event) => {
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
              isComment: rawData.is_comment || false,
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
            if (messageId) {
              !IS_PROD && console.log('✅ Message marked as read:', messageId);
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === messageId ? { ...msg, isRead: true } : msg
                )
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
  }, [userId, adminId, enabled, fetchMessageHistory]);

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
    connectionError,
    purchaseHistory,
    fetchPurchaseHistory,
    isPurchaseHistoryLoading,
  };
}

