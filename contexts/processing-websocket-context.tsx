'use client';

import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from 'react';
import { useProcessingWebSocket, type ProcessingCounts } from '@/hooks/use-processing-websocket';
import { transactionsApi } from '@/lib/api/transactions';
import type { TransactionQueue, Transaction } from '@/types';

// Fallback refresh interval when WebSocket is disconnected (30 seconds)
const FALLBACK_REFRESH_INTERVAL = 30000;

interface ProcessingWebSocketContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  counts: ProcessingCounts;
  isUsingFallback: boolean; // True when using API fallback instead of WebSocket
  refreshData: () => Promise<void>; // Manual refresh function
  subscribeToQueueUpdates: (callback: (queue: TransactionQueue, isInitialLoad?: boolean) => void) => () => void;
  subscribeToTransactionUpdates: (callback: (transaction: Transaction, isInitialLoad?: boolean) => void) => () => void;
  subscribeToMessages: (callback: (message: any) => void) => () => void;
}

const ProcessingWebSocketContext = createContext<ProcessingWebSocketContextValue | null>(null);

export function ProcessingWebSocketProvider({ children }: { children: ReactNode }) {
  const queueUpdateCallbacksRef = useRef<Set<(queue: TransactionQueue, isInitialLoad?: boolean) => void>>(new Set());
  const transactionUpdateCallbacksRef = useRef<Set<(transaction: Transaction, isInitialLoad?: boolean) => void>>(new Set());
  const messageCallbacksRef = useRef<Set<(message: any) => void>>(new Set());
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [counts, setCounts] = useState<ProcessingCounts>({
    purchase_count: 0,
    cashout_count: 0,
    game_activities_count: 0,
  });
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const handleQueueUpdate = useCallback((queue: TransactionQueue, isInitialLoad = false) => {
    queueUpdateCallbacksRef.current.forEach((callback) => {
      try {
        callback(queue, isInitialLoad);
      } catch (error) {
        console.error('Error in queue update callback:', error);
      }
    });
  }, []);

  const handleTransactionUpdate = useCallback((transaction: Transaction, isInitialLoad = false) => {
    transactionUpdateCallbacksRef.current.forEach((callback) => {
      try {
        callback(transaction, isInitialLoad);
      } catch (error) {
        console.error('Error in transaction update callback:', error);
      }
    });
  }, []);

  const handleMessage = useCallback((message: any) => {
    messageCallbacksRef.current.forEach((callback) => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in message callback:', error);
      }
    });
  }, []);

  const handleCountsUpdate = useCallback((newCounts: ProcessingCounts) => {
    setCounts(newCounts);
  }, []);

  /**
   * Fetch data via REST API as fallback when WebSocket is unavailable
   * This fetches pending purchases, pending cashouts, and processing game activities
   */
  const fetchDataViaApi = useCallback(async () => {
    if (isFetching) {
      console.log('⏭️ [Fallback] Already fetching, skipping...');
      return;
    }

    console.log('📡 [Fallback] Fetching data via REST API...');
    setIsFetching(true);

    try {
      // Fetch all pending data in parallel
      const [purchasesResponse, cashoutsResponse, queuesResponse] = await Promise.all([
        transactionsApi.listPurchases({ status: 'pending', page_size: 100 }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch purchases:', err);
          return { results: [], count: 0 };
        }),
        transactionsApi.listCashouts({ status: 'pending', page_size: 100 }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch cashouts:', err);
          return { results: [], count: 0 };
        }),
        transactionsApi.queuesProcessing({ page_size: 100 }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch queues:', err);
          return { results: [], count: 0 };
        }),
      ]);

      // Update counts
      const newCounts: ProcessingCounts = {
        purchase_count: purchasesResponse.count || purchasesResponse.results.length,
        cashout_count: cashoutsResponse.count || cashoutsResponse.results.length,
        game_activities_count: queuesResponse.count || queuesResponse.results.length,
      };
      setCounts(newCounts);

      console.log('📊 [Fallback] Data fetched:', {
        purchases: purchasesResponse.results.length,
        cashouts: cashoutsResponse.results.length,
        queues: queuesResponse.results.length,
      });

      // Notify subscribers with the fetched data (as initial load)
      purchasesResponse.results.forEach((purchase) => {
        const transaction: Transaction = {
          ...purchase,
          type: 'purchase',
        };
        handleTransactionUpdate(transaction, true);
      });

      cashoutsResponse.results.forEach((cashout) => {
        const transaction: Transaction = {
          ...cashout,
          type: 'cashout',
        };
        handleTransactionUpdate(transaction, true);
      });

      queuesResponse.results.forEach((queue) => {
        handleQueueUpdate(queue, true);
      });

      console.log('✅ [Fallback] Data refresh complete');
    } catch (error) {
      console.error('❌ [Fallback] Error fetching data:', error);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, handleTransactionUpdate, handleQueueUpdate]);

  /**
   * Called when WebSocket connection completely fails (max reconnection attempts reached)
   * Switches to fallback mode and starts periodic API polling
   */
  const handleConnectionFailed = useCallback(() => {
    console.log('⚠️ [Context] WebSocket connection failed, switching to API fallback mode');
    setIsUsingFallback(true);
    
    // Fetch initial data immediately
    fetchDataViaApi();
    
    // Start periodic refresh
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
    }
    fallbackIntervalRef.current = setInterval(() => {
      console.log('🔄 [Fallback] Auto-refreshing data...');
      fetchDataViaApi();
    }, FALLBACK_REFRESH_INTERVAL);
  }, [fetchDataViaApi]);

  /**
   * Called when WebSocket successfully connects
   * Disables fallback mode and stops periodic API polling
   */
  const handleConnect = useCallback(() => {
    console.log('✅ [Context] WebSocket connected, disabling fallback mode');
    setIsUsingFallback(false);
    
    // Stop periodic refresh
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
  }, []);

  const { isConnected, isConnecting, error, reconnectAttempts, hasConnectionFailed } = useProcessingWebSocket({
    enabled: true,
    onQueueUpdate: handleQueueUpdate,
    onTransactionUpdate: handleTransactionUpdate,
    onMessage: handleMessage,
    onCountsUpdate: handleCountsUpdate,
    onConnect: handleConnect,
    onConnectionFailed: handleConnectionFailed,
  });

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, []);

  // If WebSocket has failed and we haven't switched to fallback yet, do it now
  useEffect(() => {
    if (hasConnectionFailed && !isUsingFallback) {
      handleConnectionFailed();
    }
  }, [hasConnectionFailed, isUsingFallback, handleConnectionFailed]);

  const subscribeToQueueUpdates = useCallback(
    (callback: (queue: TransactionQueue, isInitialLoad?: boolean) => void) => {
      queueUpdateCallbacksRef.current.add(callback);
      return () => {
        queueUpdateCallbacksRef.current.delete(callback);
      };
    },
    []
  );

  const subscribeToTransactionUpdates = useCallback(
    (callback: (transaction: Transaction, isInitialLoad?: boolean) => void) => {
      transactionUpdateCallbacksRef.current.add(callback);
      return () => {
        transactionUpdateCallbacksRef.current.delete(callback);
      };
    },
    []
  );

  const subscribeToMessages = useCallback(
    (callback: (message: any) => void) => {
      messageCallbacksRef.current.add(callback);
      return () => {
        messageCallbacksRef.current.delete(callback);
      };
    },
    []
  );

  return (
    <ProcessingWebSocketContext.Provider
      value={{
        isConnected,
        isConnecting,
        error,
        reconnectAttempts,
        counts,
        isUsingFallback,
        refreshData: fetchDataViaApi,
        subscribeToQueueUpdates,
        subscribeToTransactionUpdates,
        subscribeToMessages,
      }}
    >
      {children}
    </ProcessingWebSocketContext.Provider>
  );
}

export function useProcessingWebSocketContext() {
  const context = useContext(ProcessingWebSocketContext);
  if (!context) {
    throw new Error('useProcessingWebSocketContext must be used within ProcessingWebSocketProvider');
  }
  return context;
}

