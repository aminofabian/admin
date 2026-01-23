'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { useGameSummary, useGamesByGame } from '@/hooks/use-analytics-games';
import { Button, Select } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { US_STATES, getDateRange } from '../analytics-utils';

// Progress Bar Component
function ProgressBar({ value, max, colorClass }: { value: number; max: number; colorClass: string }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ease-out ${colorClass}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function GameActivityAnalyticsPage() {
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
  const { data: gameSummary, loading: loadingGameSummary } = useGameSummary(filters);
  const { data: gamesByGame, loading: loadingGamesByGame } = useGamesByGame(filters);

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
  const maxGameRecharge = gamesByGame.length > 0
    ? Math.max(...gamesByGame.map(g => g.recharge ?? 0))
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
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
          <div className="p-4 relative">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {/* Date Filter */}
              <div className="space-y-2 lg:col-span-2 relative">
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
              <div className="space-y-2 relative">
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
              <div className="space-y-2 relative">
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
              <div className="space-y-2 relative">
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

      {/* Game Activity Analytics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Game Activity Analytics</h3>
        </div>
        <div className="p-4 space-y-6">
          {/* Summary Metrics (All Games Combined) */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Summary Metrics (All Games Combined)</h4>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {loadingGameSummary ? (
                [...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-card/50 p-6 animate-pulse">
                    <div className="h-4 bg-muted/50 rounded w-24 mb-3" />
                    <div className="h-8 bg-muted/50 rounded w-32" />
                  </div>
                ))
              ) : gameSummary ? (
                <>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Recharge</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(gameSummary.total_recharge)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of all game recharges (base)</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Bonus</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(gameSummary.total_bonus)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of all game recharge bonuses</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Average Bonus %</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{gameSummary.average_bonus_pct?.toFixed(2) ?? 0}%</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">(Total Bonus / Total Recharge) × 100</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Total Redeem</div>
                    <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{formatCurrency(gameSummary.total_redeem)}</div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">Sum of all game redemptions</div>
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
                    <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">Net Game Activity</div>
                    <div className={`mt-1 text-xl sm:text-2xl font-semibold ${gameSummary.net_game_activity >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatCurrency(gameSummary.net_game_activity)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground dark:text-slate-400">(Recharge + Bonus) - Redeem</div>
                  </div>
                </>
              ) : (
                <div className="col-span-5 text-center py-8 text-muted-foreground">No game summary data available</div>
              )}
            </div>
          </div>

          {/* Per-Game Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Per-Game Breakdown</h4>
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              {loadingGamesByGame ? (
                <div className="p-6 space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-muted/50 rounded w-32 mb-2" />
                      <div className="h-3 bg-muted/30 rounded" />
                    </div>
                  ))}
                </div>
              ) : gamesByGame.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-4 font-medium">Game</th>
                        <th className="text-right p-4 font-medium">Recharge</th>
                        <th className="text-right p-4 font-medium">Bonus</th>
                        <th className="text-right p-4 font-medium">Avg Bonus %</th>
                        <th className="text-right p-4 font-medium">Redeem</th>
                        <th className="text-right p-4 font-medium">Net Activity</th>
                        <th className="text-left p-4 font-medium w-32">Volume</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {gamesByGame.map((game, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
                                </svg>
                              </div>
                              <span className="font-medium">{game.game_title}</span>
                            </div>
                          </td>
                          <td className="p-4 text-right font-semibold text-emerald-500">
                            {formatCurrency(game.recharge)}
                          </td>
                          <td className="p-4 text-right text-amber-500">
                            {formatCurrency(game.bonus)}
                          </td>
                          <td className="p-4 text-right">
                            {game.average_bonus_pct?.toFixed(1) ?? 0}%
                          </td>
                          <td className="p-4 text-right text-rose-500">
                            {formatCurrency(game.redeem)}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`font-semibold ${game.net_game_activity >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {formatCurrency(game.net_game_activity)}
                            </span>
                          </td>
                          <td className="p-4">
                            <ProgressBar
                              value={game.recharge ?? 0}
                              max={maxGameRecharge}
                              colorClass="bg-gradient-to-r from-violet-500 to-purple-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground">No game data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
