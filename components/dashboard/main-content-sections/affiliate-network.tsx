'use client';

import { useEffect, useMemo, useCallback, memo } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

// Wrapper component to avoid duplication
const WidgetWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <div className="bg-card rounded-xl p-4 border border-border">
    <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
    {children}
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
    
    // Single pass through data to calculate both metrics (optimization)
    let activeAffiliates = 0;
    let topPerformers = 0;
    const TOP_PERFORMER_THRESHOLD = 1000;
    
    affiliateData.forEach(aff => {
      const hasActivity = aff.total_players > 0 && aff.total_earnings > 0;
      if (hasActivity) activeAffiliates++;
      if (aff.total_earnings > TOP_PERFORMER_THRESHOLD) topPerformers++;
    });
    
    const activePercentage = totalAffiliates > 0 ? (activeAffiliates / totalAffiliates) * 100 : 0;
    const circumference = 2 * Math.PI * 40;
    const strokeDasharray = `${(activePercentage / 100) * circumference} ${circumference}`;
    
    return {
      totalAffiliates,
      activeAffiliates,
      topPerformers,
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
      {/* Main circular progress indicator */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto mb-4">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={metrics.strokeDasharray}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold text-foreground">
            {metrics.activeAffiliates}
          </span>
          <span className="text-xs text-muted-foreground">
            of {metrics.totalAffiliates}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">
            active affiliates
          </span>
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">{metrics.topPerformers}</div>
          <div className="text-xs text-muted-foreground">top performers</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">
            {Math.round(metrics.activePercentage)}%
          </div>
          <div className="text-xs text-muted-foreground">active rate</div>
        </div>
      </div>
    </WidgetWrapper>
  );
});
