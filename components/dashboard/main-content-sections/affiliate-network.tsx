'use client';

import { useEffect } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { LoadingState } from '@/components/features/loading-state';
import { ErrorState } from '@/components/features/error-state';

export function AffiliateNetworkWidget() {
  const { user } = useAuth();
  const { affiliates, isLoading, error, fetchAffiliates } = useAffiliatesStore();
  
  const canViewAffiliates = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canViewAffiliates) {
      fetchAffiliates();
    }
  }, [canViewAffiliates, fetchAffiliates]);

  // Calculate meaningful affiliate network metrics
  const totalAffiliates = affiliates?.count || 0;
  const affiliateData = affiliates?.results || [];
  
  // Active affiliates: those with players AND earnings (indicating real activity)
  const activeAffiliates = affiliateData.filter(aff => 
    aff.total_players > 0 && aff.total_earnings > 0
  ).length;
  
  // Top performers: affiliates with significant earnings
  const topPerformers = affiliateData.filter(aff => 
    aff.total_earnings > 1000 // Adjust threshold as needed
  ).length;
  
  const activePercentage = totalAffiliates > 0 ? (activeAffiliates / totalAffiliates) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(activePercentage / 100) * circumference} ${circumference}`;

  // Show placeholder if no permission
  if (!canViewAffiliates) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Restricted Access
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
        <LoadingState />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
        <ErrorState message={error} />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
      
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
            strokeDasharray={strokeDasharray}
            className="text-primary"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg sm:text-2xl font-bold text-foreground">
            {activeAffiliates}
          </span>
          <span className="text-xs text-muted-foreground">
            of {totalAffiliates}
          </span>
          <span className="text-[10px] text-muted-foreground mt-1">
            active affiliates
          </span>
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">{topPerformers}</div>
          <div className="text-xs text-muted-foreground">top performers</div>
        </div>
        <div className="bg-muted/30 rounded-lg p-2">
          <div className="text-sm font-semibold text-foreground">
            {Math.round(activePercentage)}%
          </div>
          <div className="text-xs text-muted-foreground">active rate</div>
        </div>
      </div>
    </div>
  );
}
