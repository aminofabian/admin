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
    <div className="border border-border/30 bg-card p-4 animate-pulse">
      <div className="mb-3 h-3 w-20 bg-muted/40" />
      <div className="h-7 w-28 bg-muted/40" />
    </div>
  );
}

function TableSkel() {
  return (
    <div className="space-y-3 p-5">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-7 w-7 shrink-0 bg-muted/30" />
          <div className="h-3 flex-1 bg-muted/20" />
          <div className="h-3 w-16 bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

type MetricTone = 'cash_in' | 'cash_out' | 'count' | 'bonus' | 'avg' | 'transfer' | 'derived';

function ApiMetricCard({
  fieldKey,
  children,
  tone = 'count',
  className = '',
}: {
  fieldKey: string;
  children: ReactNode;
  tone?: MetricTone;
  className?: string;
}) {
  const toneClass: Record<MetricTone, string> = {
    cash_in: 'bg-emerald-500/[0.06] dark:bg-emerald-500/10',
    cash_out: 'bg-rose-500/[0.06] dark:bg-rose-500/10',
    count: 'bg-sky-500/[0.05] dark:bg-sky-500/10',
    bonus: 'bg-amber-500/[0.07] dark:bg-amber-500/12',
    avg: 'bg-orange-500/[0.05] dark:bg-orange-500/10',
    transfer: 'bg-violet-500/[0.06] dark:bg-violet-500/10',
    derived: 'bg-gradient-to-br from-amber-500/10 via-card to-card dark:from-amber-500/15',
  };
  return (
    <div className={`border border-border/50 p-3 ${toneClass[tone]} ${className}`}>
      <p className="break-all font-mono text-[10px] leading-snug text-muted-foreground">{fieldKey}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function AnalyticsSection({
  eyebrow,
  title,
  hint,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border border-border/60 bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h2 className={`text-base font-semibold tracking-tight text-foreground ${eyebrow ? 'mt-1' : ''}`}>{title}</h2>
          {hint ? <p className="mt-1 max-w-3xl font-mono text-[10px] leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

export default function GameActivityAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: analyticsData, loading: loadingDashboard, error: dashboardError } = useAdminAnalytics();

  const [datePreset, setDatePreset] = useState('last_3_months');
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
    setDatePreset('last_3_months');
    const range = getDateRange('last_3_months');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = Boolean(username || state || gender || datePreset !== 'last_3_months');

  const maxGameRecharge = useMemo(
    () => (gamesByGame.length > 0 ? Math.max(...gamesByGame.map(g => g.recharge ?? 0)) : 0),
    [gamesByGame],
  );

  if (loadingDashboard) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-16 bg-muted/25 animate-pulse" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map(i => (
            <CardSkel key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 bg-rose-500/10 p-4 text-rose-500">
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
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Game activity analytics</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Dashboard snapshot is organization-wide. Summary and per-game rows follow the filters below.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center justify-center gap-2 border px-3 py-2 text-sm font-medium ${
            showFilters
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:bg-muted/50'
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
            />
          </svg>
          {showFilters ? 'Hide filters' : 'Show filters'}
          {hasActiveFilters ? <span className="h-1.5 w-1.5 bg-primary" title="Scope changed" /> : null}
        </button>
      </div>

      {showFilters ? (
        <AnalyticsSection
          eyebrow="Filters"
          title="Scope"
          hint="Applies to: games/summary · games/by-game"
          action={
            hasActiveFilters ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-sm font-medium text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                Clear all
              </button>
            ) : null
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              className="w-full border border-border bg-background px-2.5 py-2 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
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
            <div className="mt-4 grid max-w-md grid-cols-2 gap-3 border-t border-border/50 pt-4">
              <DateSelect label="Start" value={startDate} onChange={setStartDate} />
              <DateSelect label="End" value={endDate} onChange={setEndDate} />
            </div>
          ) : null}
        </AnalyticsSection>
      ) : null}

      <div className="space-y-6">
        {analyticsData ? (
          <AnalyticsSection
            eyebrow="Dashboard"
            title="Organization"
            hint="analytics/dashboard/ — not affected by filters below"
          >
            <div className="space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <ApiMetricCard fieldKey="total_cash_in" tone="cash_in">
                  <p className="text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(analyticsData.total_cash_in ?? 0)}
                  </p>
                </ApiMetricCard>
                <ApiMetricCard fieldKey="total_cashout" tone="cash_out">
                  <p className="text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                    {formatCurrency(analyticsData.total_cashout ?? 0)}
                  </p>
                </ApiMetricCard>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">People</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <ApiMetricCard fieldKey="total_players" tone="count">
                    <p className="text-lg font-bold tabular-nums">{(analyticsData.total_players ?? 0).toLocaleString()}</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="total_agents" tone="count">
                    <p className="text-lg font-bold tabular-nums">{(analyticsData.total_agents ?? 0).toLocaleString()}</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="total_managers" tone="count">
                    <p className="text-lg font-bold tabular-nums">{(analyticsData.total_managers ?? 0).toLocaleString()}</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="total_staffs" tone="count">
                    <p className="text-lg font-bold tabular-nums">{(analyticsData.total_staffs ?? 0).toLocaleString()}</p>
                  </ApiMetricCard>
                </div>
              </div>
            </div>
          </AnalyticsSection>
        ) : null}

        <AnalyticsSection
          eyebrow="Summary"
          title="Game activity totals"
          hint="games/summary/"
          action={
            <span className="text-xs text-muted-foreground">{hasActiveFilters ? 'Custom scope' : 'Date range only'}</span>
          }
        >
          {loadingGameSummary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : gameSummaryError ? (
            <p className="text-center text-sm text-destructive">{gameSummaryError}</p>
          ) : gameSummary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <ApiMetricCard fieldKey="total_recharge" tone="cash_in">
                <p className="text-lg font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(gameSummary.total_recharge)}
                </p>
              </ApiMetricCard>
              <ApiMetricCard fieldKey="total_bonus" tone="bonus">
                <p className="text-lg font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatCurrency(gameSummary.total_bonus)}
                </p>
              </ApiMetricCard>
              <ApiMetricCard fieldKey="average_bonus_pct" tone="avg">
                <p className="text-lg font-bold tabular-nums text-orange-700 dark:text-orange-300">
                  {gameSummary.average_bonus_pct.toFixed(2)}
                  <span className="ml-0.5 text-xs font-semibold text-muted-foreground">%</span>
                </p>
              </ApiMetricCard>
              <ApiMetricCard fieldKey="total_redeem" tone="cash_out">
                <p className="text-lg font-bold tabular-nums text-rose-700 dark:text-rose-300">
                  {formatCurrency(gameSummary.total_redeem)}
                </p>
              </ApiMetricCard>
              <ApiMetricCard fieldKey="net_game_activity" tone="derived" className="relative overflow-hidden">
                <div
                  className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-amber-500/15 blur-2xl"
                  aria-hidden
                />
                <p
                  className={`relative text-lg font-bold tabular-nums ${
                    gameSummary.net_game_activity >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {formatCurrency(gameSummary.net_game_activity)}
                </p>
              </ApiMetricCard>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No game summary data</p>
          )}
        </AnalyticsSection>

        <AnalyticsSection
          eyebrow="Breakdown"
          title="By game"
          hint="games/by-game/"
          action={
            gamesByGame.length > 0 ? (
              <span className="text-xs tabular-nums text-muted-foreground">{gamesByGame.length} rows</span>
            ) : null
          }
        >
          {gamesByGameError ? (
            <p className="text-center text-sm text-destructive">{gamesByGameError}</p>
          ) : loadingGamesByGame ? (
            <TableSkel />
          ) : gamesByGame.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Game
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      game_code
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      recharge
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      bonus
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      average_bonus_pct
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      redeem
                    </th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      net_game_activity
                    </th>
                    <th className="w-24 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Volume
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {gamesByGame.map((game, idx) => {
                    const pct = maxGameRecharge > 0 ? Math.min(((game.recharge ?? 0) / maxGameRecharge) * 100, 100) : 0;
                    const title = game.game_title || game.game_code || '—';
                    const rowKey = game.game_code ?? game.game_id ?? `${title}-${idx}`;
                    return (
                      <tr key={String(rowKey)} className="transition-colors hover:bg-muted/10">
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-violet-500/10 text-[9px] font-bold text-violet-600 dark:text-violet-400">
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
                          {game.bonus > 0 ? (
                            <span className="text-amber-600 dark:text-amber-400">{formatCurrency(game.bonus)}</span>
                          ) : (
                            <span className="text-muted-foreground/25">&mdash;</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {game.average_bonus_pct > 0 ? `${game.average_bonus_pct.toFixed(1)}%` : <span className="text-muted-foreground/25">&mdash;</span>}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {game.redeem > 0 ? (
                            <span className="text-rose-600 dark:text-rose-400">{formatCurrency(game.redeem)}</span>
                          ) : (
                            <span className="text-muted-foreground/25">&mdash;</span>
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
                        <td className="px-4 py-2">
                          <div className="h-1 w-full overflow-hidden bg-muted/30">
                            <div className="h-full bg-violet-500/50 transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-xs text-muted-foreground">No per-game rows</p>
          )}
        </AnalyticsSection>
      </div>
    </div>
  );
}
