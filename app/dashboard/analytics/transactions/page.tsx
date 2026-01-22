'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
import { Button, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { AnalyticsTabs } from '@/components/dashboard/layout/analytics-tabs';

// Import shared utilities
import { US_STATES, getDateRange } from '../analytics-utils';

export default function TransactionAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading: loadingDashboard, error: dashboardError } = useAdminAnalytics();

  // Filter state
  const [datePreset, setDatePreset] = useState('last_3_months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [showFilters, setShowFilters] = useState(true);

  // Initialize date range
  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  // Build filters object
  const filters = useMemo<AnalyticsFilters>(() => {
    const filterObj: AnalyticsFilters = {};
    if (startDate) filterObj.start_date = startDate;
    if (endDate) filterObj.end_date = endDate;
    if (username) filterObj.username = username;
    if (state) filterObj.state = state;
    if (gender) filterObj.gender = gender;
    return filterObj;
  }, [startDate, endDate, username, state, gender]);

  // Fetch analytics data
  const { data: transactionSummary, loading: loadingSummary } = useTransactionSummary(filters);
  const { data: paymentMethods, loading: loadingPaymentMethods } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus } = useBonusAnalytics(filters);

  // Redirect if user is not a company admin
  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset('last_3_months');
    const range = getDateRange('last_3_months');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = username || state || gender || datePreset !== 'last_3_months';

  // Format payment method name
  const formatPaymentMethodName = (name: string): string => {
    return name.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Loading state
  if (loadingDashboard) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg bg-muted/50 animate-pulse shrink-0" />
            <div className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 bg-muted/50 rounded animate-pulse shrink-0" />
            <div className="flex-1 min-w-0" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (dashboardError) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
            <div className="p-4 rounded-full bg-red-500/10 text-red-500 mb-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Unable to Load Analytics</h2>
            <p className="text-muted-foreground max-w-md mb-6">{dashboardError}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate max values for progress bars
  const maxPaymentPurchase = paymentMethods.length > 0
    ? Math.max(...paymentMethods.map(m => m.purchase ?? 0))
    : 0;

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header - Compact */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Analytics
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Filter Toggle Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 text-xs bg-primary/20 rounded-full">Active</span>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={handleClearFilters} className="text-muted-foreground hover:text-foreground gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear All
                </Button>
              )}
            </div>
          </div>
          <div className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Date Filter */}
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span className="text-xs text-muted-foreground">3.1</span>
                  Date Range
                </label>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select
                    value={datePreset}
                    onChange={(value: string) => handlePresetChange(value)}
                    options={[
                      { value: 'today', label: 'Today' },
                      { value: 'yesterday', label: 'Yesterday' },
                      { value: 'this_month', label: 'This Month' },
                      { value: 'last_month', label: 'Last Month' },
                      { value: 'last_30_days', label: 'Last 30 Days' },
                      { value: 'last_3_months', label: 'Last 3 Months' },
                      { value: 'custom', label: 'Custom Range' },
                    ]}
                  />
                  {datePreset === 'custom' && (
                    <>
                      <div className="date-input-wrapper">
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          max={endDate || undefined}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div className="date-input-wrapper">
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || undefined}
                          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Username Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">3.2</span>
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Exact username"
                  className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              {/* State Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">3.3</span>
                  State
                </label>
                <Select
                  value={state}
                  onChange={(value: string) => setState(value)}
                  options={US_STATES}
                  placeholder="All States"
                />
              </div>

              {/* Gender Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">3.4</span>
                  Gender
                </label>
                <Select
                  value={gender}
                  onChange={(value: string) => setGender(value as 'male' | 'female' | '')}
                  options={[
                    { value: '', label: 'All' },
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                  ]}
                  placeholder="All"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Overview Stats */}
      {analyticsData && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Players</div>
            <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{analyticsData.total_players ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Managers</div>
            <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{analyticsData.total_managers ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Agents</div>
            <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{analyticsData.total_agents ?? 0}</div>
          </div>
          <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Staff</div>
            <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{analyticsData.total_staffs ?? 0}</div>
          </div>
        </div>
      )}

      {/* Analytics Tabs */}
      <AnalyticsTabs />

      {/* Transaction Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Transaction Analytics</h3>
        </div>
        <div className="p-4 space-y-6">
          {/* Summary Metrics */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Summary Metrics</h4>
            <p className="text-xs text-muted-foreground dark:text-slate-400">
              Excludes manual and bonus transactions
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              {loadingSummary ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-3" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))
              ) : transactionSummary ? (
                <>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Purchase</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(transactionSummary.total_purchase)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of completed purchases (excl. manual/bonus)</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Cashout</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(transactionSummary.total_cashout)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of completed cashouts (excl. manual/bonus)</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Transfer</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(transactionSummary.total_transfer)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of transfers (excl. bonus)</div>
                  </div>
                </>
              ) : (
                <div className="col-span-3 text-center py-8 text-muted-foreground">No transaction data available</div>
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Payment Method Breakdown</h4>
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              {loadingPaymentMethods ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted/50 rounded w-32 mb-2" />
                      <div className="h-3 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
              ) : paymentMethods.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-4 font-medium">Payment Method</th>
                        <th className="text-right p-4 font-medium">Purchase</th>
                        <th className="text-right p-4 font-medium">Bonus</th>
                        <th className="text-right p-4 font-medium">Avg Bonus %</th>
                        <th className="text-right p-4 font-medium">Cashout</th>
                        <th className="text-right p-4 font-medium">Success Rate</th>
                        <th className="text-right p-4 font-medium">Avg Tx Size</th>
                        <th className="text-right p-4 font-medium">Usage %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {paymentMethods.map((method, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                                {formatPaymentMethodName(method.payment_method).charAt(0)}
                              </div>
                              <span className="font-medium">{formatPaymentMethodName(method.payment_method)}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-semibold text-emerald-500">
                            {formatCurrency(method.purchase ?? 0)}
                          </td>
                          <td className="p-4 text-right text-amber-500">
                            {formatCurrency(method.bonus ?? 0)}
                          </td>
                          <td className="p-4 text-right">
                            {method.average_bonus_pct?.toFixed(1) ?? 0}%
                          </td>
                          <td className="p-4 text-right text-rose-500">
                            {formatCurrency(method.cashout ?? 0)}
                          </td>
                          <td className="p-4 text-right">
                            <span className={method.success_rate && method.success_rate >= 90 ? 'text-emerald-500' : method.success_rate && method.success_rate >= 70 ? 'text-amber-500' : 'text-rose-500'}>
                              {method.success_rate?.toFixed(1) ?? 0}%
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {formatCurrency(method.average_transaction_size ?? 0)}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${method.usage_distribution_pct ?? 0}%` }} />
                              </div>
                              <span className="text-xs w-10">{method.usage_distribution_pct?.toFixed(1) ?? 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No payment method data available</div>
              )}
            </div>
          </div>

          {/* Bonus Analytics */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Bonus Analytics</h4>
            {loadingBonus ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-2" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))}
              </div>
            ) : bonusAnalytics ? (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Bonus</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(bonusAnalytics.total_bonus)}</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of all bonus amounts across all types</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Purchase Bonus</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(bonusAnalytics.purchase_bonus)}</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of purchase bonus amounts</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Avg Purchase Bonus %</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{bonusAnalytics.average_purchase_bonus_percent?.toFixed(2) ?? 0}%</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">(Purchase Bonus / Total Purchase) × 100</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Signup Bonus</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(bonusAnalytics.signup_bonus)}</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Welcome/signup bonus amounts</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">First Deposit Bonus</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(bonusAnalytics.first_deposit_bonus)}</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">First deposit bonus amounts</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Transfer Bonus</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(bonusAnalytics.transfer_bonus)}</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Bonus from transfer transactions</div>
                </div>
                <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                  <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Avg Transfer Bonus %</div>
                  <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{bonusAnalytics.average_transfer_bonus_percent?.toFixed(2) ?? 0}%</div>
                  <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">(Transfer Bonus / Total Transfer) × 100</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No bonus data available</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
