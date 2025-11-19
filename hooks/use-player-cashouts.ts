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

export const usePlayerCashouts = (
  chatroomId: string | number | null,
  playerUsername?: string,
  playerEmail?: string,
  playerUserId?: number
) => {
  const [cashouts, setCashouts] = useState<ChatPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToTransactionUpdates } = useProcessingWebSocketContext();

  // Fetch initial cashouts
  useEffect(() => {
    if (!chatroomId) {
      setCashouts([]);
      return;
    }

    const fetchCashouts = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🎯 usePlayerCashouts: Fetching for chatroom ID:', chatroomId);
        const data = await playersApi.cashouts(chatroomId);
        console.log(' usePlayerCashouts: Got cashouts:', data);
        setCashouts(data);
      } catch (err) {
        console.error('❌ Failed to fetch player cashouts:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch cashouts');
        setCashouts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCashouts();
  }, [chatroomId]);

  // Subscribe to real-time updates from processing websocket
  useEffect(() => {
    if (!playerUsername && !playerEmail) {
      return;
    }

    const unsubscribe = subscribeToTransactionUpdates((transaction: Transaction, isInitialLoad?: boolean) => {
      // Only process cashout transactions
      if (transaction.type !== 'cashout') {
        return;
      }

      // Match by username or email
      const matchesUsername = playerUsername && transaction.user_username?.toLowerCase() === playerUsername.toLowerCase();
      const matchesEmail = playerEmail && transaction.user_email?.toLowerCase() === playerEmail.toLowerCase();

      if (!matchesUsername && !matchesEmail) {
        return;
      }

      console.log('🔄 usePlayerCashouts: Real-time cashout update:', transaction.id);

      // Skip initial load updates (they're already loaded via API)
      if (isInitialLoad) {
        return;
      }

      setCashouts((prev) => {
        // Check if transaction already exists
        const existingIndex = prev.findIndex((c) => c.id === transaction.id);
        
        if (existingIndex >= 0) {
          // Update existing cashout
          const updated = [...prev];
          updated[existingIndex] = transformTransactionToChatPurchase(transaction, playerUserId);
          return updated;
        } else {
          // Add new cashout at the beginning
          return [transformTransactionToChatPurchase(transaction, playerUserId), ...prev];
        }
      });
    });

    return unsubscribe;
  }, [subscribeToTransactionUpdates, playerUsername, playerEmail, playerUserId]);

  return { cashouts, isLoading, error };
};
