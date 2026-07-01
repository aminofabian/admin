import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { ChatPurchase, Transaction } from '@/types';

// Transform Transaction to ChatPurchase
function transformTransactionToChatPurchase(transaction: Transaction, userId?: number): ChatPurchase {
  return {
    id: transaction.id,
    user_id: userId || 0, // Will be set from player data
    amount: parseFloat(transaction.amount) || 0,
    bonus_amount: transaction.bonus_amount ? parseFloat(transaction.bonus_amount) : undefined,
    status: transaction.status,
    transaction_id: transaction.id,
    operator: transaction.payment_method || transaction.operator || '',
    payment_method: transaction.payment_method,
    type: transaction.type,
  };
}

export const usePlayerPurchases = (
  chatroomId: string | number | null,
  playerUsername?: string,
  playerEmail?: string,
  playerUserId?: number
) => {
  const [purchases, setPurchases] = useState<ChatPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToTransactionUpdates } = useProcessingWebSocketContext();

  // Fetch initial purchases
  useEffect(() => {
    if (!chatroomId && !playerUserId) {
      setPurchases([]);
      return;
    }

    const abortController = new AbortController();
    let cancelled = false;

    const fetchPurchases = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('🎯 usePlayerPurchases: Fetching for chatroom ID:', chatroomId);
        const data = await playersApi.purchases(chatroomId, {
          userId: playerUserId,
          signal: abortController.signal,
        });
        if (cancelled) return;
        console.log(' usePlayerPurchases: Got purchases:', data);
        const activePurchases = data.filter((p) => p.status !== 'completed');
        setPurchases(activePurchases);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('❌ Failed to fetch player purchases:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch purchases');
        setPurchases([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void fetchPurchases();

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [chatroomId, playerUserId]);

  // Subscribe to real-time updates from processing websocket
  useEffect(() => {
    if (!playerUsername && !playerEmail) {
      return;
    }

    const unsubscribe = subscribeToTransactionUpdates((transaction: Transaction, isInitialLoad?: boolean) => {
      // Only process purchase transactions
      if (transaction.type !== 'purchase') {
        return;
      }

      // Match by username or email
      const matchesUsername = playerUsername && transaction.user_username?.toLowerCase() === playerUsername.toLowerCase();
      const matchesEmail = playerEmail && transaction.user_email?.toLowerCase() === playerEmail.toLowerCase();

      if (!matchesUsername && !matchesEmail) {
        return;
      }

      console.log('🔄 usePlayerPurchases: Real-time purchase update:', transaction.id);

      // Skip initial load updates (they're already loaded via API)
      if (isInitialLoad) {
        return;
      }

      setPurchases((prev) => {
        // Check if transaction already exists
        const existingIndex = prev.findIndex((p) => p.id === transaction.id);
        
        // If status is completed, remove it from the list
        if (transaction.status === 'completed') {
          if (existingIndex >= 0) {
            // Remove completed purchase
            return prev.filter((p) => p.id !== transaction.id);
          }
          // If it doesn't exist and is completed, don't add it
          return prev;
        }
        
        if (existingIndex >= 0) {
          // Update existing purchase (only if not completed)
          const updated = [...prev];
          updated[existingIndex] = transformTransactionToChatPurchase(transaction, playerUserId);
          return updated;
        } else {
          // Add new purchase at the beginning (only if not completed)
          return [transformTransactionToChatPurchase(transaction, playerUserId), ...prev];
        }
      });
    });

    return unsubscribe;
  }, [subscribeToTransactionUpdates, playerUsername, playerEmail, playerUserId]);

  return { purchases, isLoading, error };
};
