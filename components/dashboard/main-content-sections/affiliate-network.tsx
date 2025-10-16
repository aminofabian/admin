'use client';

import { useEffect } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';

export function ServerUptimeGauge() {
  const { user } = useAuth();
  const { affiliates, fetchAffiliates } = useAffiliatesStore();
  
  const canViewAffiliates = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canViewAffiliates) {
      fetchAffiliates();
    }
  }, [canViewAffiliates, fetchAffiliates]);

  // Calculate stats from real data
  const totalAffiliates = affiliates?.count || 0;
  const activeAffiliates = affiliates?.results?.filter(aff => aff.total_players > 0).length || 0;
  
  const percentage = totalAffiliates > 0 ? (activeAffiliates / totalAffiliates) * 100 : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

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

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">Affiliate Network</h3>
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto">
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
            active agents
          </span>
        </div>
      </div>
    </div>
  );
}
