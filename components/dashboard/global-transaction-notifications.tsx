'use client';

import { useEffect, useRef } from 'react';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import { useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import type { Transaction } from '@/types';

/**
 * GlobalTransactionNotifications
 *
 * Subscribes to WebSocket updates for transactions (cashout, purchase) and shows toasts.
 * Queue / game-activity WebSocket events are not surfaced here.
 */
export function GlobalTransactionNotifications() {
  const { subscribeToTransactionUpdates } = useProcessingWebSocketContext();
  const { addToast } = useToast();

  const processedTransactionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribeTransaction = subscribeToTransactionUpdates(
      (updatedTransaction: Transaction, isInitialLoad = false) => {
        if (isInitialLoad) {
          return;
        }

        if (updatedTransaction.type !== 'cashout' && updatedTransaction.type !== 'purchase') {
          return;
        }

        const paymentMethod = updatedTransaction.payment_method;
        if (!paymentMethod || paymentMethod.trim() === '' || paymentMethod === '—') {
          return;
        }

        const statusLower = String(updatedTransaction.status || '').toLowerCase();
        const isCompleted =
          statusLower === 'completed' ||
          statusLower === 'complete' ||
          statusLower === 'cancelled' ||
          statusLower === 'failed';

        if (isCompleted) {
          return;
        }

        const notificationKey = `${updatedTransaction.id}-${updatedTransaction.status}`;

        if (processedTransactionIdsRef.current.has(notificationKey)) {
          return;
        }

        processedTransactionIdsRef.current.add(notificationKey);

        if (processedTransactionIdsRef.current.size > 100) {
          const entries = Array.from(processedTransactionIdsRef.current);
          processedTransactionIdsRef.current = new Set(entries.slice(-50));
        }

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
      },
    );

    return unsubscribeTransaction;
  }, [subscribeToTransactionUpdates, addToast]);

  return null;
}
