'use client';

import { useEffect } from 'react';
import { Drawer } from '@/components/ui';
import { GameActivityTable } from './game-activity-table';
import { useTransactionQueuesStore } from '@/stores/use-transaction-queues-store';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import type { TransactionQueue } from '@/types';

interface GameActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: TransactionQueue[];
  onViewDetails?: (activity: TransactionQueue) => void;
  title?: string;
  description?: string;
}

/**
 * Game Activity Modal with real-time WebSocket updates.
 * This modal displays game activities and updates automatically when new activities arrive.
 */
export function GameActivityModal({
  isOpen,
  onClose,
  activities,
  onViewDetails,
  title = 'Game Activities',
  description = 'View and manage game activities',
}: GameActivityModalProps) {
  const { updateQueue, actionLoading } = useTransactionQueuesStore();

  const { isConnected: wsConnected, isConnecting: wsConnecting, error: wsError, subscribeToQueueUpdates } = useProcessingWebSocketContext();

  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = subscribeToQueueUpdates((updatedQueue: TransactionQueue) => {
      console.log('📨 [Modal] Real-time queue update received:', updatedQueue.id, updatedQueue.status);
      updateQueue(updatedQueue);
    });

    return unsubscribe;
  }, [isOpen, subscribeToQueueUpdates, updateQueue]);

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} size="full">
      <div className="space-y-4">
        {/* WebSocket Connection Status */}
        <div className="flex items-center justify-between gap-4">
          {description && (
            <div className="text-sm text-muted-foreground">
              {description}
            </div>
          )}
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
            {wsConnecting && (
              <>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                <span className="text-xs font-medium text-muted-foreground">Connecting...</span>
              </>
            )}
            {wsConnected && !wsConnecting && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-600 dark:text-green-400">Live</span>
              </>
            )}
            {!wsConnected && !wsConnecting && wsError && (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Offline</span>
              </>
            )}
            {!wsConnected && !wsConnecting && !wsError && (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="text-xs font-medium text-muted-foreground">Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        {activities.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No activities to display</p>
          </div>
        ) : (
          <GameActivityTable
            activities={activities}
            onViewDetails={onViewDetails}
            showActions={true}
            actionLoading={actionLoading}
          />
        )}
      </div>
    </Drawer>
  );
}

