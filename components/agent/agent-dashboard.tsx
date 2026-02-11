'use client';

import { useCallback, useEffect, useState } from 'react';
import { agentsApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils/formatters';
import { Button, DateSelect } from '@/components/ui';
import type { AgentDashboardResponse } from '@/types';

export function AgentDashboard() {
  const [dashboardData, setDashboardData] = useState<AgentDashboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const fetchDashboardData = useCallback(async (params?: { date_from?: string; date_to?: string }) => {
    try {
      setIsLoading(true);
      setError('');
      
      const data = await agentsApi.getDashboard(params);
      setDashboardData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(errorMessage);
      console.error('Error fetching agent dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSearch = useCallback(() => {
    const params: { date_from?: string; date_to?: string } = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    void fetchDashboardData(params);
  }, [dateFrom, dateTo, fetchDashboardData]);

  const stats = dashboardData?.agent_stats;

  if (isLoading && !dashboardData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-center text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex justify-end">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full sm:w-auto">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap">
              Range:
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 flex-1 sm:flex-initial">
              <DateSelect
                label="From"
                value={dateFrom}
                onChange={setDateFrom}
              />
              <span className="text-muted-foreground text-sm whitespace-nowrap text-center hidden sm:inline">to</span>
              <DateSelect
                label="To"
                value={dateTo}
                onChange={setDateTo}
              />
            </div>
          </div>
          <Button 
            onClick={handleSearch} 
            size="sm"
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Search
          </Button>
        </div>
      </div>

      {stats && (
        <div className="flex justify-center">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl items-stretch">
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Earning</p>
                  <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-xl font-semibold text-foreground">{formatCurrency(stats.total_earnings)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Purchase</p>
                <div className="text-xl font-semibold text-foreground">{formatCurrency(stats.total_topup)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Cashout</p>
                <div className="text-xl font-semibold text-foreground">{formatCurrency(stats.total_cashout)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payment Method Fees</p>
                <div className="text-xl font-semibold text-foreground">{formatCurrency(stats.payment_method_fee)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Affiliate Fees</p>
                <div className="text-xl font-semibold text-foreground">{formatCurrency(stats.affiliation_fee)}</div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-4 shadow-sm flex items-center justify-center h-full">
              <div className="flex flex-col items-center text-center gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total players</p>
                <div className="text-xl font-semibold text-foreground">{stats.total_players.toString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

