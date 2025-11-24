'use client';

import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';
import { useProcessingWebSocket, type ProcessingCounts } from '@/hooks/use-processing-websocket';
import type { TransactionQueue, Transaction } from '@/types';

interface ProcessingWebSocketContextValue {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  counts: ProcessingCounts;
  subscribeToQueueUpdates: (callback: (queue: TransactionQueue, isInitialLoad?: boolean) => void) => () => void;
  subscribeToTransactionUpdates: (callback: (transaction: Transaction, isInitialLoad?: boolean) => void) => () => void;
  subscribeToMessages: (callback: (message: any) => void) => () => void;
}

const ProcessingWebSocketContext = createContext<ProcessingWebSocketContextValue | null>(null);

export function ProcessingWebSocketProvider({ children }: { children: ReactNode }) {
  const queueUpdateCallbacksRef = useRef<Set<(queue: TransactionQueue, isInitialLoad?: boolean) => void>>(new Set());
  const transactionUpdateCallbacksRef = useRef<Set<(transaction: Transaction, isInitialLoad?: boolean) => void>>(new Set());
  const messageCallbacksRef = useRef<Set<(message: any) => void>>(new Set());
  const [counts, setCounts] = useState<ProcessingCounts>({
    purchase_count: 0,
    cashout_count: 0,
    game_activities_count: 0,
  });

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

  const { isConnected, isConnecting, error, reconnectAttempts } = useProcessingWebSocket({
    enabled: true,
    onQueueUpdate: handleQueueUpdate,
    onTransactionUpdate: handleTransactionUpdate,
    onMessage: handleMessage,
    onCountsUpdate: handleCountsUpdate,
  });

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

