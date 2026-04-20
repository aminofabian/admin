'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { useGameSummary, useGamesByGame } from '@/hooks/use-analytics-games';
import { Button, Select, DateSelect } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, type ReactNode } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { US_STATES, getDateRange } from '../analytics-utils';

function CardSkel() {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 animate-pulse">
      <div className="mb-3 h-3 w-20 rounded bg-muted/40" />
      <div className="h-7 w-28 rounded bg-muted/40" />
    </div>
  );
}

function TableSkel() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/30" />
          <div className="h-3 flex-1 rounded bg-muted/20" />
          <div className="h-3 w-16 rounded bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

/** API snake_case (or dotted paths) → Title Case With Spaces for display. */
function apiFieldLabel(apiKey: string): string {
  return apiKey
    .split(/[._]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Label from API key; value = formatted as in the payload. */
function ApiLabeledValue({ apiKey, children }: { apiKey: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="break-words text-[10px] font-medium leading-snug text-muted-foreground">{apiFieldLabel(apiKey)}</p>
      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{children}</div>
    </div>
  );
}

export default function GameActivityAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading: loadingDashboard, error: dashboardError } = useAdminAnalytics();

  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  const filters = useMemo<AnalyticsFilters>(() => {
    const f: AnalyticsFilters = {};
    if (startDate) f.start_date = startDate;
    if (endDate) f.end_date = endDate;
    if (username) f.username = username;
    if (state) f.state = state;
    if (gender) f.gender = gender;
    return f;
  }, [startDate, endDate, username, state, gender]);

  const { data: gameSummary, loading: loadingGameSummary, error: gameSummaryError } = useGameSummary(filters);
  const { data: gamesByGame, loading: loadingGamesByGame, error: gamesByGameError } = useGamesByGame(filters);

  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) router.replace('/dashboard');
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
    setDatePreset('today');
    const range = getDateRange('today');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = Boolean(username || state || gender || datePreset !== 'today');

  if (loadingDashboard) {
    return (
      <div className="space-y-4">
        <div className="h-14 animate-pulse rounded-xl bg-muted/20" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <CardSkel key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-2xl bg-rose-500/10 p-4 text-rose-500">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h2 className="mb-1 text-lg font-semibold text-foreground">Unable to Load Analytics</h2>
        <p className="mb-5 max-w-sm text-sm text-muted-foreground">{dashboardError}</p>
        <Button onClick={() => window.location.reload()} variant="primary" size="sm">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Game activities</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Organization totals come from the dashboard <span className="font-medium">{apiFieldLabel('data')}</span> object;
            filtered blocks use <span className="font-medium">{apiFieldLabel('games.summary')}</span> and{' '}
            <span className="font-medium">{apiFieldLabel('games.by_game')}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            showFilters
              ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
            />
          </svg>
          Filters
          {hasActiveFilters ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
        </button>
      </div>

      {showFilters ? (
        <div className="relative z-20 flex flex-wrap items-center gap-2.5 rounded-lg border border-border/40 bg-card px-3 py-2 shadow-sm lg:flex-nowrap">
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Filters</span>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-[10px] font-medium text-rose-500 transition-colors hover:text-rose-600"
              >
                clear
              </button>
            ) : null}
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-4">
            <Select
              value={datePreset}
              onChange={(v: string) => handlePresetChange(v)}
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
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <Select value={state} onChange={(v: string) => setState(v)} options={US_STATES} placeholder="All States" />
            <Select
              value={gender}
              onChange={(v: string) => setGender(v as 'male' | 'female' | '')}
              options={[{ value: '', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
              placeholder="Gender"
            />
          </div>
          {datePreset === 'custom' ? (
            <div className="mt-2 grid w-full max-w-xs grid-cols-2 gap-2 lg:mt-0 lg:w-auto">
              <DateSelect label="Start" value={startDate} onChange={setStartDate} />
              <DateSelect label="End" value={endDate} onChange={setEndDate} />
            </div>
          ) : null}
        </div>
      ) : null}

      {analyticsData ? (
        <div className="overflow-hidden rounded-xl border border-border/30 bg-card p-4 shadow-sm sm:p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dashboard <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
            <span className="mt-0.5 block font-normal normal-case text-[9px] opacity-80">
              Same fields as the API response {apiFieldLabel('status')} / {apiFieldLabel('data')}
            </span>
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <ApiLabeledValue apiKey="total_cash_in">{formatCurrency(analyticsData.total_cash_in)}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_cashout">{formatCurrency(analyticsData.total_cashout)}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_players">{analyticsData.total_players}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_agents">{analyticsData.total_agents}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_managers">{analyticsData.total_managers}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_staffs">{analyticsData.total_staffs}</ApiLabeledValue>
          </div>
        </div>
      ) : null}

      <p className="px-0.5 text-[10px] text-muted-foreground">
        Filtered: {apiFieldLabel('total_recharge')}, {apiFieldLabel('total_bonus')}, {apiFieldLabel('average_bonus_pct')},{' '}
        {apiFieldLabel('total_redeem')}, {apiFieldLabel('net_game_activity')}; per row: {apiFieldLabel('game_title')},{' '}
        {apiFieldLabel('game_code')}, {apiFieldLabel('game_id')}, …
      </p>

      <div className="overflow-hidden rounded-2xl border border-border/30 shadow-sm">
        {loadingGameSummary ? (
          <div className="grid grid-cols-2 bg-card lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse border-r border-border/10 px-5 py-4 last:border-r-0">
                <div className="mb-2.5 h-2.5 w-14 rounded bg-muted/40" />
                <div className="h-5 w-20 rounded bg-muted/40" />
              </div>
            ))}
          </div>
        ) : gameSummaryError ? (
          <div className="bg-card px-5 py-8 text-center text-sm text-rose-600 dark:text-rose-400">{gameSummaryError}</div>
        ) : gameSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-5">
            <div className="border-l-[3px] border-l-emerald-500 border-r border-border/10 bg-card px-5 py-3.5">
              <p className="break-words text-[10px] font-medium leading-snug text-muted-foreground">
                {apiFieldLabel('total_recharge')}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(gameSummary.total_recharge)}
              </p>
            </div>
            <div className="border-l-[3px] border-l-amber-500 border-r border-border/10 bg-card px-5 py-3.5">
              <p className="break-words text-[10px] font-medium leading-snug text-muted-foreground">
                {apiFieldLabel('total_bonus')}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {formatCurrency(gameSummary.total_bonus)}
              </p>
            </div>
            <div className="border-l-[3px] border-l-orange-500 border-r border-border/10 bg-card px-5 py-3.5">
              <p className="break-words text-[10px] font-medium leading-snug text-muted-foreground">
                {apiFieldLabel('average_bonus_pct')}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-orange-600 dark:text-orange-400">
                {gameSummary.average_bonus_pct.toFixed(2)}
                <span className="ml-0.5 text-xs font-semibold text-muted-foreground">%</span>
              </p>
            </div>
            <div className="border-l-[3px] border-l-rose-500 border-r border-border/10 bg-card px-5 py-3.5">
              <p className="break-words text-[10px] font-medium leading-snug text-muted-foreground">
                {apiFieldLabel('total_redeem')}
              </p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(gameSummary.total_redeem)}
              </p>
            </div>
            <div
              className={`px-5 py-3.5 lg:col-span-1 ${
                gameSummary.net_game_activity >= 0
                  ? 'bg-gradient-to-br from-emerald-900 to-emerald-950 dark:from-emerald-900/80 dark:to-emerald-950/90'
                  : 'bg-gradient-to-br from-rose-900 to-rose-950 dark:from-rose-900/80 dark:to-rose-950/90'
              }`}
            >
              <p className="break-words text-[10px] font-medium leading-snug text-white/70">{apiFieldLabel('net_game_activity')}</p>
              <p
                className={`mt-0.5 text-lg font-bold tabular-nums ${
                  gameSummary.net_game_activity >= 0 ? 'text-emerald-200' : 'text-rose-200'
                }`}
              >
                {formatCurrency(gameSummary.net_game_activity)}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-card px-5 py-8 text-center text-sm text-muted-foreground">No game summary data</div>
        )}

        <div className="border-t border-border/15 bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/10 px-4 py-2.5 sm:px-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                By game <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
              </p>
              <p className="font-mono text-[9px] text-muted-foreground/80">games/by-game</p>
            </div>
            {gamesByGame.length > 0 ? (
              <span className="text-[10px] font-medium tabular-nums text-muted-foreground">{gamesByGame.length} rows</span>
            ) : null}
          </div>
          {gamesByGameError ? (
            <p className="px-5 py-8 text-center text-sm text-rose-600 dark:text-rose-400">{gamesByGameError}</p>
          ) : loadingGamesByGame ? (
            <TableSkel />
          ) : gamesByGame.length > 0 ? (
            <div className="overflow-x-auto px-1 pb-4 sm:px-2">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="px-4 py-2 text-left text-[9px] font-medium text-muted-foreground">
                      {apiFieldLabel('game_title')}
                    </th>
                    <th className="px-3 py-2 text-left text-[9px] font-medium text-muted-foreground">
                      {apiFieldLabel('game_code')}
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-medium text-muted-foreground">
                      {apiFieldLabel('recharge')}
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-medium text-muted-foreground">
                      {apiFieldLabel('redeem')}
                    </th>
                    <th className="px-3 py-2 text-right text-[9px] font-medium text-muted-foreground">
                      {apiFieldLabel('net_game_activity')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {gamesByGame.map((game, idx) => {
                    const title = game.game_title || game.game_code || '—';
                    const rowKey = game.game_code ?? game.game_id ?? `${title}-${idx}`;
                    return (
                      <tr key={String(rowKey)} className="transition-colors hover:bg-muted/10">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-400">
                              {title.charAt(0)}
                            </span>
                            <span className="text-xs font-medium text-foreground">{title}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                          {game.game_code ?? <span className="text-muted-foreground/25">&mdash;</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(game.recharge)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {(game.redeem ?? 0) > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">{formatCurrency(game.redeem ?? 0)}</span>
                          ) : (
                            <span className="text-muted-foreground">{formatCurrency(game.redeem ?? 0)}</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span
                            className={`font-semibold ${
                              game.net_game_activity >= 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {formatCurrency(game.net_game_activity)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-center text-xs text-muted-foreground">No per-game rows</p>
          )}
        </div>
      </div>
    </div>
  );
}
