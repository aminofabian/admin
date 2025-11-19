'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import type { Transaction, TransactionQueue } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';

interface ActivityItem {
  id: string;
  message: string;
  type: 'purchase' | 'cashout' | 'game_activity';
  timestamp: number;
  data?: Transaction | TransactionQueue;
}

interface ActivityTickerProps {
  activities: ActivityItem[];
}

function ActivityTicker({ activities }: ActivityTickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (activities.length === 0) {
    return (
      <div className="h-9 flex items-center justify-center text-xs text-muted-foreground/70 bg-gradient-to-r from-card/60 via-card/40 to-card/20 dark:from-card/40 dark:via-card/30 dark:to-card/20 border border-border/30 dark:border-border/20 rounded-lg">
        <div className="w-1.5 h-1.5 bg-primary/60 rounded-full mr-2 animate-pulse" />
        <span className="font-medium">Live Data</span>
      </div>
    );
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return {
          text: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-500/10 dark:bg-green-500/20',
          border: 'border-green-500/20 dark:border-green-500/30',
          hover: 'hover:bg-green-500/20 dark:hover:bg-green-500/30',
          pulse: 'bg-green-500 dark:bg-green-400',
        };
      case 'cashout':
        return {
          text: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          border: 'border-blue-500/20 dark:border-blue-500/30',
          hover: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/30',
          pulse: 'bg-blue-500 dark:bg-blue-400',
        };
      case 'game_activity':
        return {
          text: 'text-purple-600 dark:text-purple-400',
          bg: 'bg-purple-500/10 dark:bg-purple-500/20',
          border: 'border-purple-500/20 dark:border-purple-500/30',
          hover: 'hover:bg-purple-500/20 dark:hover:bg-purple-500/30',
          pulse: 'bg-purple-500 dark:bg-purple-400',
        };
      default:
        return {
          text: 'text-foreground',
          bg: 'bg-muted/10',
          border: 'border-border/20',
          hover: 'hover:bg-muted/20',
          pulse: 'bg-primary/60',
        };
    }
  };

  const getActivityLink = (activity: ActivityItem): string => {
    switch (activity.type) {
      case 'purchase':
        return '/dashboard/processing/purchase';
      case 'cashout':
        return '/dashboard/processing/cashout';
      case 'game_activity':
        return '/dashboard/processing/game-activities';
      default:
        return '/dashboard/processing';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        );
      case 'cashout':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'game_activity':
        return (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const renderActivityItem = (activity: ActivityItem, index: number, isDuplicate: boolean = false) => {
    const colors = getActivityColor(activity.type);
    const link = getActivityLink(activity);

    return (
      <Link
        key={`${activity.id}-${index}${isDuplicate ? '-duplicate' : ''}`}
        href={link}
        className={`group flex items-center gap-2 px-4 py-1.5 whitespace-nowrap flex-shrink-0 rounded-md transition-all duration-200 ${colors.text} ${colors.bg} ${colors.border} ${colors.hover} border cursor-pointer shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]`}
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${colors.pulse}`} />
          <div className={`${colors.text} transition-transform group-hover:scale-110`}>
            {getActivityIcon(activity.type)}
          </div>
          <span className="text-xs font-semibold group-hover:underline">{activity.message}</span>
        </div>
        {index < activities.length - 1 && (
          <span className="text-muted-foreground/30 mx-2">•</span>
        )}
      </Link>
    );
  };

  return (
    <div className="relative h-9 overflow-hidden bg-gradient-to-r from-card/60 via-card/40 to-card/20 dark:from-card/40 dark:via-card/30 dark:to-card/20 border border-border/30 dark:border-border/20 rounded-lg shadow-sm backdrop-blur-sm">
      <div
        ref={containerRef}
        className="flex items-center h-full animate-slide-left"
        style={{
          animationDuration: `${Math.max(activities.length * 8, 30)}s`,
        }}
        onMouseEnter={() => {
          if (containerRef.current) {
            containerRef.current.style.animationPlayState = 'paused';
          }
        }}
        onMouseLeave={() => {
          if (containerRef.current) {
            containerRef.current.style.animationPlayState = 'running';
          }
        }}
      >
        {activities.map((activity, index) => renderActivityItem(activity, index))}
        {activities.map((activity, index) => renderActivityItem(activity, index, true))}
      </div>
    </div>
  );
}

interface LiveActivityTickerProps {
  maxItems?: number;
}

export function LiveActivityTicker({ maxItems = 5 }: LiveActivityTickerProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const { subscribeToQueueUpdates, subscribeToTransactionUpdates } = useProcessingWebSocketContext();

  useEffect(() => {
    const unsubscribeQueue = subscribeToQueueUpdates((queue: TransactionQueue, isInitialLoad = false) => {
      if (isInitialLoad) return;

      const activityType = queue.type?.replace(/_/g, ' ').toUpperCase() || 'GAME ACTIVITY';
      const userName = queue.user_username || 'Unknown User';
      const gameName = queue.game || 'Unknown Game';
      const amount = formatCurrency(queue.amount || '0');

      const message = `New ${activityType}: ${userName} - ${gameName} (${amount})`;

      setActivities((prev) => {
        const newActivities = [
          {
            id: queue.id,
            message,
            type: 'game_activity' as const,
            timestamp: Date.now(),
            data: queue,
          },
          ...prev,
        ];
        return newActivities.slice(0, maxItems);
      });
    });

    const unsubscribeTransaction = subscribeToTransactionUpdates((transaction: Transaction, isInitialLoad = false) => {
      if (isInitialLoad) return;

      const transactionType = transaction.type?.toUpperCase() || 'TRANSACTION';
      const userName = transaction.user_username || 'Unknown User';
      const amount = formatCurrency(transaction.amount || '0');

      const message = `New ${transactionType}: ${userName} - ${amount}`;

      setActivities((prev) => {
        const newActivities = [
          {
            id: transaction.id,
            message,
            type: transaction.type as 'purchase' | 'cashout',
            timestamp: Date.now(),
            data: transaction,
          },
          ...prev,
        ];
        return newActivities.slice(0, maxItems);
      });
    });

    return () => {
      unsubscribeQueue();
      unsubscribeTransaction();
    };
  }, [subscribeToQueueUpdates, subscribeToTransactionUpdates, maxItems]);

  return <ActivityTicker activities={activities} />;
}

