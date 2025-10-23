'use client';

import { useEffect } from 'react';
import { useAffiliatesStore } from '@/stores';

export function FeaturedAffiliateWidget() {
  const { affiliates, isLoading, error, fetchAffiliates } = useAffiliatesStore();

  // Fetch affiliates on mount if not already loaded
  useEffect(() => {
    if (!affiliates && !isLoading) {
      fetchAffiliates();
    }
  }, [affiliates, isLoading, fetchAffiliates]);

  // Get the top performing affiliate
  const topAffiliate = affiliates?.results
    ? [...affiliates.results].sort((a, b) => b.total_earnings - a.total_earnings)[0]
    : null;

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <p>Failed to load affiliate data</p>
        </div>
      </div>
    );
  }

  // Handle no data state
  if (!topAffiliate) {
    return (
      <div className="bg-card rounded-xl p-4 border border-border">
        <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
          <p>No affiliate data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl p-4 border border-border">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        Top Performing Affiliate
      </h3>
      
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center border border-border">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold text-foreground truncate">
            {topAffiliate.name}
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {topAffiliate.email}
          </div>
        </div>
      </div>

      <div className="bg-primary/5 rounded-lg p-4 mb-4 border border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Earnings</div>
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(topAffiliate.total_earnings)}
            </div>
          </div>
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-border/50">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Players</div>
          <div className="text-sm font-semibold text-foreground">
            {formatCount(topAffiliate.total_players)}
          </div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Commission</div>
          <div className="text-sm font-semibold text-primary">{topAffiliate.affiliate_percentage}%</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Top-ups</div>
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(topAffiliate.total_topup)}
          </div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border/50">
          <div className="text-xs text-muted-foreground mb-1">Cash-outs</div>
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(topAffiliate.total_cashout)}
          </div>
        </div>
      </div>
    </div>
  );
}
