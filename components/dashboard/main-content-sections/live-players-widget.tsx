'use client';

import { useEffect } from 'react';
import { usePlayersStore } from '@/stores';
import { useActiveGames } from '@/hooks/use-active-games';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';
import { LiveActivityTicker } from './activity-ticker';
import type { DashboardStats } from '@/lib/api/dashboard';

interface LivePlayersWidgetProps {
  stats: DashboardStats | null;
  statsLoading: boolean;
}

export function LivePlayersWidget({ stats, statsLoading }: LivePlayersWidgetProps) {
  const { user } = useAuth();
  const { players, isLoading: playersLoading, error: playersError, fetchPlayers } = usePlayersStore();
  const {
    activeGamesCount,
    totalGamesCount,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    recentActivity,
    isLoading: gamesLoading,
    error: gamesError
  } = useActiveGames();

  const canViewPlayers = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canViewPlayers) {
      fetchPlayers();
    }
  }, [canViewPlayers, fetchPlayers]);

  // Calculate meaningful player statistics
  const playerData = players?.results || [];
  
  // Use detailed player data when available, fallback to dashboard stats
  const totalPlayers = players?.count ?? stats?.totalPlayers ?? 0;
  const activeGames = activeGamesCount; // Use real active games count from our new hook

  // Additional business metrics from player data
  const playersWithBalance = playerData.filter(p => parseFloat(p.balance) > 0).length;
  const playersWithWinnings = playerData.filter(p => parseFloat(p.winning_balance) > 0).length;

  const isLoading = statsLoading || (canViewPlayers && (playersLoading || gamesLoading));
  const error = playersError || gamesError;

  // Base wrapper component
  const WidgetWrapper = ({ children, status = 'active' }: { children: React.ReactNode; status?: 'active' | 'loading' | 'error' | 'restricted' }) => (
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-foreground">Live Players</h3>
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
  if (!canViewPlayers) {
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
      {/* Main Stats Display */}
      <div className="space-y-4">
        {/* Primary stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Total Players */}
          <div className="group relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20 hover:border-primary/30 transition-all duration-200 overflow-hidden">
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            
            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 mb-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {totalPlayers.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Total Players
              </div>
            </div>
          </div>
          
          {/* Active Games */}
          <div className="group relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20 hover:border-primary/30 transition-all duration-200 overflow-hidden">
            {/* Subtle shine effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 mb-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {activeGames}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                Active Games
              </div>
              <div className="text-[10px] text-muted-foreground/60 mt-1">
                of {totalGamesCount} total
              </div>
            </div>
          </div>
        </div>

        {/* Secondary metrics */}
        {playerData.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {/* Players with Balance */}
            <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-3 border border-border/30">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-muted/20 mb-1.5">
                  <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {playersWithBalance}
                </div>
                <div className="text-xs text-muted-foreground">
                  with balance
                </div>
              </div>
            </div>
            
            {/* Players with Winnings */}
            <div className="relative bg-gradient-to-br from-card/80 via-card/60 to-card/40 p-3 border border-border/30">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-8 h-8 bg-muted/20 mb-1.5">
                  <svg className="w-4 h-4 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="text-lg font-bold text-foreground">
                  {playersWithWinnings}
                </div>
                <div className="text-xs text-muted-foreground">
                  with winnings
                </div>
              </div>
            </div>
          </div>
        )}

        

        {/* Live Activity Ticker */}
        <div className="pt-3 border-t border-border/30">
          <LiveActivityTicker maxItems={3} />
        </div>
      </div>
    </WidgetWrapper>
  );
}

