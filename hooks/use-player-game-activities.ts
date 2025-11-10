import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import type { GameActivity } from '@/types';

export const usePlayerGameActivities = (userId: number | null) => {
  const [activities, setActivities] = useState<GameActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setActivities([]);
      return;
    }

    const fetchActivities = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log('🎯 usePlayerGameActivities: Fetching for user ID:', userId);
        const data = await playersApi.gameActivities(userId);
        console.log('✅ usePlayerGameActivities: Got activities:', data);
        setActivities(data);
      } catch (err) {
        console.error('❌ Failed to fetch game activities:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch game activities');
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [userId]);

  return { activities, isLoading, error };
};
