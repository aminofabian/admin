'use client';

import { useEffect, useRef } from 'react';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import { useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import type { Transaction, TransactionQueue } from '@/types';

/**
 * GlobalTransactionNotifications
 * 
 * This component subscribes to WebSocket updates for transactions (cashout, purchase)
 * and queues (game activities/processing) and shows toast notifications globally,
 * regardless of which page the user is currently viewing.
 * 
 * It should be mounted once in the dashboard layout to ensure notifications
 * work across all pages.
 */
export function GlobalTransactionNotifications() {
  const { subscribeToTransactionUpdates, subscribeToQueueUpdates } = useProcessingWebSocketContext();
  const { addToast } = useToast();

  // Track processed transaction/queue IDs to prevent duplicate notifications
  const processedTransactionIdsRef = useRef<Set<string>>(new Set());
  const processedQueueIdsRef = useRef<Set<string>>(new Set());

  // Subscribe to transaction updates (cashout and purchase)
  useEffect(() => {
    const unsubscribeTransaction = subscribeToTransactionUpdates(
      (updatedTransaction: Transaction, isInitialLoad = false) => {
        // Skip initial load updates (they're already loaded via API)
        if (isInitialLoad) {
          return;
        }

        // Only show notifications for cashout and purchase transactions
        if (updatedTransaction.type !== 'cashout' && updatedTransaction.type !== 'purchase') {
          return;
        }

        const statusLower = String(updatedTransaction.status || '').toLowerCase();
        const isCompleted = 
          statusLower === 'completed' || 
          statusLower === 'complete' || 
          statusLower === 'cancelled' || 
          statusLower === 'failed';

        // Only show notifications for non-completed transactions
        if (isCompleted) {
          return;
        }

        // Create a unique key for this transaction update
        const notificationKey = `${updatedTransaction.id}-${updatedTransaction.status}`;

        // Prevent duplicate notifications for the same transaction status
        if (processedTransactionIdsRef.current.has(notificationKey)) {
          return;
        }

        // Mark as processed
        processedTransactionIdsRef.current.add(notificationKey);

        // Clean up old entries to prevent memory leak (keep last 100)
        if (processedTransactionIdsRef.current.size > 100) {
          const entries = Array.from(processedTransactionIdsRef.current);
          processedTransactionIdsRef.current = new Set(entries.slice(-50));
        }

        // Show toast notification
        const transactionType = updatedTransaction.type?.toUpperCase() || 'TRANSACTION';
        const userName = updatedTransaction.user_username || 'New Transaction';
        const amount = formatCurrency(updatedTransaction.amount || '0');

        addToast({
          type: 'info',
          title: `New ${transactionType}`,
          description: `${userName} - ${amount}`,
          duration: 5000,
        });

        console.log('🔔 Global notification: New transaction', {
          id: updatedTransaction.id,
          type: updatedTransaction.type,
          status: updatedTransaction.status,
        });
      }
    );

    return unsubscribeTransaction;
  }, [subscribeToTransactionUpdates, addToast]);

  // Subscribe to queue updates (game activities/processing)
  useEffect(() => {
    const unsubscribeQueue = subscribeToQueueUpdates(
      (updatedQueue: TransactionQueue, isInitialLoad = false) => {
        // Skip initial load updates (they're already loaded via API)
        if (isInitialLoad) {
          return;
        }

        const statusLower = String(updatedQueue.status || '').toLowerCase();
        const isCompleted = statusLower === 'completed' || statusLower === 'complete';

        // Only show notifications for non-completed activities
        if (isCompleted) {
          return;
        }

        // Create a unique key for this queue update
        const notificationKey = `${updatedQueue.id}-${updatedQueue.status}`;

        // Prevent duplicate notifications for the same queue status
        if (processedQueueIdsRef.current.has(notificationKey)) {
          return;
        }

        // Mark as processed
        processedQueueIdsRef.current.add(notificationKey);

        // Clean up old entries to prevent memory leak (keep last 100)
        if (processedQueueIdsRef.current.size > 100) {
          const entries = Array.from(processedQueueIdsRef.current);
          processedQueueIdsRef.current = new Set(entries.slice(-50));
        }

        // Format queue type for display
        const queueTypeMap: Record<string, string> = {
          recharge_game: 'Recharge Game',
          redeem_game: 'Redeem Game',
          add_user_game: 'Add User Game',
          create_game: 'Create Game',
        };

        const queueTypeDisplay = queueTypeMap[updatedQueue.type] || updatedQueue.type || 'Game Activity';
        const userName = updatedQueue.user_username || updatedQueue.user_email || 'New Activity';
        const amount = formatCurrency(updatedQueue.amount || '0');

        addToast({
          type: 'info',
          title: `New ${queueTypeDisplay}`,
          description: `${userName} - ${amount}`,
          duration: 5000,
        });

        console.log('🔔 Global notification: New game activity', {
          id: updatedQueue.id,
          type: updatedQueue.type,
          status: updatedQueue.status,
        });
      }
    );

    return unsubscribeQueue;
  }, [subscribeToQueueUpdates, addToast]);

  // This component doesn't render anything
  return null;
}

