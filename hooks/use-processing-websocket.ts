import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { API_BASE_URL } from '@/lib/constants/api';
import type { TransactionQueue, Transaction } from '@/types';

export interface WebSocketMessage {
  type: 'all_activities' | 'send_notification' | 'connection' | 'error';
  message?: string;
  title?: string;
  purchase_data?: any[] | any;
  cashout_data?: any[] | any;
  game_activities_data?: any[] | any;
  activity_type?: 'purchase' | 'cashout' | 'game_activity';
  data?: any;
}

interface UseProcessingWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onQueueUpdate?: (queue: TransactionQueue, isInitialLoad?: boolean) => void;
  onTransactionUpdate?: (transaction: Transaction, isInitialLoad?: boolean) => void;
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

function transformPurchaseToTransaction(rawPurchase: any): Transaction {
  const userData = rawPurchase.user && typeof rawPurchase.user === 'object' ? rawPurchase.user : null;
  const nestedData = rawPurchase.data && typeof rawPurchase.data === 'object' ? rawPurchase.data : null;
  
  return {
    id: rawPurchase.id || rawPurchase.transaction_id || nestedData?.id || nestedData?.transaction_id || '',
    user_username: rawPurchase.user_username || userData?.username || userData?.user_username || nestedData?.user_username || rawPurchase.username || nestedData?.username || '',
    user_email: rawPurchase.user_email || userData?.email || userData?.user_email || nestedData?.user_email || rawPurchase.email || nestedData?.email || '',
    amount: String(rawPurchase.amount || nestedData?.amount || 0),
    bonus_amount: rawPurchase.bonus_amount || nestedData?.bonus_amount ? String(rawPurchase.bonus_amount || nestedData?.bonus_amount) : '',
    status: rawPurchase.status || nestedData?.status || 'pending',
    type: 'purchase',
    operator: rawPurchase.operator || nestedData?.operator || '',
    payment_method: rawPurchase.payment_method || nestedData?.payment_method || rawPurchase.operator || nestedData?.operator || '',
    currency: rawPurchase.currency || nestedData?.currency || 'USD',
    description: rawPurchase.description || nestedData?.description || '',
    journal_entry: 'credit',
    previous_balance: String(rawPurchase.previous_balance || nestedData?.previous_balance || 0),
    new_balance: String(rawPurchase.new_balance || nestedData?.new_balance || 0),
    previous_winning_balance: String(rawPurchase.previous_winning_balance || nestedData?.previous_winning_balance || 0),
    new_winning_balance: String(rawPurchase.new_winning_balance || nestedData?.new_winning_balance || 0),
    unique_id: rawPurchase.unique_id || nestedData?.unique_id || rawPurchase.id || nestedData?.id || '',
    role: rawPurchase.role || nestedData?.role || '',
    action: rawPurchase.action || nestedData?.action || '',
    remarks: rawPurchase.remarks || nestedData?.remarks || null,
    created: rawPurchase.created || rawPurchase.created_at || nestedData?.created || nestedData?.created_at || new Date().toISOString(),
    updated: rawPurchase.updated || rawPurchase.updated_at || nestedData?.updated || nestedData?.updated_at || new Date().toISOString(),
    payment_url: rawPurchase.payment_url || nestedData?.payment_url || null,
    invoice_url: rawPurchase.invoice_url || nestedData?.invoice_url,
  };
}

function transformCashoutToTransaction(rawCashout: any): Transaction {
  const userData = rawCashout.user && typeof rawCashout.user === 'object' ? rawCashout.user : null;
  const nestedData = rawCashout.data && typeof rawCashout.data === 'object' ? rawCashout.data : null;
  
  return {
    id: rawCashout.id || rawCashout.transaction_id || nestedData?.id || nestedData?.transaction_id || '',
    user_username: rawCashout.user_username || userData?.username || userData?.user_username || nestedData?.user_username || rawCashout.username || nestedData?.username || '',
    user_email: rawCashout.user_email || userData?.email || userData?.user_email || nestedData?.user_email || rawCashout.email || nestedData?.email || '',
    amount: String(rawCashout.amount || nestedData?.amount || 0),
    bonus_amount: rawCashout.bonus_amount || nestedData?.bonus_amount ? String(rawCashout.bonus_amount || nestedData?.bonus_amount) : '',
    status: rawCashout.status || nestedData?.status || 'pending',
    type: 'cashout',
    operator: rawCashout.operator || nestedData?.operator || '',
    payment_method: rawCashout.payment_method || nestedData?.payment_method || rawCashout.operator || nestedData?.operator || '',
    currency: rawCashout.currency || nestedData?.currency || 'USD',
    description: rawCashout.description || nestedData?.description || '',
    journal_entry: 'debit',
    previous_balance: String(rawCashout.previous_balance || nestedData?.previous_balance || 0),
    new_balance: String(rawCashout.new_balance || nestedData?.new_balance || 0),
    previous_winning_balance: String(rawCashout.previous_winning_balance || nestedData?.previous_winning_balance || 0),
    new_winning_balance: String(rawCashout.new_winning_balance || nestedData?.new_winning_balance || 0),
    unique_id: rawCashout.unique_id || nestedData?.unique_id || rawCashout.id || nestedData?.id || '',
    role: rawCashout.role || nestedData?.role || '',
    action: rawCashout.action || nestedData?.action || '',
    remarks: rawCashout.remarks || nestedData?.remarks || null,
    created: rawCashout.created || rawCashout.created_at || nestedData?.created || nestedData?.created_at || new Date().toISOString(),
    updated: rawCashout.updated || rawCashout.updated_at || nestedData?.updated || nestedData?.updated_at || new Date().toISOString(),
    payment_url: rawCashout.payment_url || nestedData?.payment_url || null,
    invoice_url: rawCashout.invoice_url || nestedData?.invoice_url,
  };
}

function transformActivityToQueue(rawActivity: any): TransactionQueue {
  // Extract nested data object if it exists, otherwise use the raw activity
  const nestedData = rawActivity.data && typeof rawActivity.data === 'object' ? rawActivity.data : null;
  
  // Merge nested data properties into the main data object for easier access
  // This ensures new_credits_balance and new_winning_balance are accessible at activity.data.new_credits_balance
  const mergedData = {
    ...rawActivity,
    ...(nestedData || {}),
  };
  
  return {
    id: rawActivity.id || rawActivity.transaction_id || '',
    type: rawActivity.operation_type || rawActivity.type || 'recharge_game',
    status: rawActivity.status || 'pending',
    user_id: rawActivity.user_id || 0,
    user_username: rawActivity.user_username || rawActivity.username || '',
    user_email: rawActivity.user_email || rawActivity.email || '',
    operator: rawActivity.operator || '',
    game_username: rawActivity.get_usergame_username || rawActivity.game_username || rawActivity.data?.username || '',
    game: rawActivity.game_title || rawActivity.game || '',
    game_code: rawActivity.game_code || '',
    amount: String(rawActivity.amount || rawActivity.get_total_amount || 0),
    bonus_amount: rawActivity.bonus ? String(rawActivity.bonus) : undefined,
    new_game_balance: rawActivity.new_game_balance,
    remarks: rawActivity.remarks || '',
    data: mergedData,
    created_at: rawActivity.created_at || rawActivity.created || new Date().toISOString(),
    updated_at: rawActivity.updated_at || rawActivity.updated || new Date().toISOString(),
  };
}

export function useProcessingWebSocket({
  enabled = true,
  onMessage,
  onQueueUpdate,
  onTransactionUpdate,
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

    const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
    const wsUrl = `${baseUrl}/ws/notifications/${user.username}/`;
    
    console.log('🔌 WebSocket URL:', wsUrl);
    return wsUrl;
  }, [user?.username]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    shouldReconnectRef.current = false;
    
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
      
      ws.onopen = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onmessage = null;
      
      if (currentState === WebSocket.OPEN || currentState === WebSocket.CONNECTING) {
        try {
          ws.close(1000, 'Client disconnecting');
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
          
          if (shouldReconnectRef.current) {
            handleReconnect();
          }
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ WebSocket connected');
        
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
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        
        setIsConnected(false);
        setIsConnecting(false);
        wsRef.current = null;
        
        onDisconnect?.();

        if (!event.wasClean && shouldReconnectRef.current) {
          handleReconnect();
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        
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
          console.log('📨 WebSocket message received:', message.type);

          onMessage?.(message);

          if (message.type === 'all_activities') {
            console.log('📦 All activities message received:', {
              purchase_count: message.purchase_data?.length || 0,
              cashout_count: message.cashout_data?.length || 0,
              game_activities_count: message.game_activities_data?.length || 0,
            });

            if (message.purchase_data && Array.isArray(message.purchase_data)) {
              message.purchase_data.forEach((rawPurchase) => {
                const transaction = transformPurchaseToTransaction(rawPurchase);
                onTransactionUpdate?.(transaction, true);
              });
            }

            if (message.cashout_data && Array.isArray(message.cashout_data)) {
              message.cashout_data.forEach((rawCashout) => {
                const transaction = transformCashoutToTransaction(rawCashout);
                onTransactionUpdate?.(transaction, true);
              });
            }

            if (message.game_activities_data && Array.isArray(message.game_activities_data)) {
              message.game_activities_data.forEach((rawActivity) => {
                const queue = transformActivityToQueue(rawActivity);
                onQueueUpdate?.(queue, true);
              });
            }
          } 
          else if (message.type === 'send_notification') {
            console.log('📨 Notification received:', {
              activity_type: message.activity_type,
              hasData: !!message.data,
              dataKeys: message.data ? Object.keys(message.data) : [],
              fullMessage: message,
            });
            
            if (message.purchase_data && typeof message.purchase_data === 'object' && !Array.isArray(message.purchase_data)) {
              const transaction = transformPurchaseToTransaction(message.purchase_data);
              onTransactionUpdate?.(transaction);
              return;
            }
            
            if (message.cashout_data && typeof message.cashout_data === 'object' && !Array.isArray(message.cashout_data)) {
              const transaction = transformCashoutToTransaction(message.cashout_data);
              onTransactionUpdate?.(transaction);
              return;
            }
            
            const activityType = String(message.activity_type || '').toLowerCase().trim();
            if (activityType === 'game_activity' || activityType === 'gameactivity') {
              const msg = message as any;
              let gameActivityData = msg.game_activities_data || message.data;
              
              if (!gameActivityData) {
                if (msg.operation_type || msg.game_title || msg.game || msg.game_code || msg.id) {
                  gameActivityData = msg;
                  console.log('📦 Using message itself as game activity data (no game_activities_data or data)');
                } else {
                  console.warn('⚠️ Game activity detected but no data found:', {
                    activity_type: message.activity_type,
                    messageKeys: Object.keys(message),
                    hasGameActivitiesData: !!msg.game_activities_data,
                    hasData: !!message.data,
                  });
                  return;
                }
              }
              
              console.log('🎮 Game activity notification detected (activity_type=game_activity):', {
                hasGameActivitiesData: !!msg.game_activities_data,
                hasMessageData: !!message.data,
                usingMessageAsData: gameActivityData === message,
                dataKeys: gameActivityData ? Object.keys(gameActivityData) : [],
                queueId: gameActivityData?.id || gameActivityData?.transaction_id,
                status: gameActivityData?.status,
              });
              
              const queue = transformActivityToQueue(gameActivityData);
              
              if (!queue.id) {
                console.error('❌ Transformed queue has no ID!', {
                  rawData: gameActivityData,
                  transformedQueue: queue,
                });
                return;
              }
              
              console.log('✅ Transformed game activity queue - ID:', queue.id, 'Status:', queue.status, 'Type:', queue.type);
              
              if (!onQueueUpdate) {
                console.error('❌ onQueueUpdate callback is not defined!');
                return;
              }
              
              console.log('📞 Calling onQueueUpdate with queue:', queue.id);
              onQueueUpdate(queue);
              console.log('✅ onQueueUpdate called for game activity:', queue.id);
              return;
            }
            
            const hasGameActivityData = message.data && (
              message.data.operation_type || 
              message.data.type === 'recharge_game' || 
              message.data.type === 'redeem_game' || 
              message.data.type === 'add_user_game' ||
              message.data.type === 'create_game' ||
              message.data.game_title ||
              message.data.game ||
              message.data.game_code
            );
            
            if (!message.activity_type && hasGameActivityData) {
              console.log('🎮 Game activity detected by data structure (no activity_type):', {
                dataKeys: message.data ? Object.keys(message.data) : [],
              });
              const queue = transformActivityToQueue(message.data);
              console.log('✅ Transformed game activity queue - ID:', queue.id, 'Status:', queue.status);
              onQueueUpdate?.(queue);
              return;
            }
            
            if (message.activity_type === 'purchase' && message.data) {
              const transaction = transformPurchaseToTransaction(message.data);
              onTransactionUpdate?.(transaction);
            } else if (message.activity_type === 'cashout' && message.data) {
              const transaction = transformCashoutToTransaction(message.data);
              onTransactionUpdate?.(transaction);
            } else if (message.data && !message.activity_type) {
              const data = message.data;
              if (data.game_title || data.game || data.game_code || data.operation_type || 
                  data.type === 'recharge_game' || data.type === 'redeem_game' || 
                  data.type === 'add_user_game' || data.type === 'create_game') {
                console.log('🎮 Fallback: Detected game activity from data structure');
                const queue = transformActivityToQueue(data);
                onQueueUpdate?.(queue);
              } else if (data.type === 'purchase' || data.type === 'cashout') {
                if (data.type === 'purchase') {
                  const transaction = transformPurchaseToTransaction(data);
                  onTransactionUpdate?.(transaction);
                } else if (data.type === 'cashout') {
                  const transaction = transformCashoutToTransaction(data);
                  onTransactionUpdate?.(transaction);
                }
              } else {
                console.warn('⚠️ Unrecognized send_notification format:', {
                  activity_type: message.activity_type,
                  hasData: !!message.data,
                  dataKeys: message.data ? Object.keys(message.data) : [],
                  message: message.message,
                });
              }
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
    onTransactionUpdate,
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

  useEffect(() => {
    if (enabled && isAuthenticated) {
      console.log('🔌 Initiating WebSocket connection...');
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      disconnect();
    };
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
