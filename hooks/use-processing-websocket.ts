import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { WEBSOCKET_BASE_URL } from '@/lib/constants/api';
import { websocketManager, createWebSocketUrl, type WebSocketListeners } from '@/lib/websocket-manager';
import type { TransactionQueue, Transaction } from '@/types';

export interface ProcessingCounts {
  purchase_count?: number;
  cashout_count?: number;
  game_activities_count?: number;
}

export interface WebSocketMessage {
  type: 'all_activities' | 'send_notification' | 'connection' | 'error';
  message?: string;
  title?: string;
  purchase_data?: any[] | any;
  cashout_data?: any[] | any;
  game_activities_data?: any[] | any;
  activity_type?: 'purchase' | 'cashout' | 'game_activity';
  data?: any;
  counts?: ProcessingCounts;
}

interface UseProcessingWebSocketOptions {
  enabled?: boolean;
  onMessage?: (message: WebSocketMessage) => void;
  onQueueUpdate?: (queue: TransactionQueue, isInitialLoad?: boolean) => void;
  onTransactionUpdate?: (transaction: Transaction, isInitialLoad?: boolean) => void;
  onCountsUpdate?: (counts: ProcessingCounts) => void;
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
    created_at: rawPurchase.created_at || rawPurchase.created || nestedData?.created_at || nestedData?.created || new Date().toISOString(),
    updated_at: rawPurchase.updated_at || rawPurchase.updated || nestedData?.updated_at || nestedData?.updated || new Date().toISOString(),
    payment_url: rawPurchase.payment_url || nestedData?.payment_url || null,
    invoice_url: rawPurchase.invoice_url || nestedData?.invoice_url,
  };
}

function transformCashoutToTransaction(rawCashout: any): Transaction {
  const userData = rawCashout.user && typeof rawCashout.user === 'object' ? rawCashout.user : null;
  const nestedData = rawCashout.data && typeof rawCashout.data === 'object' ? rawCashout.data : null;
  
  // Extract payment_details from various possible locations
  // Check rawCashout first, then nestedData, ensuring it's an object if present
  const paymentDetails = (rawCashout.payment_details && typeof rawCashout.payment_details === 'object') 
    ? rawCashout.payment_details 
    : (nestedData?.payment_details && typeof nestedData.payment_details === 'object')
      ? nestedData.payment_details
      : null;
  
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
    created_at: rawCashout.created_at || rawCashout.created || nestedData?.created_at || nestedData?.created || new Date().toISOString(),
    updated_at: rawCashout.updated_at || rawCashout.updated || nestedData?.updated_at || nestedData?.updated || new Date().toISOString(),
    payment_url: rawCashout.payment_url || nestedData?.payment_url || null,
    invoice_url: rawCashout.invoice_url || nestedData?.invoice_url,
    payment_details: paymentDetails,
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
  
  // Normalize amount to string (handle both string and number types)
  let normalizedAmount: string;
  if (typeof rawActivity.amount === 'number') {
    normalizedAmount = String(rawActivity.amount);
  } else if (rawActivity.amount != null && rawActivity.amount !== '') {
    normalizedAmount = String(rawActivity.amount);
  } else if (rawActivity.get_total_amount != null) {
    normalizedAmount = String(rawActivity.get_total_amount);
  } else {
    normalizedAmount = '0';
  }
  
  // Normalize bonus_amount to string if it exists (handle both string and number types)
  // Check both bonus_amount and bonus fields for compatibility
  let normalizedBonusAmount: string | undefined;
  const bonusValue = rawActivity.bonus_amount ?? rawActivity.bonus;
  if (bonusValue != null) {
    if (typeof bonusValue === 'number') {
      normalizedBonusAmount = String(bonusValue);
    } else if (bonusValue !== '') {
      normalizedBonusAmount = String(bonusValue);
    }
  }
  
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
    amount: normalizedAmount,
    bonus_amount: normalizedBonusAmount,
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
  onCountsUpdate,
  onConnect,
  onDisconnect,
  onError,
  reconnectInterval = 3000,
  maxReconnectAttempts = 10,
}: UseProcessingWebSocketOptions = {}): UseProcessingWebSocketReturn {
  const { user, isAuthenticated } = useAuth();

  // WebSocket management refs
  const wsUrlRef = useRef<string>('');
  const listenersRef = useRef<Set<WebSocketListeners>>(new Set());
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

    // Fix security issue: encode username to prevent injection
    const encodedUsername = encodeURIComponent(user.username);
    const wsUrl = createWebSocketUrl(WEBSOCKET_BASE_URL, `/ws/notifications/${encodedUsername}/`);

    console.log('🔌 WebSocket URL:', wsUrl);
    return wsUrl;
  }, [user?.username]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting WebSocket...');
    shouldReconnectRef.current = false;

    if (wsUrlRef.current) {
      // Disconnect all listeners for this URL
      listenersRef.current.forEach(listeners => {
        websocketManager.disconnect(wsUrlRef.current, listeners);
      });
      listenersRef.current.clear();
    }

    setIsConnected(false);
    setIsConnecting(false);
    setError(null);
  }, []);

  
  const connect = useCallback(() => {
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
      console.log('🔌 Connecting to managed WebSocket:', wsUrl);
      setIsConnecting(true);
      setError(null);
      wsUrlRef.current = wsUrl;

      // Create listeners for processing WebSocket
      const listeners: WebSocketListeners = {
        onOpen: () => {
          console.log('✅ Processing WebSocket connected');
          setIsConnected(true);
          setIsConnecting(false);
          setError(null);
          setReconnectAttempts(0);
          onConnect?.();
        },
        onMessage: (data) => {
          try {
            // Type assertion for WebSocket message data
            const message = data as WebSocketMessage;
            console.log('📨 Processing WebSocket message received:', message.type);

            onMessage?.(message);

            if (message.type === 'all_activities') {
              const counts: ProcessingCounts = message.counts || {
                purchase_count: message.purchase_data?.length || 0,
                cashout_count: message.cashout_data?.length || 0,
                game_activities_count: message.game_activities_data?.length || 0,
              };

              console.log('📦 All activities message received:', counts);
              onCountsUpdate?.(counts);

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
              });

              if (message.counts) {
                console.log('📊 Counts update received in notification:', message.counts);
                onCountsUpdate?.(message.counts);
              }

              if (message.purchase_data && typeof message.purchase_data === 'object' && !Array.isArray(message.purchase_data)) {
                const transaction = transformPurchaseToTransaction(message.purchase_data);
                onTransactionUpdate?.(transaction);
                return;
              }

              if (message.cashout_data && typeof message.cashout_data === 'object' && !Array.isArray(message.cashout_data)) {
                // Merge payment_details from message level if present and not already in cashout_data
                const cashoutData = { ...message.cashout_data };
                if ((message as any).payment_details && !cashoutData.payment_details) {
                  cashoutData.payment_details = (message as any).payment_details;
                }
                const transaction = transformCashoutToTransaction(cashoutData);
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
                    console.log('📦 Using message itself as game activity data');
                  } else {
                    console.warn('⚠️ Game activity detected but no data found');
                    return;
                  }
                }

                const queue = transformActivityToQueue(gameActivityData);

                if (!queue.id) {
                  console.error('❌ Transformed queue has no ID!');
                  return;
                }

                if (!onQueueUpdate) {
                  console.error('❌ onQueueUpdate callback is not defined!');
                  return;
                }

                onQueueUpdate(queue);
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
                const queue = transformActivityToQueue(message.data);
                onQueueUpdate?.(queue);
                return;
              }

              if (message.activity_type === 'purchase' && message.data) {
                const transaction = transformPurchaseToTransaction(message.data);
                onTransactionUpdate?.(transaction);
              } else if (message.activity_type === 'cashout' && message.data) {
                // Merge payment_details from message level if present and not already in data
                const cashoutData = { ...message.data };
                if ((message as any).payment_details && !cashoutData.payment_details) {
                  cashoutData.payment_details = (message as any).payment_details;
                }
                const transaction = transformCashoutToTransaction(cashoutData);
                onTransactionUpdate?.(transaction);
              } else if (message.data && !message.activity_type) {
                const data = message.data;
                if (data.game_title || data.game || data.game_code || data.operation_type ||
                    data.type === 'recharge_game' || data.type === 'redeem_game' ||
                    data.type === 'add_user_game' || data.type === 'create_game') {
                  const queue = transformActivityToQueue(data);
                  onQueueUpdate?.(queue);
                } else if (data.type === 'purchase' || data.type === 'cashout') {
                  if (data.type === 'purchase') {
                    const transaction = transformPurchaseToTransaction(data);
                    onTransactionUpdate?.(transaction);
                  } else if (data.type === 'cashout') {
                    // Merge payment_details from message level if present and not already in data
                    const cashoutData = { ...data };
                    if ((message as any).payment_details && !cashoutData.payment_details) {
                      cashoutData.payment_details = (message as any).payment_details;
                    }
                    const transaction = transformCashoutToTransaction(cashoutData);
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
            console.error('❌ Failed to parse WebSocket message:', err);
          }
        },
        onError: (error) => {
          console.error('❌ Processing WebSocket error:', error);
          setError('WebSocket connection error');
          setIsConnecting(false);
          onError?.(error);
        },
        onClose: (event) => {
          console.log('🔌 Processing WebSocket closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          });
          setIsConnected(false);
          setIsConnecting(false);
          onDisconnect?.();
        },
      };

      listenersRef.current.add(listeners);

      // Connect through manager with standardized configuration
      websocketManager.connect({
        url: wsUrl,
        maxReconnectAttempts: maxReconnectAttempts,
        baseDelay: reconnectInterval,
        maxDelay: 30000,
        connectionTimeout: 10000,
      }, listeners);

    } catch (err) {
      console.error('❌ Failed to create WebSocket:', err);
      setError('Failed to create WebSocket connection');
      setIsConnecting(false);
    }
  }, [
    enabled,
    isAuthenticated,
    getWebSocketUrl,
    onMessage,
    onQueueUpdate,
    onTransactionUpdate,
    onCountsUpdate,
    onConnect,
    onDisconnect,
    onError,
    reconnectInterval,
    maxReconnectAttempts,
  ]);

  const sendMessage = useCallback((message: unknown) => {
    if (!wsUrlRef.current) {
      console.warn('⚠️ Cannot send message: WebSocket URL not available');
      return;
    }

    const success = websocketManager.send(wsUrlRef.current, message);
    if (success) {
      console.log('📤 Message sent via manager:', message);
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
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
  }, [enabled, isAuthenticated, disconnect]);

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
