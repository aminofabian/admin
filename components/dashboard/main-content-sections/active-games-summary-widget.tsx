'use client';

import { useActiveGames } from '@/hooks/use-active-games';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

export function ActiveGamesSummaryWidget() {
  const { user } = useAuth();
  const {
    activeGamesCount,
    totalGamesCount,
    inactiveGamesCount,
    gamesByStatus,
    recentActivity,
    isLoading,
    error
  } = useActiveGames();

  const canViewGames = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  // Calculate percentages
  const activePercentage = totalGamesCount > 0 ? Math.round((activeGamesCount / totalGamesCount) * 100) : 0;
  const inactivePercentage = totalGamesCount > 0 ? Math.round((inactiveGamesCount / totalGamesCount) * 100) : 0;

  // Base wrapper component
  const WidgetWrapper = ({ children, status = 'active' }: {
    children: React.ReactNode;
    status?: 'active' | 'loading' | 'error' | 'restricted'
  }) => (
    <div className="relative bg-gradient-to-br from-card via-card to-card/95 p-5 border border-border/50 shadow-lg overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.015]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
      </div>

      <div className="relative">
        {/* Header with icon */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground">Active Games Summary</h3>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${
              status === 'active' ? 'bg-primary shadow-lg shadow-primary/50' :
              status === 'loading' ? 'bg-primary animate-pulse shadow-lg shadow-primary/50' :
              status === 'error' ? 'bg-destructive' :
              'bg-muted'
            }`} />
          </div>
        </div>

        {children}
      </div>
    </div>
  );

  // Show placeholder if no permission
  if (!canViewGames) {
    return (
      <WidgetWrapper status="restricted">
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Restricted Access
        </div>
      </WidgetWrapper>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <WidgetWrapper status="loading">
        <LoadingState />
      </WidgetWrapper>
    );
  }

  // Show error state
  if (error) {
    return (
      <WidgetWrapper status="error">
        <ErrorState message={error} />
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper status="active">
      <div className="space-y-4">
        {/* Main Status Display */}
        <div className="text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-full flex items-center justify-center overflow-hidden relative">
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-primary relative" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>

          <div className="text-2xl sm:text-3xl font-bold text-foreground mb-1.5">
            {activeGamesCount}
          </div>

          <div className="text-sm text-primary font-medium mb-2">
            Active Games
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gradient-to-r from-muted/30 to-muted/50 h-2.5 rounded-full mb-1.5 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={activePercentage}>
            <div
              className="h-2.5 bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out rounded-full shadow-sm"
              style={{ width: `${activePercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {activePercentage}% of {totalGamesCount} total games
          </div>
        </div>

        {/* Status Distribution */}
        <div className="grid grid-cols-2 gap-3">
          {/* Active Games */}
          <div className="group relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20 hover:border-primary/30 transition-all duration-200 overflow-hidden">
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 mb-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {activeGamesCount}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Active
              </div>
              <div className="text-[10px] text-muted-foreground/60 mt-1">
                {activePercentage}%
              </div>
            </div>
          </div>

          {/* Inactive Games */}
          <div className="group relative bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-4 border border-border/50 hover:border-border/70 transition-all duration-200 overflow-hidden">
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-muted/30 mb-2">
                <svg className="w-5 h-5 text-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {inactiveGamesCount}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Inactive
              </div>
              <div className="text-[10px] text-muted-foreground/60 mt-1">
                {inactivePercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {(recentActivity.gamesCreatedToday > 0 || recentActivity.gamesUpdatedToday > 0) && (
          <div className="bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-4 border border-border/30">
            <h4 className="text-xs font-semibold text-foreground mb-3 text-center">Today's Activity</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-primary">
                  {recentActivity.gamesCreatedToday}
                </div>
                <div className="text-[10px] text-muted-foreground">Created</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">
                  {recentActivity.gamesUpdatedToday}
                </div>
                <div className="text-[10px] text-muted-foreground">Updated</div>
              </div>
            </div>
          </div>
        )}

        {/* Data source indicator */}
        <div className="text-xs text-muted-foreground/70 pt-3 border-t border-border/30 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-primary/60 rounded-full" />
          <span className="font-medium">Real-time Games Data</span>
        </div>
      </div>
    </WidgetWrapper>
  );
}