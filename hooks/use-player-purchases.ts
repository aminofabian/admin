import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import type { ChatPurchase } from '@/types';

export const usePlayerPurchases = (chatroomId: string | number | null) => {
  const [purchases, setPurchases] = useState<ChatPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.log('✅ usePlayerPurchases: Got purchases:', data);
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

  return { purchases, isLoading, error };
};
