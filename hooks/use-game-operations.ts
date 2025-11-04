import { useState, useEffect } from 'react';
import { transactionsApi } from '@/lib/api';
import type { TransactionQueue, PaginatedResponse, QueueType, TransactionStatus } from '@/types';

interface GameOperationStats {
  pending: number;
  failed: number;
  completed_today: number;
}

interface GameOperationsData {
  recharge: GameOperationStats;
  redeem: GameOperationStats;
  add_user_game: GameOperationStats;
  totalPending: number;
  totalFailed: number;
  totalCompleted: number;
  isLoading: boolean;
  error: string | null;
}

export function useGameOperations() {
  const [data, setData] = useState<GameOperationsData>({
    recharge: { pending: 0, failed: 0, completed_today: 0 },
    redeem: { pending: 0, failed: 0, completed_today: 0 },
    add_user_game: { pending: 0, failed: 0, completed_today: 0 },
    totalPending: 0,
    totalFailed: 0,
    totalCompleted: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const fetchGameOperations = async () => {
      try {
        setData(prev => ({ ...prev, isLoading: true, error: null }));

        const queueTypes: QueueType[] = ['recharge_game', 'redeem_game', 'add_user_game'];
        const statuses: TransactionStatus[] = ['pending', 'failed', 'completed'];
        
        console.log('Starting game operations fetch...');
        
        const operations: Record<string, GameOperationStats> = {
          recharge: { pending: 0, failed: 0, completed_today: 0 },
          redeem: { pending: 0, failed: 0, completed_today: 0 },
          add_user_game: { pending: 0, failed: 0, completed_today: 0 },
        };

        // Test with a simple API call first
        try {
          console.log('Testing API connection...');
          const testResponse = await transactionsApi.queues({ page_size: 1 });
          console.log('Test API response:', testResponse);
        } catch (testErr) {
          console.error('API test failed:', testErr);
        }

        // Fetch data for each queue type and status combination
        const promises = queueTypes.map(async (queueType) => {
          // Map queue types to operation keys correctly
          const typeKeyMap: Record<QueueType, keyof typeof operations> = {
            'recharge_game': 'recharge',
            'redeem_game': 'redeem', 
            'add_user_game': 'add_user_game',
            'create_game': 'add_user_game'
          };
          const typeKey = typeKeyMap[queueType];
          
          // Safety check to ensure typeKey exists
          if (!typeKey || !operations[typeKey]) {
            console.error(`Invalid typeKey: ${typeKey} for queueType: ${queueType}`);
            return;
          }
          
          for (const status of statuses) {
            try {
              console.log(`Fetching ${queueType} ${status}...`);
              const response: PaginatedResponse<TransactionQueue> = await transactionsApi.queues({
                type: queueType,
                status: status,
                page_size: 1000, // Get all records for accurate counts
              });

              console.log(`Response for ${queueType} ${status}:`, response);

              if (status === 'pending' || status === 'failed') {
                const count = response?.count ?? 0;
                operations[typeKey][status] = typeof count === 'number' ? count : 0;
                console.log(`Set ${typeKey} ${status} to:`, operations[typeKey][status]);
              } else if (status === 'completed') {
                // Filter completed transactions for today
                const today = new Date().toISOString().split('T')[0];
                const results = response?.results ?? [];
                const completedToday = results.filter(queue => 
                  queue.created_at && queue.created_at.startsWith(today)
                ).length;
                operations[typeKey].completed_today = completedToday;
                console.log(`Set ${typeKey} completed_today to:`, completedToday);
              }
            } catch (err) {
              console.warn(`Failed to fetch ${queueType} ${status}:`, err);
              // Set default values on error
              if (status === 'pending' || status === 'failed') {
                operations[typeKey][status] = 0;
              } else if (status === 'completed') {
                operations[typeKey].completed_today = 0;
              }
            }
          }
        });

        await Promise.all(promises);

        console.log('Final operations data:', operations);

        // Calculate totals with safe number handling
        const totalPending = (operations.recharge.pending || 0) + (operations.redeem.pending || 0) + (operations.add_user_game.pending || 0);
        const totalFailed = (operations.recharge.failed || 0) + (operations.redeem.failed || 0) + (operations.add_user_game.failed || 0);
        const totalCompleted = (operations.recharge.completed_today || 0) + (operations.redeem.completed_today || 0) + (operations.add_user_game.completed_today || 0);

        console.log('Calculated totals:', { totalPending, totalFailed, totalCompleted });

        setData({
          recharge: operations.recharge,
          redeem: operations.redeem,
          add_user_game: operations.add_user_game,
          totalPending,
          totalFailed,
          totalCompleted,
          isLoading: false,
          error: null,
        });

      } catch (err: unknown) {
        let errorMessage = 'Failed to load game operations data';
        
        if (err && typeof err === 'object' && 'detail' in err) {
          errorMessage = String(err.detail);
          
          if (errorMessage.toLowerCase().includes('permission')) {
            errorMessage = 'Access Denied: You need appropriate privileges to view game operations.';
          }
        } else if (err instanceof Error) {
          errorMessage = err.message;
        }
        
        setData(prev => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
        }));
      }
    };

    fetchGameOperations();
  }, []);

  return data;
}
