'use client';

import { useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import {
  useTransactionSummary,
  usePaymentMethods,
  useBonusAnalytics,
} from '@/hooks/use-analytics-transactions';
import { formatCurrency } from '@/lib/utils/formatters';
import { apiFieldLabel, fmtPaymentMethod, rateColor } from './analytics-display-utils';
import { TransactionAnalyticsTableSkel } from './transaction-analytics-table-skel';

interface TransactionAnalyticsBodyProps {
  filters: AnalyticsFilters | undefined;
  filterRangeCaption: string;
}

export function TransactionAnalyticsBody({ filters, filterRangeCaption }: TransactionAnalyticsBodyProps) {
  const { data: transactionSummary, loading: loadingSummary, error: summaryError } =
    useTransactionSummary(filters);
  const {
    data: paymentMethods,
    purchaseMethodsGrouped,
    cashoutMethodsGrouped,
    manualAdjustments,
    loading: loadingPaymentMethods,
    error: paymentMethodsError,
  } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus, error: bonusError } = useBonusAnalytics(filters);

  const purchaseMethods = paymentMethods.filter(m => m.type === 'purchase');
  const cashoutMethods = paymentMethods.filter(m => m.type === 'cashout');

  const netRevenue = useMemo(() => {
    if (!transactionSummary) return null;
    return transactionSummary.total_purchase - transactionSummary.total_cashout;
  }, [transactionSummary]);

  const groupedMethodLabel = (paymentMethod: string, display?: string) =>
    display && display.trim() ? display.trim() : fmtPaymentMethod(paymentMethod);

  return (
    <>
      <div className="text-[10px] text-muted-foreground px-0.5 space-y-0.5">
        <p className="text-foreground/85 font-medium leading-snug">{filterRangeCaption}</p>
        <p className="leading-snug">
          Filtered: {apiFieldLabel('total_purchase')}, {apiFieldLabel('total_cashout')}; payment{' '}
          {apiFieldLabel('data.purchases')} / {apiFieldLabel('data.cashouts')}; {apiFieldLabel('purchase_methods')} /{' '}
          {apiFieldLabel('cashout_methods')}; bonus fields.
        </p>
      </div>

      <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
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
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Bonus <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
            </p>
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

      <div className="grid gap-3 lg:grid-cols-2">
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
            <TransactionAnalyticsTableSkel />
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
                          <span className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[9px] shrink-0">{fmtPaymentMethod(m.payment_method).charAt(0)}</span>
                          <span className="font-medium text-foreground text-xs">{fmtPaymentMethod(m.payment_method)}</span>
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
            <TransactionAnalyticsTableSkel />
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
                          <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[9px] shrink-0">{fmtPaymentMethod(m.payment_method).charAt(0)}</span>
                          <span className="font-medium text-foreground text-xs">{fmtPaymentMethod(m.payment_method)}</span>
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
              <TransactionAnalyticsTableSkel />
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
              <TransactionAnalyticsTableSkel />
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

      <div className="rounded-2xl border border-border/30 bg-card/40 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border/15 bg-muted/5">
          <h2 className="text-sm font-semibold text-foreground">Manual adjustments</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {apiFieldLabel('manual_adjustments')} from the payment-methods response.
          </p>
        </div>
        {loadingPaymentMethods ? (
          <TransactionAnalyticsTableSkel />
        ) : paymentMethodsError ? (
          <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
        ) : manualAdjustments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/10 bg-muted/5">
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('adjustment_display')}</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('adjustment_type')}</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/5">
                {manualAdjustments.map((item, i) => (
                  <tr key={`ma-${item.adjustment_type}-${i}`} className="hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-2 text-foreground font-medium">
                      {item.adjustment_display?.trim() || fmtPaymentMethod(item.adjustment_type)}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">{item.adjustment_type}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-foreground">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-muted-foreground">No manual adjustment data</div>
        )}
      </div>
    </>
  );
}
