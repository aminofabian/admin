import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api/users';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { GameActivity, TransactionQueue } from '@/types';

// Transform TransactionQueue to GameActivity
function transformQueueToGameActivity(queue: TransactionQueue): GameActivity {
  const rawData = queue.data as any;
  
  return {
    id: queue.id,
    user_id: queue.user_id,
    username: queue.user_username || rawData?.user_username || rawData?.username || '',
    game_username: queue.game_username || rawData?.game_username || rawData?.gameUsername || undefined,
    full_name: rawData?.full_name || rawData?.fullName || '',
    game_id: rawData?.game_id || rawData?.gameId || 0,
    game_title: queue.game || rawData?.game_title || rawData?.gameTitle || '',
    game_code: queue.game_code || rawData?.game_code || rawData?.gameCode || '',
    amount: queue.amount || rawData?.amount || '0',
    bonus_amount: queue.bonus_amount || rawData?.bonus_amount || rawData?.bonusAmount || '0',
    total_amount: queue.amount || rawData?.total_amount || rawData?.totalAmount || '0',
    type: queue.type || rawData?.type || '',
    status: queue.status || rawData?.status || 'pending',
    operator: queue.operator || rawData?.operator || '',
    remarks: queue.remarks || rawData?.remarks || '',
    created_at: queue.created_at || rawData?.created_at || rawData?.createdAt || new Date().toISOString(),
  };
}

export const usePlayerGameActivities = (userId: number | null) => {
  const [activities, setActivities] = useState<GameActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { subscribeToQueueUpdates } = useProcessingWebSocketContext();

  // Fetch initial activities
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
        const rawData = await playersApi.gameActivities(userId);
        console.log(' usePlayerGameActivities: Got raw data:', rawData);
        
        // Transform new API response structure to GameActivity format
        const transformedActivities = rawData.map((item: any) => {
          const activityData = item.data || {};
          return {
            id: item.id,
            user_id: item.user_id,
            username: item.user_username || activityData.username || '',
            game_username: activityData.username || item.game_username || undefined,
            full_name: item.user_username || '',
            game_id: 0, // Not provided in new structure
            game_title: item.game || '',
            game_code: item.game_code || '',
            amount: String(item.amount || '0'),
            bonus_amount: String(item.bonus_amount || '0'),
            total_amount: String(item.amount || '0'),
            type: item.type || '',
            status: item.status || 'pending',
            operator: item.operator || '',
            remarks: item.remarks || '',
            created_at: item.created_at || new Date().toISOString(),
            // Additional fields from new structure
            updated_at: item.updated_at || item.created_at || new Date().toISOString(),
            user_email: item.user_email || '',
            data: activityData, // Preserve full data object
          };
        });
        
        console.log('✅ usePlayerGameActivities: Transformed activities:', transformedActivities);
        setActivities(transformedActivities);
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

  // Subscribe to real-time updates from processing websocket
  useEffect(() => {
    if (!userId) {
      return;
    }

    const unsubscribe = subscribeToQueueUpdates((queue: TransactionQueue, isInitialLoad?: boolean) => {
      // Match by user_id
      if (queue.user_id !== userId) {
        return;
      }

      console.log('🔄 usePlayerGameActivities: Real-time game activity update:', queue.id);

      // Skip initial load updates (they're already loaded via API)
      if (isInitialLoad) {
        return;
      }

      setActivities((prev) => {
        // Check if activity already exists
        const existingIndex = prev.findIndex((a) => a.id === queue.id);
        
        if (existingIndex >= 0) {
          // Update existing activity
          const updated = [...prev];
          updated[existingIndex] = transformQueueToGameActivity(queue);
          return updated;
        } else {
          // Add new activity at the beginning
          return [transformQueueToGameActivity(queue), ...prev];
        }
      });
    });

    return unsubscribe;
  }, [subscribeToQueueUpdates, userId]);

  return { activities, isLoading, error };
};
