'use client';

import { useEffect, useState } from 'react';
import { dashboardStatsApi } from '@/lib/api/dashboard-stats';

interface GameStatusData {
  activeGames: number;
  inactiveGames: number;
  pendingQueues: number;
}

export function GameActivityChart() {
  const [gameStatus, setGameStatus] = useState<GameStatusData>({
    activeGames: 0,
    inactiveGames: 0,
    pendingQueues: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGameStatus = async () => {
      try {
        const stats = await dashboardStatsApi.getStats();
        setGameStatus({
          activeGames: stats.activeGames,
          inactiveGames: stats.inactiveGames,
          pendingQueues: stats.pendingTransactions,
        });
      } catch (error) {
        console.error('Error fetching game status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameStatus();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchGameStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const total = gameStatus.activeGames + gameStatus.inactiveGames + gameStatus.pendingQueues;
  const activeAngle = total > 0 ? (gameStatus.activeGames / total) * 360 : 120;
  const inactiveAngle = total > 0 ? (gameStatus.inactiveGames / total) * 360 : 120;
  const pendingAngle = total > 0 ? (gameStatus.pendingQueues / total) * 360 : 120;

  return (
    <div className="bg-card dark:bg-gray-800 rounded-xl p-4 border border-border dark:border-gray-700">
      <h3 className="text-sm font-medium text-muted-foreground dark:text-gray-400 mb-4">Platform Status</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Active Games */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(34 197 94)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(activeAngle / 360) * 251.2} 251.2`}
              strokeDashoffset="0"
            />
            {/* Pending Queues */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(234 179 8)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(pendingAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${(activeAngle / 360) * 251.2}`}
            />
            {/* Inactive Games */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(107 114 128)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(inactiveAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${((activeAngle + pendingAngle) / 360) * 251.2}`}
            />
          </svg>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground dark:text-gray-400">...</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-muted-foreground dark:text-gray-400">Active Games</span>
          </div>
          <span className="text-foreground dark:text-gray-100 font-medium">{gameStatus.activeGames}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span className="text-muted-foreground dark:text-gray-400">Pending Queues</span>
          </div>
          <span className="text-foreground dark:text-gray-100 font-medium">{gameStatus.pendingQueues}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full" />
            <span className="text-muted-foreground dark:text-gray-400">Inactive Games</span>
          </div>
          <span className="text-foreground dark:text-gray-100 font-medium">{gameStatus.inactiveGames}</span>
        </div>
      </div>
    </div>
  );
}
