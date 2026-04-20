'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
import { Select, DateSelect } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';

import { US_STATES, getDateRange } from '../analytics-utils';

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

export default function TransactionAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

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
    setDatePreset('today');
    const range = getDateRange('today');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = username || state || gender || datePreset !== 'today';
  const fmtMethod = (n: string) => n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const groupedMethodLabel = (paymentMethod: string, display?: string) =>
    (display && display.trim()) ? display.trim() : fmtMethod(paymentMethod);
  const purchaseMethods = paymentMethods.filter(m => m.type === 'purchase');
  const cashoutMethods = paymentMethods.filter(m => m.type === 'cashout');

  const netRevenue = useMemo(() => {
    if (!transactionSummary) return null;
    return transactionSummary.total_purchase - transactionSummary.total_cashout;
  }, [transactionSummary]);

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map(i => (
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3">
              <div>
                <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">
                  {apiFieldLabel('purchase_bonus')}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(bonusAnalytics.purchase_bonus)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">
                  {apiFieldLabel('signup_bonus')}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(bonusAnalytics.signup_bonus)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">
                  {apiFieldLabel('first_deposit_bonus')}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground">
                  {formatCurrency(bonusAnalytics.first_deposit_bonus)}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">
                  {apiFieldLabel('total_bonus')}
                </p>
                <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {formatCurrency(bonusAnalytics.total_bonus)}
                </p>
              </div>
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
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('purchase')}</th>
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
                          <td className="px-4 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.purchase)}</td>
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
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('cashout')}</th>
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
                          <td className="px-4 py-2 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(m.cashout)}</td>
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
