'use client';

import { createContext, useContext, useCallback, useRef, useState, useEffect, ReactNode } from 'react';
import { useProcessingWebSocket, type ProcessingCounts } from '@/hooks/use-processing-websocket';
import { transactionsApi } from '@/lib/api/transactions';
import type { TransactionQueue, Transaction } from '@/types';

// Adaptive polling intervals (in milliseconds)
const POLLING_INTERVALS = {
  FAST: 15000,      // 15s - when changes detected
  NORMAL: 30000,    // 30s - default
  SLOW: 60000,      // 60s - when no changes for a while
  MAX: 300000,      // 5min - maximum backoff on errors
} as const;

// Page size for polling (smaller to reduce server load)
const POLLING_PAGE_SIZE = 50;

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
  
  // Adaptive polling state
  const currentIntervalRef = useRef<number>(POLLING_INTERVALS.NORMAL);
  const consecutiveNoChangeRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);
  const lastDataHashRef = useRef<string>('');
  const isTabVisibleRef = useRef<boolean>(true);

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
   * Create a hash of the data to detect changes
   */
  const createDataHash = useCallback((data: { purchases: Transaction[]; cashouts: Transaction[]; queues: TransactionQueue[] }): string => {
    const purchaseIds = data.purchases.map(t => t.id).sort().join(',');
    const cashoutIds = data.cashouts.map(t => t.id).sort().join(',');
    const queueIds = data.queues.map(q => q.id).sort().join(',');
    return `${purchaseIds}|${cashoutIds}|${queueIds}`;
  }, []);

  /**
   * Fetch data via REST API as fallback when WebSocket is unavailable
   * This fetches pending purchases, pending cashouts, and processing game activities
   * Uses adaptive polling intervals based on changes detected
   */
  const fetchDataViaApi = useCallback(async () => {
    // Skip if tab is hidden (saves server resources)
    if (!isTabVisibleRef.current) {
      console.log('⏭️ [Fallback] Tab hidden, skipping poll...');
      return;
    }

    if (isFetching) {
      console.log('⏭️ [Fallback] Already fetching, skipping...');
      return;
    }

    console.log('📡 [Fallback] Fetching data via REST API...');
    setIsFetching(true);

    try {
      // Fetch all pending data in parallel with smaller page size
      const [purchasesResponse, cashoutsResponse, queuesResponse] = await Promise.all([
        transactionsApi.listPurchases({ status: 'pending', page_size: POLLING_PAGE_SIZE }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch purchases:', err);
          return { results: [], count: 0 };
        }),
        transactionsApi.listCashouts({ status: 'pending', page_size: POLLING_PAGE_SIZE }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch cashouts:', err);
          return { results: [], count: 0 };
        }),
        transactionsApi.queuesProcessing({ page_size: POLLING_PAGE_SIZE }).catch((err) => {
          console.error('❌ [Fallback] Failed to fetch queues:', err);
          return { results: [], count: 0 };
        }),
      ]);

      // Create data hash to detect changes
      const currentData = {
        purchases: purchasesResponse.results,
        cashouts: cashoutsResponse.results,
        queues: queuesResponse.results,
      };
      const currentHash = createDataHash(currentData);
      const hasChanged = currentHash !== lastDataHashRef.current;
      lastDataHashRef.current = currentHash;

      // Update counts
      const newCounts: ProcessingCounts = {
        purchase_count: purchasesResponse.count || purchasesResponse.results.length,
        cashout_count: cashoutsResponse.count || cashoutsResponse.results.length,
        game_activities_count: queuesResponse.count || queuesResponse.results.length,
      };
      setCounts(newCounts);

      // Reset error counter on success
      consecutiveErrorsRef.current = 0;

      // Adaptive interval adjustment based on changes
      if (hasChanged) {
        consecutiveNoChangeRef.current = 0;
        // If changes detected, use faster polling
        currentIntervalRef.current = POLLING_INTERVALS.FAST;
        console.log('📊 [Fallback] Data changed, switching to fast polling (15s)');
      } else {
        consecutiveNoChangeRef.current += 1;
        // If no changes for 2+ polls, slow down
        if (consecutiveNoChangeRef.current >= 2) {
          currentIntervalRef.current = POLLING_INTERVALS.SLOW;
          console.log('📊 [Fallback] No changes detected, switching to slow polling (60s)');
        }
      }

      console.log('📊 [Fallback] Data fetched:', {
        purchases: purchasesResponse.results.length,
        cashouts: cashoutsResponse.results.length,
        queues: queuesResponse.results.length,
        hasChanged,
        nextInterval: currentIntervalRef.current / 1000 + 's',
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
      
      // Exponential backoff on errors
      consecutiveErrorsRef.current += 1;
      const backoffMultiplier = Math.min(consecutiveErrorsRef.current, 4); // Max 4x backoff
      currentIntervalRef.current = Math.min(
        POLLING_INTERVALS.NORMAL * Math.pow(2, backoffMultiplier - 1),
        POLLING_INTERVALS.MAX
      );
      
      console.warn(`⚠️ [Fallback] Error occurred, backing off to ${currentIntervalRef.current / 1000}s`);
    } finally {
      setIsFetching(false);
    }
  }, [isFetching, handleTransactionUpdate, handleQueueUpdate, createDataHash]);

  /**
   * Called when WebSocket connection completely fails (max reconnection attempts reached)
   * Switches to fallback mode and starts adaptive API polling
   */
  const handleConnectionFailed = useCallback(() => {
    console.log('⚠️ [Context] WebSocket connection failed, switching to API fallback mode');
    setIsUsingFallback(true);
    
    // Reset polling state
    currentIntervalRef.current = POLLING_INTERVALS.NORMAL;
    consecutiveNoChangeRef.current = 0;
    consecutiveErrorsRef.current = 0;
    lastDataHashRef.current = '';
    
    // Fetch initial data immediately
    fetchDataViaApi();
    
    // Start adaptive periodic refresh
    const scheduleNextPoll = () => {
      if (fallbackIntervalRef.current) {
        clearTimeout(fallbackIntervalRef.current);
      }
      
      // Only schedule if tab is visible
      if (isTabVisibleRef.current) {
        fallbackIntervalRef.current = setTimeout(() => {
          console.log(`🔄 [Fallback] Auto-refreshing data (interval: ${currentIntervalRef.current / 1000}s)...`);
          fetchDataViaApi().finally(() => {
            // Schedule next poll with current interval
            scheduleNextPoll();
          });
        }, currentIntervalRef.current);
      } else {
        // If tab is hidden, check again in 5 seconds
        fallbackIntervalRef.current = setTimeout(() => {
          scheduleNextPoll();
        }, 5000);
      }
    };
    
    scheduleNextPoll();
  }, [fetchDataViaApi]);

  /**
   * Called when WebSocket successfully connects
   * Disables fallback mode and stops periodic API polling
   */
  const handleConnect = useCallback(() => {
    console.log('✅ [Context] WebSocket connected, disabling fallback mode');
    setIsUsingFallback(false);
    
    // Reset polling state
    currentIntervalRef.current = POLLING_INTERVALS.NORMAL;
    consecutiveNoChangeRef.current = 0;
    consecutiveErrorsRef.current = 0;
    
    // Stop periodic refresh
    if (fallbackIntervalRef.current) {
      clearTimeout(fallbackIntervalRef.current);
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

  // Page Visibility API - pause polling when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabVisibleRef.current = !document.hidden;
      
      if (isUsingFallback) {
        if (document.hidden) {
          console.log('⏸️ [Fallback] Tab hidden, pausing polling...');
          if (fallbackIntervalRef.current) {
            clearTimeout(fallbackIntervalRef.current);
            fallbackIntervalRef.current = null;
          }
        } else {
          console.log('▶️ [Fallback] Tab visible, resuming polling...');
          // Resume polling immediately
          fetchDataViaApi();
          // Restart polling interval
          const scheduleNextPoll = () => {
            if (fallbackIntervalRef.current) {
              clearTimeout(fallbackIntervalRef.current);
            }
            fallbackIntervalRef.current = setTimeout(() => {
              fetchDataViaApi().finally(() => {
                scheduleNextPoll();
              });
            }, currentIntervalRef.current);
          };
          scheduleNextPoll();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    isTabVisibleRef.current = !document.hidden;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isUsingFallback, fetchDataViaApi]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (fallbackIntervalRef.current) {
        clearTimeout(fallbackIntervalRef.current);
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

