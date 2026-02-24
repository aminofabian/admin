'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { useGameSummary, useGamesByGame } from '@/hooks/use-analytics-games';
import { Button, Select, DateSelect } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { US_STATES, getDateRange } from '../analytics-utils';

function CardSkel() {
  return (
    <div className="rounded-xl border border-border/30 bg-card p-4 animate-pulse">
      <div className="h-3 bg-muted/40 rounded w-20 mb-3" />
      <div className="h-7 bg-muted/40 rounded w-28" />
    </div>
  );
}

function TableSkel() {
  return (
    <div className="p-5 space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-7 h-7 rounded-lg bg-muted/30 shrink-0" />
          <div className="flex-1 h-3 bg-muted/20 rounded" />
          <div className="w-16 h-3 bg-muted/30 rounded" />
        </div>
      ))}
    </div>
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

  const { data: gameSummary, loading: loadingGameSummary } = useGameSummary(filters);
  const { data: gamesByGame, loading: loadingGamesByGame } = useGamesByGame(filters);

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

  const hasActiveFilters = username || state || gender || datePreset !== 'last_3_months';

  const maxGameRecharge = gamesByGame.length > 0
    ? Math.max(...gamesByGame.map(g => g.recharge ?? 0))
    : 0;

  if (loadingDashboard) {
    return (
      <div className="space-y-4">
        <div className="h-14 rounded-xl bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[0, 1, 2, 3, 4].map(i => <CardSkel key={i} />)}
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 mb-4">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-1 text-foreground">Unable to Load Analytics</h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-5">{dashboardError}</p>
        <Button onClick={() => window.location.reload()} variant="primary" size="sm">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Game Activities</h1>
          {analyticsData && (
            <p className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
              {analyticsData.total_players ?? 0} players &middot; {analyticsData.total_managers ?? 0} managers &middot; {analyticsData.total_agents ?? 0} agents &middot; {analyticsData.total_staffs ?? 0} staff
            </p>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showFilters
              ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          Filters
          {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
        </button>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="relative z-20 flex items-center gap-2.5 rounded-lg border border-border/40 bg-card px-3 py-2 shadow-sm flex-wrap lg:flex-nowrap">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
            {hasActiveFilters && (
              <button onClick={handleClearFilters} className="text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors">clear</button>
            )}
          </div>
          <div className="flex-1 grid gap-2 grid-cols-2 lg:grid-cols-4">
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
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <Select value={state} onChange={(v: string) => setState(v)} options={US_STATES} placeholder="All States" />
            <Select
              value={gender}
              onChange={(v: string) => setGender(v as 'male' | 'female' | '')}
              options={[{ value: '', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
              placeholder="Gender"
            />
          </div>
          {datePreset === 'custom' && (
            <div className="grid grid-cols-2 gap-2 mt-2 max-w-xs w-full lg:w-auto lg:mt-0">
              <DateSelect label="Start" value={startDate} onChange={setStartDate} />
              <DateSelect label="End" value={endDate} onChange={setEndDate} />
            </div>
          )}
        </div>
      )}

      {/* ── Game Summary (unified card) ── */}
      <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {loadingGameSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="bg-card px-5 py-4 animate-pulse border-r border-border/10 last:border-r-0">
                <div className="h-2.5 w-14 bg-muted/40 rounded mb-2.5" />
                <div className="h-5 w-20 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        ) : gameSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-5">
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-emerald-500 border-r border-border/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recharge</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(gameSummary.total_recharge)}</p>
            </div>
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-amber-500 border-r border-border/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Bonus</p>
              <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400 mt-0.5">{formatCurrency(gameSummary.total_bonus)}</p>
            </div>
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-blue-500 border-r border-border/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Bonus</p>
              <p className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400 mt-0.5">
                {gameSummary.average_bonus_pct?.toFixed(2) ?? 0}<span className="text-xs font-semibold text-blue-400/50 ml-0.5">%</span>
              </p>
            </div>
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-rose-500 border-r border-border/10">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Redeem</p>
              <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(gameSummary.total_redeem)}</p>
            </div>
            <div className={`px-5 py-3.5 ${
              gameSummary.net_game_activity >= 0
                ? 'bg-gradient-to-br from-emerald-900 to-emerald-950 dark:from-emerald-900/80 dark:to-emerald-950/90'
                : 'bg-gradient-to-br from-rose-900 to-rose-950 dark:from-rose-900/80 dark:to-rose-950/90'
            }`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">Net Activity</p>
              <p className="text-lg font-bold tabular-nums text-white mt-0.5">{formatCurrency(gameSummary.net_game_activity)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-card px-5 py-8 text-center text-sm text-muted-foreground">No game summary data available</div>
        )}
      </div>

      {/* ── Per-Game Breakdown ── */}
      <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Per-Game Breakdown</span>
          {gamesByGame.length > 0 && (
            <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">{gamesByGame.length}</span>
          )}
        </div>
        {loadingGamesByGame ? <TableSkel /> : gamesByGame.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/10 bg-muted/5">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Game</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Recharge</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Bonus</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Avg Bonus</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Redeem</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Net Activity</th>
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-24">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {gamesByGame.map((game, idx) => {
                  const pct = maxGameRecharge > 0 ? Math.min(((game.recharge ?? 0) / maxGameRecharge) * 100, 100) : 0;
                  return (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold text-[9px] shrink-0">{game.game_title.charAt(0)}</span>
                          <span className="font-medium text-foreground text-xs">{game.game_title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(game.recharge)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {game.bonus > 0
                          ? <span className="text-amber-600 dark:text-amber-400">{formatCurrency(game.bonus)}</span>
                          : <span className="text-muted-foreground/25">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {game.average_bonus_pct > 0
                          ? `${game.average_bonus_pct.toFixed(1)}%`
                          : <span className="text-muted-foreground/25">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {game.redeem > 0
                          ? <span className="text-rose-600 dark:text-rose-400">{formatCurrency(game.redeem)}</span>
                          : <span className="text-muted-foreground/25">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span className={`font-semibold ${game.net_game_activity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {formatCurrency(game.net_game_activity)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="w-full h-1 bg-muted/15 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500/50 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">No game data available</div>
        )}
      </div>
    </div>
  );
}
