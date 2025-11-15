import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import type { ChatPurchase } from '@/types';

export const usePlayerCashouts = (chatroomId: string | number | null) => {
  const [cashouts, setCashouts] = useState<ChatPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return { cashouts, isLoading, error };
};
