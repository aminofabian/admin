'use client';

import { useEffect } from 'react';
import { usePlayersStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { DashboardStats } from '@/lib/api/dashboard';

interface LivePlayersWidgetProps {
  stats: DashboardStats | null;
  statsLoading: boolean;
}

export function LivePlayersWidget({ stats, statsLoading }: LivePlayersWidgetProps) {
  const { user } = useAuth();
  const { players, isLoading: playersLoading, fetchPlayers } = usePlayersStore();
  
  const canViewPlayers = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canViewPlayers) {
      fetchPlayers();
    }
  }, [canViewPlayers, fetchPlayers]);

  // Calculate player stats from real data
  const totalPlayers = players?.count ?? stats?.totalPlayers ?? 0;
  const activePlayers = players?.results?.filter(p => p.is_active).length ?? stats?.activePlayers ?? 0;
  const activeGames = stats?.activeGames ?? 0;
  
  const isLoading = statsLoading || playersLoading;

  return (
    <div className="bg-card rounded-xl p-4 xl:p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm xl:text-base font-semibold text-muted-foreground">Live Players</h3>
        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
      </div>
      <div className="text-center">
        <div className="w-16 h-16 xl:w-20 xl:h-20 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center">
          <svg className="w-8 h-8 xl:w-10 xl:h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div className="space-y-2 xl:space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Active Players</span>
            <span className="text-lg xl:text-xl font-bold text-primary">
              {isLoading ? '...' : activePlayers.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Total Players</span>
            <span className="text-foreground font-semibold">
              {isLoading ? '...' : totalPlayers.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Active Games</span>
            <span className="text-foreground font-semibold">
              {isLoading ? '...' : activeGames}
            </span>
          </div>
          <div className="text-xs text-muted-foreground/80 mt-3 pt-3 border-t border-border flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-pulse"></div>
            {canViewPlayers ? 'Live Data' : 'Dashboard Stats'}
          </div>
        </div>
      </div>
    </div>
  );
}

