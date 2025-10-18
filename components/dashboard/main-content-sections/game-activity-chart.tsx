'use client';

import { useGameActivities } from '@/hooks/use-game-activities';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

export function GameActivityChart() {
  const gameStatus = useGameActivities();

  if (gameStatus.isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Platform Status</h3>
        <LoadingState />
      </div>
    );
  }

  if (gameStatus.error) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Platform Status</h3>
        <ErrorState message={gameStatus.error} />
      </div>
    );
  }

  const total = gameStatus.activeGames + gameStatus.inactiveGames + gameStatus.pendingQueues;
  const activeAngle = total > 0 ? (gameStatus.activeGames / total) * 360 : 120;
  const inactiveAngle = total > 0 ? (gameStatus.inactiveGames / total) * 360 : 120;
  const pendingAngle = total > 0 ? (gameStatus.pendingQueues / total) * 360 : 120;

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Platform Status</h3>
      
      <div className="flex items-center justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(activeAngle / 360) * 251.2} 251.2`}
              strokeDashoffset="0"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="hsl(var(--primary) / 0.5)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(pendingAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${(activeAngle / 360) * 251.2}`}
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(inactiveAngle / 360) * 251.2} 251.2`}
              strokeDashoffset={`-${((activeAngle + pendingAngle) / 360) * 251.2}`}
            />
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span className="text-muted-foreground">Active Games</span>
          </div>
          <span className="text-foreground font-medium">{gameStatus.activeGames}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary/50 rounded-full" />
            <span className="text-muted-foreground">Pending Queues</span>
          </div>
          <span className="text-foreground font-medium">{gameStatus.pendingQueues}</span>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-muted-foreground/30 rounded-full" />
            <span className="text-muted-foreground">Inactive Games</span>
          </div>
          <span className="text-foreground font-medium">{gameStatus.inactiveGames}</span>
        </div>
      </div>
    </div>
  );
}
