'use client';

import { useEffect, useMemo, useCallback, memo } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

// Constants
const CIRCLE_RADIUS = 40;
const CIRCLE_STROKE_WIDTH = 8;

// Wrapper component to avoid duplication
const WidgetWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <div className="relative bg-gradient-to-br from-card via-card to-card/95 p-5 border border-border/50 shadow-lg overflow-hidden">
    {/* Subtle background pattern */}
    <div className="absolute inset-0 opacity-[0.015]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
    </div>
    
    <div className="relative">
      {/* Header with icon */}
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-foreground">Affiliate Network</h3>
      </div>
      
      {children}
    </div>
  </div>
));
WidgetWrapper.displayName = 'WidgetWrapper';

export const AffiliateNetworkWidget = memo(function AffiliateNetworkWidget() {
  const { user } = useAuth();
  const { affiliates, isLoading, error, fetchAffiliates } = useAffiliatesStore();
  
  const canViewAffiliates = useMemo(
    () => user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY,
    [user?.role]
  );

  // Memoize fetch callback to prevent unnecessary useEffect triggers
  const handleFetchAffiliates = useCallback(() => {
    if (canViewAffiliates) {
      fetchAffiliates();
    }
  }, [canViewAffiliates, fetchAffiliates]);

  useEffect(() => {
    handleFetchAffiliates();
  }, [handleFetchAffiliates]);

  // Memoize expensive calculations to avoid recalculating on every render
  const metrics = useMemo(() => {
    const totalAffiliates = affiliates?.count || 0;
    const affiliateData = affiliates?.results || [];
    
    // Single pass through data to calculate metrics (optimization)
    let activeAffiliates = 0;
    let totalPlayers = 0;
    let totalEarnings = 0;
    
    affiliateData.forEach(aff => {
      // Count as active if they have any players referred
      if (aff.total_players > 0) {
        activeAffiliates++;
      }
      totalPlayers += aff.total_players || 0;
      totalEarnings += parseFloat(String(aff.total_earnings || '0'));
    });
    
    const activePercentage = totalAffiliates > 0 
      ? Math.round((activeAffiliates / totalAffiliates) * 100) 
      : 0;
    
    const circumference = 2 * Math.PI * CIRCLE_RADIUS;
    const strokeDasharray = `${(activePercentage / 100) * circumference} ${circumference}`;
    
    return {
      totalAffiliates,
      activeAffiliates,
      totalPlayers,
      totalEarnings,
      activePercentage,
      strokeDasharray,
    };
  }, [affiliates]);

  // Early returns for special states
  if (!canViewAffiliates) {
    return (
      <WidgetWrapper>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Restricted Access
        </div>
      </WidgetWrapper>
    );
  }

  if (isLoading) {
    return (
      <WidgetWrapper>
        <LoadingState />
      </WidgetWrapper>
    );
  }

  if (error) {
    return (
      <WidgetWrapper>
        <ErrorState message={error} />
      </WidgetWrapper>
    );
  }

  return (
    <WidgetWrapper>
      {/* Main circular progress indicator with enhanced design */}
      <div className="relative w-32 h-32 mx-auto mb-6">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 blur-xl" />
        
        {/* SVG Circle */}
        <svg className="relative w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle with gradient */}
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--muted))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--muted))" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={CIRCLE_RADIUS}
            stroke="url(#bgGradient)"
            strokeWidth={CIRCLE_STROKE_WIDTH}
            fill="none"
          />
          
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={CIRCLE_RADIUS}
            stroke="url(#progressGradient)"
            strokeWidth={CIRCLE_STROKE_WIDTH}
            fill="none"
            strokeDasharray={metrics.strokeDasharray}
            className="transition-all duration-700 ease-out"
            strokeLinecap="round"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {metrics.activeAffiliates}
            </div>
            <div className="text-xs text-muted-foreground/80 font-medium mt-0.5">
              of {metrics.totalAffiliates}
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-1 font-medium">
              active
            </div>
          </div>
        </div>
      </div>

      {/* Metrics grid with enhanced cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Players Referred */}
        <div className="group relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 border border-primary/20 hover:border-primary/30 transition-all duration-200 overflow-hidden">
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-primary/10 mb-2">
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metrics.totalPlayers}
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Players Referred
            </div>
          </div>
        </div>
        
        {/* Active Rate */}
        <div className="group relative bg-gradient-to-br from-muted/30 via-muted/10 to-transparent p-4 border border-border/50 hover:border-border/70 transition-all duration-200 overflow-hidden">
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-muted/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center justify-center w-8 h-8 bg-muted/30 mb-2">
              <svg className="w-4 h-4 text-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metrics.activePercentage}%
            </div>
            <div className="text-xs text-muted-foreground font-medium">
              Active Rate
            </div>
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
});
