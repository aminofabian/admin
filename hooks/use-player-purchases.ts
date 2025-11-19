import { useState, useEffect, useCallback } from 'react';
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
    if (!chatroomId) {
      setPurchases([]);
      return;
    }

    const fetchPurchases = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🎯 usePlayerPurchases: Fetching for chatroom ID:', chatroomId);
        const data = await playersApi.purchases(chatroomId);
        console.log(' usePlayerPurchases: Got purchases:', data);
        setPurchases(data);
      } catch (err) {
        console.error('❌ Failed to fetch player purchases:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch purchases');
        setPurchases([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();
  }, [chatroomId]);

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
        
        if (existingIndex >= 0) {
          // Update existing purchase
          const updated = [...prev];
          updated[existingIndex] = transformTransactionToChatPurchase(transaction, playerUserId);
          return updated;
        } else {
          // Add new purchase at the beginning
          return [transformTransactionToChatPurchase(transaction, playerUserId), ...prev];
        }
      });
    });

    return unsubscribe;
  }, [subscribeToTransactionUpdates, playerUsername, playerEmail, playerUserId]);

  return { purchases, isLoading, error };
};
