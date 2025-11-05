/**
 * WebSocket Hook for Real-Time Processing Notifications
 * 
 * This hook manages WebSocket connections to receive real-time updates
 * for transaction queue processing activities.
 * 
 * @see /WEBSOCKET_IMPLEMENTATION.md for detailed documentation
 * 
 * @example
 * ```tsx
 * const { isConnected, error } = useProcessingWebSocket({
 *   enabled: true,
 *   onQueueUpdate: (queue) => {
 *     console.log('New queue:', queue);
 *   },
 * });
 * ```
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/constants/api';
import type { TransactionQueue } from '@/types';

export interface WebSocketMessage {
  type: 'processing_update' | 'queue_update' | 'send_notification' | 'connection' | 'error';
  data?: TransactionQueue;
  message?: string;
  queues?: TransactionQueue[];
  title?: string;
  game_title?: string;
  transaction_id?: string;
}

interface UseProcessingWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onQueueUpdate?: (queue: TransactionQueue) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseProcessingWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  sendMessage: (message: unknown) => void;
  disconnect: () => void;
  connect: () => void;
}

/**
 * Custom hook for managing WebSocket connection to processing notifications
 * 
 * @example
 * ```tsx
 * const { isConnected, error } = useProcessingWebSocket({
 *   enabled: true,
 *   onQueueUpdate: (queue) => {
 *     console.log('Queue updated:', queue);
 *     // Update your store here
 *   },
 * });
 * ```
 */
export function useProcessingWebSocket({
  enabled = true,
  onMessage,
  onQueueUpdate,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: UseProcessingWebSocketOptions = {}): UseProcessingWebSocketReturn {
  const { user, isAuthenticated } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const getWebSocketUrl = useCallback((): string | null => {
    if (!user?.username) {
      console.warn('⚠️ Cannot create WebSocket URL: username not available');
      return null;
    }

    // Convert HTTP/HTTPS to WS/WSS
    const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${baseUrl}/ws/notifications/${user.username}/?type=processing`;
    
    console.log('🔌 WebSocket URL:', wsUrl);
    return wsUrl;
  }, [user?.username]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    shouldReconnectRef.current = false;
    
    // Clear all timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (wsRef.current) {
      const ws = wsRef.current;
      const currentState = ws.readyState;
      
      console.log('🔌 Current WebSocket state:', {
        0: 'CONNECTING',
        1: 'OPEN',
        2: 'CLOSING',
        3: 'CLOSED'
      }[currentState]);
      
      // Remove event listeners before closing
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      
      // Only close if not already closed or closing
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        try {
          ws.close(1000, 'Client disconnecting'); // Normal closure
        } catch (err) {
          console.warn('⚠️ Error closing WebSocket:', err);
        }
      }
      
      wsRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  const handleReconnect = useCallback(() => {
    if (!shouldReconnectRef.current) {
      console.log('🔌 Reconnection disabled, skipping...');
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      setError(`Failed to connect after ${maxReconnectAttempts} attempts`);
      setIsConnecting(false);
      return;
    }

    reconnectAttemptsRef.current += 1;
    setReconnectAttempts(reconnectAttemptsRef.current);
    
    const delay = Math.min(reconnectInterval * reconnectAttemptsRef.current, 30000);
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      if (shouldReconnectRef.current && !wsRef.current) {
        connect();
      }
    }, delay);
  }, [reconnectInterval, maxReconnectAttempts]);

  const connect = useCallback(() => {
    // Don't connect if already connected or connecting
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.OPEN) {
        console.log('⚠️ WebSocket already connected');
        return;
      }
      if (state === WebSocket.CONNECTING) {
        console.log('⚠️ WebSocket already connecting, please wait...');
        return;
      }
      // If CLOSING or CLOSED, clean up first
      if (state === WebSocket.CLOSING || state === WebSocket.CLOSED) {
        console.log('🔄 Cleaning up previous WebSocket instance...');
        wsRef.current = null;
      }
    }

    if (!enabled || !isAuthenticated) {
      console.log('⚠️ WebSocket connection not enabled or user not authenticated');
      return;
    }

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      console.error('❌ Cannot create WebSocket: invalid URL');
      setError('Cannot create WebSocket connection: user not authenticated');
      return;
    }

    try {
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      setIsConnecting(true);
      setError(null);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set connection timeout (10 seconds)
      connectionTimeoutRef.current = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error('❌ WebSocket connection timeout');
          setError('Connection timeout');
          setIsConnecting(false);
          
          try {
            ws.close();
          } catch (err) {
            console.warn('⚠️ Error closing timed-out WebSocket:', err);
          }
          
          wsRef.current = null;
          
          // Attempt reconnection
          if (shouldReconnectRef.current) {
            handleReconnect();
          }
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        
        onConnect?.();
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
        });
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        onDisconnect?.();

        // Attempt reconnection if it wasn't a clean close
        if (!event.wasClean && shouldReconnectRef.current) {
          handleReconnect();
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        
        // Clear connection timeout
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setError('WebSocket connection error');
        setIsConnecting(false);
        
        onError?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('📨 WebSocket message received:', message);

          // Call the generic message handler (this will pass the message to the component)
          onMessage?.(message);

          // Handle specific message types
          if (message.type === 'processing_update' || message.type === 'queue_update') {
            if (message.data) {
              onQueueUpdate?.(message.data);
            } else if (message.queues && Array.isArray(message.queues)) {
              // Handle bulk queue updates
              message.queues.forEach((queue) => onQueueUpdate?.(queue));
            }
          } else if (message.type === 'send_notification') {
            // Handle send_notification type - this is for new game activities
            console.log('📨 New game activity notification:', message);
            if (message.data) {
              onQueueUpdate?.(message.data);
            }
          }
        } catch (err) {
          console.error('❌ Failed to parse WebSocket message:', err, event.data);
        }
      };
    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
      
      if (shouldReconnectRef.current) {
        handleReconnect();
      }
    }
  }, [
    enabled,
    isAuthenticated,
    getWebSocketUrl,
    onMessage,
    onQueueUpdate,
    onConnect,
    onDisconnect,
    onError,
    handleReconnect,
  ]);

  const sendMessage = useCallback((message: unknown) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
      return;
    }

    try {
      const payload = JSON.stringify(message);
      wsRef.current.send(payload);
      console.log('📤 Message sent:', message);
    } catch (err) {
      console.error('❌ Failed to send message:', err);
    }
  }, []);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && isAuthenticated) {
      console.log('🔌 Initiating WebSocket connection...');
      shouldReconnectRef.current = true;
      connect();
    }

    // Cleanup on unmount or when conditions change
    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isAuthenticated]);

  return {
    isConnected,
    isConnecting,
    error,
    reconnectAttempts,
    sendMessage,
    disconnect,
    connect,
  };
}

