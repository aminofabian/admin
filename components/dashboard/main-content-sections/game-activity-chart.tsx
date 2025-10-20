'use client';

import { useMemo } from 'react';
import { useGameActivities } from '@/hooks/use-game-activities';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function GameActivityChart() {
  const gameStatus = useGameActivities();

  const chartData = useMemo(() => {
    const total = gameStatus.activeGames + gameStatus.inactiveGames + gameStatus.pendingQueues;
    const circumference = 2 * Math.PI * 40; // radius = 40
    
    if (total <= 0) {
      return {
        total: 0,
        activeAngle: 120,
        inactiveAngle: 120,
        pendingAngle: 120,
        activeDash: `${(120 / 360) * circumference} ${circumference}`,
        pendingDash: `${(120 / 360) * circumference} ${circumference}`,
        inactiveDash: `${(120 / 360) * circumference} ${circumference}`,
        pendingOffset: `-${(120 / 360) * circumference}`,
        inactiveOffset: `-${(240 / 360) * circumference}`,
      };
    }

    const activeAngle = (gameStatus.activeGames / total) * 360;
    const inactiveAngle = (gameStatus.inactiveGames / total) * 360;
    const pendingAngle = (gameStatus.pendingQueues / total) * 360;

    return {
      total,
      activeAngle,
      inactiveAngle,
      pendingAngle,
      activeDash: `${(activeAngle / 360) * circumference} ${circumference}`,
      pendingDash: `${(pendingAngle / 360) * circumference} ${circumference}`,
      inactiveDash: `${(inactiveAngle / 360) * circumference} ${circumference}`,
      pendingOffset: `-${(activeAngle / 360) * circumference}`,
      inactiveOffset: `-${((activeAngle + pendingAngle) / 360) * circumference}`,
    };
  }, [gameStatus.activeGames, gameStatus.inactiveGames, gameStatus.pendingQueues]);

  if (gameStatus.isLoading) {
    return (
      <Card className="rounded-xl border border-border">
        <CardHeader className="px-4 py-3">
          <h3 className="text-sm font-medium text-muted-foreground">Platform Status</h3>
        </CardHeader>
        <CardContent className="px-4 py-6">
          <LoadingState />
        </CardContent>
      </Card>
    );
  }

  if (gameStatus.error) {
    return (
      <Card className="rounded-xl border border-border">
        <CardHeader className="px-4 py-3">
          <h3 className="text-sm font-medium text-muted-foreground">Platform Status</h3>
        </CardHeader>
        <CardContent className="px-4 py-6">
          <ErrorState message={gameStatus.error} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="px-4 py-3">
        <h3 className="text-sm font-medium text-muted-foreground">Platform Status</h3>
      </CardHeader>
      <CardContent className="px-4 py-4">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-24 h-24" role="img" aria-label={`Platform status: ${gameStatus.activeGames} active, ${gameStatus.pendingQueues} pending, ${gameStatus.inactiveGames} inactive games`}>
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray={chartData.activeDash}
                strokeDashoffset="0"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="hsl(var(--primary) / 0.5)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={chartData.pendingDash}
                strokeDashoffset={chartData.pendingOffset}
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="hsl(var(--muted-foreground) / 0.3)"
                strokeWidth="8"
                fill="none"
                strokeDasharray={chartData.inactiveDash}
                strokeDashoffset={chartData.inactiveOffset}
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
      </CardContent>
    </Card>
  );
}
