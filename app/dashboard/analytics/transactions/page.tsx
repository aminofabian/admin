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

function rateColor(rate: number | undefined): string {
  if (!rate) return 'text-muted-foreground';
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
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
      <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel(apiKey)}</p>
      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{children}</div>
    </div>
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
  const {
    data: paymentMethods,
    purchaseMethodsGrouped,
    cashoutMethodsGrouped,
    loading: loadingPaymentMethods,
    error: paymentMethodsError,
  } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus, error: bonusError } = useBonusAnalytics(filters);

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
  const groupedMethodLabel = (paymentMethod: string, display?: string) =>
    (display && display.trim()) ? display.trim() : fmtMethod(paymentMethod);
  const purchaseMethods = paymentMethods.filter(m => m.type === 'purchase');
  const cashoutMethods = paymentMethods.filter(m => m.type === 'cashout');

  const netRevenue = useMemo(() => {
    if (!transactionSummary) return null;
    return transactionSummary.total_purchase - transactionSummary.total_cashout;
  }, [transactionSummary]);

  const bonusBreakdown = useMemo(() => {
    if (!bonusAnalytics) return [];
    const items = [
      { fieldKey: 'purchase_bonus', value: bonusAnalytics.purchase_bonus, bar: 'bg-emerald-500' },
      { fieldKey: 'signup_bonus', value: bonusAnalytics.signup_bonus, bar: 'bg-blue-500' },
      { fieldKey: 'first_deposit_bonus', value: bonusAnalytics.first_deposit_bonus, bar: 'bg-violet-500' },
      { fieldKey: 'total_free_play', value: bonusAnalytics.total_free_play, bar: 'bg-cyan-500' },
      { fieldKey: 'seized_or_tipped_fund', value: bonusAnalytics.seized_or_tipped_fund, bar: 'bg-slate-400' },
    ];
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => ({ ...i, pct: (i.value / max) * 100 }));
  }, [bonusAnalytics]);

  if (loadingDashboard) {
    return (
      <div className="space-y-4">
        <div className="h-14 rounded-xl bg-muted/20 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <CardSkel key={i} />)}
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
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Organization totals come from the dashboard <span className="font-medium">{apiFieldLabel('data')}</span> object; filtered blocks use the transaction analytics endpoints.
          </p>
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

      {/* ── Organization dashboard `data` (not filtered) ── */}
      {analyticsData ? (
        <div className="rounded-xl border border-border/30 bg-card overflow-hidden shadow-sm p-4 sm:p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Dashboard <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
            <span className="block font-normal normal-case text-[9px] opacity-80 mt-0.5">
              Same fields as the API response {apiFieldLabel('status')} / {apiFieldLabel('data')}
            </span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <ApiLabeledValue apiKey="total_cash_in">{formatCurrency(analyticsData.total_cash_in)}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_cashout">{formatCurrency(analyticsData.total_cashout)}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_players">{analyticsData.total_players}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_agents">{analyticsData.total_agents}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_managers">{analyticsData.total_managers}</ApiLabeledValue>
            <ApiLabeledValue apiKey="total_staffs">{analyticsData.total_staffs}</ApiLabeledValue>
          </div>
        </div>
      ) : null}

      {/* ── Filtered transaction summary + bonus (unified card) ── */}
      <p className="text-[10px] text-muted-foreground px-0.5">
        Filtered: {apiFieldLabel('total_purchase')}, {apiFieldLabel('total_cashout')}; payment{' '}
        {apiFieldLabel('data.purchases')} / {apiFieldLabel('data.cashouts')}; {apiFieldLabel('purchase_methods')} /{' '}
        {apiFieldLabel('cashout_methods')}; bonus fields.
      </p>
      <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
        {/* Revenue row */}
        {loadingSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-card px-5 py-4 animate-pulse border-r border-border/10 last:border-r-0">
                <div className="h-2.5 w-14 bg-muted/40 rounded mb-2.5" />
                <div className="h-5 w-20 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        ) : summaryError ? (
          <div className="bg-card px-5 py-8 text-center text-sm text-rose-600 dark:text-rose-400">
            {summaryError}
          </div>
        ) : transactionSummary ? (
          <div className="grid grid-cols-2 lg:grid-cols-3">
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-emerald-500 border-r border-border/10">
              <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel('total_purchase')}</p>
              <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(transactionSummary.total_purchase)}</p>
            </div>
            <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-rose-500 border-r border-border/10">
              <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel('total_cashout')}</p>
              <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(transactionSummary.total_cashout)}</p>
            </div>
            {netRevenue !== null && (
              <div className={`px-5 py-3.5 ${
                netRevenue >= 0
                  ? 'bg-gradient-to-br from-emerald-900 to-emerald-950 dark:from-emerald-900/80 dark:to-emerald-950/90'
                  : 'bg-gradient-to-br from-rose-900 to-rose-950 dark:from-rose-900/80 dark:to-rose-950/90'
              }`}>
                <p className="text-[10px] font-medium leading-snug text-white/70 break-words">
                  {apiFieldLabel('total_purchase')} − {apiFieldLabel('total_cashout')}
                </p>
                <p className="text-lg font-bold tabular-nums text-white mt-0.5">
                  {netRevenue >= 0 ? '+' : ''}{formatCurrency(netRevenue)}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card px-5 py-8 text-center text-sm text-muted-foreground">No transaction data available</div>
        )}

        {/* Bonus breakdown */}
        {loadingBonus ? (
          <div className="border-t border-border/15 bg-card px-5 py-4">
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-2 w-12 bg-muted/40 rounded mb-2" />
                  <div className="h-4 w-14 bg-muted/40 rounded mb-2" />
                  <div className="h-1 bg-muted/20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ) : bonusError ? (
          <div className="border-t border-border/15 bg-card px-5 py-4">
            <p className="text-center text-sm text-rose-600 dark:text-rose-400">{bonusError}</p>
          </div>
        ) : bonusAnalytics ? (
          <div className="border-t border-border/15 bg-card px-5 py-4">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Bonus <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
              </p>
              <div className="text-right">
                <p className="text-[9px] font-medium text-muted-foreground">{apiFieldLabel('total_bonus')}</p>
                <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(bonusAnalytics.total_bonus)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
              {bonusBreakdown.map(({ fieldKey, value, bar, pct }) => (
                <div key={fieldKey} className="group">
                  <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">{apiFieldLabel(fieldKey)}</p>
                  <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(value)}</p>
                  <div className="mt-1.5 h-1 bg-muted/15 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3.5 pt-3 border-t border-border/10 text-[10px] text-muted-foreground">
              <span className="text-[9px] font-medium">{apiFieldLabel('average_purchase_bonus_pct')}</span>
              <strong className="text-foreground">{bonusAnalytics.average_purchase_bonus_pct.toFixed(2)}%</strong>
              <span className="text-border/50">&middot;</span>
              <span className="text-[9px] font-medium">{apiFieldLabel('average_signup_bonus')}</span>
              <strong className="text-foreground">{formatCurrency(bonusAnalytics.average_signup_bonus)}</strong>
              <span className="text-border/50">&middot;</span>
              <span className="text-[9px] font-medium">{apiFieldLabel('average_first_deposit_bonus_pct')}</span>
              <strong className="text-foreground">{bonusAnalytics.average_first_deposit_bonus_pct.toFixed(2)}%</strong>
              <span className="text-border/50">&middot;</span>
              <span className="text-[9px] font-medium">{apiFieldLabel('average_free_play')}</span>
              <strong className="text-foreground">{formatCurrency(bonusAnalytics.average_free_play)}</strong>
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Payment Methods ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Purchase table */}
        <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-sm font-semibold text-foreground">Purchases</span>
            <span className="text-[9px] font-medium text-muted-foreground hidden sm:inline">{apiFieldLabel('data.purchases')}</span>
            {purchaseMethods.length > 0 && (
              <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">{purchaseMethods.length}</span>
            )}
          </div>
          {loadingPaymentMethods ? (
            <TableSkel />
          ) : paymentMethodsError ? (
            <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
          ) : purchaseMethods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('key')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('purchase')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('bonus')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_bonus_pct')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_transaction_size')}</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('usage_distribution_pct')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {purchaseMethods.map((m, i) => (
                    <tr key={`p-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[9px] shrink-0">{fmtMethod(m.payment_method).charAt(0)}</span>
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

        {/* Cashout table */}
        <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-sm font-semibold text-foreground">Cashouts</span>
            <span className="text-[9px] font-medium text-muted-foreground hidden sm:inline">{apiFieldLabel('data.cashouts')}</span>
            {cashoutMethods.length > 0 && (
              <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">{cashoutMethods.length}</span>
            )}
          </div>
          {loadingPaymentMethods ? (
            <TableSkel />
          ) : paymentMethodsError ? (
            <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
          ) : cashoutMethods.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/10 bg-muted/5">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('key')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('cashout')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_transaction_size')}</th>
                    <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('usage_distribution_pct')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {cashoutMethods.map((m, i) => (
                    <tr key={`c-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[9px] shrink-0">{fmtMethod(m.payment_method).charAt(0)}</span>
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

      {/* ── Grouped by payment method (`purchase_methods` / `cashout_methods`) ── */}
      <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/15 bg-muted/5">
          <h2 className="text-sm font-semibold text-foreground">By payment method</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {apiFieldLabel('purchase_methods')} / {apiFieldLabel('cashout_methods')} from the payment-methods response.
          </p>
        </div>
        <div className="grid gap-3 p-3 lg:grid-cols-2 lg:p-4">
          <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Purchases</span>
              <span className="text-[9px] font-medium text-muted-foreground hidden sm:inline">{apiFieldLabel('purchase_methods')}</span>
              {purchaseMethodsGrouped.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">{purchaseMethodsGrouped.length}</span>
              )}
            </div>
            {loadingPaymentMethods ? (
              <TableSkel />
            ) : paymentMethodsError ? (
              <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
            ) : purchaseMethodsGrouped.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/10 bg-muted/5">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('payment_method_display')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('purchase')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('bonus')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_bonus_pct')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_transaction_size')}</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('usage_distribution_pct')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {purchaseMethodsGrouped.map((m, i) => {
                      const label = groupedMethodLabel(m.payment_method, m.payment_method_display);
                      return (
                        <tr key={`pg-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[9px] shrink-0">{label.charAt(0)}</span>
                              <span className="font-medium text-foreground text-xs">{label}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.purchase)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {m.bonus > 0
                              ? <span className="text-amber-600 dark:text-amber-400">{formatCurrency(m.bonus)}</span>
                              : <span className="text-muted-foreground/25">&mdash;</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                            {m.average_bonus_pct > 0
                              ? `${m.average_bonus_pct.toFixed(1)}%`
                              : <span className="text-muted-foreground/25">&mdash;</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate.toFixed(1)}%</span></td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.average_transaction_size)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-[10px]">{m.usage_distribution_pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No grouped purchase data</div>
            )}
          </div>

          <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
              <span className="text-sm font-semibold text-foreground">Cashouts</span>
              <span className="text-[9px] font-medium text-muted-foreground hidden sm:inline">{apiFieldLabel('cashout_methods')}</span>
              {cashoutMethodsGrouped.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-muted-foreground tabular-nums">{cashoutMethodsGrouped.length}</span>
              )}
            </div>
            {loadingPaymentMethods ? (
              <TableSkel />
            ) : paymentMethodsError ? (
              <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
            ) : cashoutMethodsGrouped.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/10 bg-muted/5">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('payment_method_display')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('cashout')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('average_transaction_size')}</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('usage_distribution_pct')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/5">
                    {cashoutMethodsGrouped.map((m, i) => {
                      const label = groupedMethodLabel(m.payment_method, m.payment_method_display);
                      return (
                        <tr key={`cg-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                          <td className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[9px] shrink-0">{label.charAt(0)}</span>
                              <span className="font-medium text-foreground text-xs">{label}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(m.cashout)}</td>
                          <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate.toFixed(1)}%</span></td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{formatCurrency(m.average_transaction_size)}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-muted-foreground text-[10px]">{m.usage_distribution_pct.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">No grouped cashout data</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
