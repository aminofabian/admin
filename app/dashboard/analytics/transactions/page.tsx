'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
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
    <div className="p-5 space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-7 w-7 shrink-0 bg-muted/30" />
          <div className="h-3 flex-1 bg-muted/20" />
          <div className="h-3 w-16 bg-muted/30" />
        </div>
      ))}
    </div>
  );
}

function rateColor(rate: number | undefined): string {
  if (!rate) return 'text-muted-foreground';
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
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
      <p className="font-mono text-[10px] leading-snug text-muted-foreground break-all">{fieldKey}</p>
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

export default function TransactionAnalyticsPage() {
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

  const { data: transactionSummary, loading: loadingSummary, error: summaryError } =
    useTransactionSummary(filters);
  const { data: paymentMethods, loading: loadingPaymentMethods } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus } = useBonusAnalytics(filters);

  const summaryTapeCells = useMemo(() => {
    if (!transactionSummary) return [];
    const net = transactionSummary.total_purchase - transactionSummary.total_cashout;
    return [
      {
        key: 'total_purchase',
        tone: 'cash_in' as const,
        v: formatCurrency(transactionSummary.total_purchase),
      },
      {
        key: 'total_cashout',
        tone: 'cash_out' as const,
        v: formatCurrency(transactionSummary.total_cashout),
      },
      {
        key: 'total_transfer',
        tone: 'transfer' as const,
        v: formatCurrency(transactionSummary.total_transfer),
      },
      {
        key: 'total_purchase − total_cashout',
        tone: 'derived' as const,
        v: `${net >= 0 ? '+' : ''}${formatCurrency(net)}`,
        netNonNegative: net >= 0,
        sub: 'derived' as const,
      },
    ];
  }, [transactionSummary]);

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
  const fmtMethod = (n: string) => n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const purchaseMethods = paymentMethods.filter(m => m.type === 'purchase');
  const cashoutMethods = paymentMethods.filter(m => m.type === 'cashout');

  const bonusAmountBars = useMemo(() => {
    if (!bonusAnalytics) return [];
    const items = [
      { fieldKey: 'purchase_bonus', value: bonusAnalytics.purchase_bonus, bar: 'bg-emerald-500' },
      { fieldKey: 'signup_bonus', value: bonusAnalytics.signup_bonus, bar: 'bg-blue-500' },
      { fieldKey: 'first_deposit_bonus', value: bonusAnalytics.first_deposit_bonus, bar: 'bg-violet-500' },
      { fieldKey: 'transfer_bonus', value: bonusAnalytics.transfer_bonus, bar: 'bg-indigo-500' },
      { fieldKey: 'total_free_play', value: bonusAnalytics.total_free_play, bar: 'bg-cyan-500' },
      { fieldKey: 'seized_or_tipped_fund', value: bonusAnalytics.seized_or_tipped_fund, bar: 'bg-slate-400' },
    ];
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => ({ ...i, pct: (i.value / max) * 100 }));
  }, [bonusAnalytics]);

  if (loadingDashboard) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="h-16 bg-muted/25 animate-pulse" />
        <div className="h-32 border border-border/40 bg-muted/15 animate-pulse" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="h-48 border border-border/40 bg-muted/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8">
        <div className="mb-4 bg-rose-500/10 p-4 text-rose-500">
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
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Transaction analytics</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Snapshot is always organization-wide. Summary, bonuses, and payment breakdown use the filters below.
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
          </svg>
          {showFilters ? 'Hide filters' : 'Show filters'}
          {hasActiveFilters ? <span className="h-1.5 w-1.5 bg-primary" title="Scope changed" /> : null}
        </button>
      </div>

      {showFilters ? (
        <AnalyticsSection
          eyebrow="Filters"
          title="Scope"
          hint="Applies to: transactions/summary · transactions/bonus · payment-methods"
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
          title="Filtered transaction totals"
          hint="transactions/summary/"
          action={
            <span className="text-xs text-muted-foreground">
              {hasActiveFilters ? 'Custom scope' : 'Date range only'}
            </span>
          }
        >
          {loadingSummary ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : summaryError ? (
            <p className="text-center text-sm text-destructive">{summaryError}</p>
          ) : transactionSummary ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {summaryTapeCells.map(cell => (
                  <ApiMetricCard
                    key={cell.key}
                    fieldKey={cell.key}
                    tone={cell.tone}
                    className={cell.tone === 'derived' ? 'relative overflow-hidden' : ''}
                  >
                    {cell.tone === 'derived' ? (
                      <div
                        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 bg-amber-500/15 blur-2xl"
                        aria-hidden
                      />
                    ) : null}
                    <p
                      className={`text-lg font-bold tabular-nums ${
                        cell.tone === 'cash_in'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : cell.tone === 'cash_out'
                            ? 'text-rose-700 dark:text-rose-300'
                            : cell.tone === 'transfer'
                              ? 'text-violet-700 dark:text-violet-300'
                              : 'netNonNegative' in cell && cell.netNonNegative
                                ? 'relative text-emerald-700 dark:text-emerald-300'
                                : 'relative text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {cell.v}
                    </p>
                    {cell.tone === 'derived' ? (
                      <p className="relative text-[10px] text-muted-foreground">purchase − cashout</p>
                    ) : null}
                  </ApiMetricCard>
                ))}
              </div>
              <p className="text-center text-[11px] text-muted-foreground">
                Net = total_purchase − total_cashout · total_transfer is separate
              </p>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No summary data</p>
          )}
        </AnalyticsSection>

        <AnalyticsSection eyebrow="Bonus" title="Bonuses" hint="transactions/bonus/">
          {loadingBonus ? (
            <div className="space-y-4">
              <div className="h-14 bg-muted/20 animate-pulse" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-20 bg-muted/15 animate-pulse" />
                ))}
              </div>
            </div>
          ) : bonusAnalytics ? (
            <div className="space-y-6">
              <ApiMetricCard fieldKey="total_bonus" tone="bonus">
                <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatCurrency(bonusAnalytics.total_bonus)}
                </p>
              </ApiMetricCard>
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">By component</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {bonusAmountBars.map(({ fieldKey, value, bar, pct }) => (
                    <ApiMetricCard key={fieldKey} fieldKey={fieldKey} tone="bonus">
                      <p className="text-sm font-bold tabular-nums">{formatCurrency(value)}</p>
                      <div className="mt-2 h-1 overflow-hidden bg-muted/30">
                        <div className={`h-full ${bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </ApiMetricCard>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-xs font-medium text-muted-foreground">Averages</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <ApiMetricCard fieldKey="average_purchase_bonus_pct" tone="avg">
                    <p className="text-sm font-bold tabular-nums">{bonusAnalytics.average_purchase_bonus_pct.toFixed(2)}%</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="average_signup_bonus" tone="avg">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(bonusAnalytics.average_signup_bonus)}</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="average_first_deposit_bonus_pct" tone="avg">
                    <p className="text-sm font-bold tabular-nums">{bonusAnalytics.average_first_deposit_bonus_pct.toFixed(2)}%</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="average_transfer_bonus_pct" tone="avg">
                    <p className="text-sm font-bold tabular-nums">{bonusAnalytics.average_transfer_bonus_pct.toFixed(2)}%</p>
                  </ApiMetricCard>
                  <ApiMetricCard fieldKey="average_free_play" tone="avg">
                    <p className="text-sm font-bold tabular-nums">{formatCurrency(bonusAnalytics.average_free_play)}</p>
                  </ApiMetricCard>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">No bonus data</p>
          )}
        </AnalyticsSection>
      </div>

      <AnalyticsSection
        eyebrow="Methods"
        title="Payment breakdown"
        hint="transactions/payment-methods/"
      >
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
            <span className="h-2 w-2 bg-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">Purchases</h3>
            {purchaseMethods.length > 0 ? (
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{purchaseMethods.length} methods</span>
            ) : null}
          </div>
          {loadingPaymentMethods ? <TableSkel /> : purchaseMethods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Method</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Volume</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Bonus</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Avg %</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Success</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Avg Size</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {purchaseMethods.map((m, i) => (
                    <tr key={`p-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-emerald-500/10 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{fmtMethod(m.payment_method).charAt(0)}</span>
                          <span className="font-medium text-foreground text-xs">{fmtMethod(m.payment_method)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.purchase ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {m.bonus && m.bonus > 0
                          ? <span className="text-amber-600 dark:text-amber-400">{formatCurrency(m.bonus)}</span>
                          : <span className="text-muted-foreground/25">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {m.average_bonus_pct && m.average_bonus_pct > 0
                          ? `${m.average_bonus_pct.toFixed(1)}%`
                          : <span className="text-muted-foreground/25">&mdash;</span>}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate?.toFixed(1) ?? 0}%</span></td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.average_transaction_size ?? 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-[10px]">{m.usage_distribution_pct?.toFixed(1) ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">No purchase data</div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 border-b border-border/40 pb-2">
            <span className="h-2 w-2 bg-rose-500" />
            <h3 className="text-sm font-semibold text-foreground">Cashouts</h3>
            {cashoutMethods.length > 0 ? (
              <span className="ml-auto text-xs tabular-nums text-muted-foreground">{cashoutMethods.length} methods</span>
            ) : null}
          </div>
          {loadingPaymentMethods ? <TableSkel /> : cashoutMethods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="text-left px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Method</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Volume</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Success</th>
                    <th className="text-right px-3 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Avg Size</th>
                    <th className="text-right px-4 py-2 font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Usage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {cashoutMethods.map((m, i) => (
                    <tr key={`c-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-rose-500/10 text-[9px] font-bold text-rose-600 dark:text-rose-400">{fmtMethod(m.payment_method).charAt(0)}</span>
                          <span className="font-medium text-foreground text-xs">{fmtMethod(m.payment_method)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(m.cashout ?? 0)}</td>
                      <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate?.toFixed(1) ?? 0}%</span></td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.average_transaction_size ?? 0)}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-[10px]">{m.usage_distribution_pct?.toFixed(1) ?? 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-muted-foreground">No cashout data</div>
          )}
        </div>
        </div>
      </AnalyticsSection>
    </div>
  );
}
