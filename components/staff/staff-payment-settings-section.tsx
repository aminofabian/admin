'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorState, EmptyState } from '@/components/features';
import { usePaymentMethodsStore } from '@/stores';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Skeleton } from '@/components/ui';
import type { PaymentMethod, PaymentMethodAction } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';
import { getPaymentMethodIcon } from '@/lib/utils/payment-method-icons';

// Format amount for display
const formatAmount = (amount: string | null | undefined): string => {
  if (!amount) return 'No limit';
  const num = parseFloat(amount);
  if (isNaN(num)) return 'No limit';
  return `$${num.toFixed(2)}`;
};

/**
 * Staff Payment Settings Section - Read-only
 * Shows payment methods but does not allow editing
 */
export function StaffPaymentSettingsSection() {
  const paymentMethods = usePaymentMethodsStore((state) => state.paymentMethods);
  const isLoading = usePaymentMethodsStore((state) => state.isLoading);
  const error = usePaymentMethodsStore((state) => state.error);
  const fetchPaymentMethods = usePaymentMethodsStore((state) => state.fetchPaymentMethods);
  const [filterAction, setFilterAction] = useState<PaymentMethodAction>('purchase');

  type PaymentMethodRow = PaymentMethod & {
    action: PaymentMethodAction;
    isEnabled: boolean;
    loadingKey: string;
  };

  const methodsByAction = useMemo(() => {
    const buildRows = (action: PaymentMethodAction, methods: PaymentMethod[] = []): PaymentMethodRow[] =>
      methods.map((method) => ({
        ...method,
        action,
        isEnabled: action === 'cashout' 
          ? Boolean(method.is_enabled_for_cashout)
          : Boolean(method.is_enabled_for_purchase),
        loadingKey: `${action}-${method.id}`,
      }));

    // Use all methods from the response - no filtering needed
    const cashoutMethods = paymentMethods?.cashout ?? [];
    const purchaseMethods = paymentMethods?.purchase ?? [];

    return {
      cashout: buildRows('cashout', cashoutMethods),
      purchase: buildRows('purchase', purchaseMethods),
    } as Record<PaymentMethodAction, PaymentMethodRow[]>;
  }, [paymentMethods]);

  const filteredResults = methodsByAction[filterAction] ?? [];
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <Skeleton className="h-8 w-48 rounded-md" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <div className="flex justify-center">
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !paymentMethods) {
    return <ErrorState message={error} onRetry={fetchPaymentMethods} />;
  }

  // Sort payment methods: cryptos first, then others
  const sortedResults = [...filteredResults].sort((a, b) => {
    const aIsCrypto = a.method_type?.toLowerCase().includes('crypto') || a.payment_method?.toLowerCase().includes('crypto');
    const bIsCrypto = b.method_type?.toLowerCase().includes('crypto') || b.payment_method?.toLowerCase().includes('crypto');
    
    if (aIsCrypto && !bIsCrypto) return -1;
    if (!aIsCrypto && bIsCrypto) return 1;
    return 0;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            Payment methods
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Purchase and cashout configuration (read-only)
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/80 p-1 shadow-sm">
          {(['purchase', 'cashout'] as PaymentMethodAction[]).map((action) => {
            const isActive = filterAction === action;
            return (
              <button
                key={action}
                type="button"
                onClick={() => setFilterAction(action)}
                className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                  isActive
                    ? action === 'purchase'
                      ? 'bg-emerald-600 text-white shadow-sm dark:bg-emerald-600'
                      : 'bg-rose-600 text-white shadow-sm dark:bg-rose-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/80'
                }`}
              >
                {action}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
        {!paymentMethods || filteredResults.length === 0 ? (
          <div className="py-16 px-8">
            <EmptyState
              title="No payment methods"
              description="Payment methods will appear here once configured"
            />
          </div>
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Amount limits</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((method) => (
                    <TableRow key={method.loadingKey} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-slate-800">
                            {getPaymentMethodIcon(method.payment_method, { size: 'lg', asInitialFallback: true })}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {formatPaymentMethod(method.payment_method_display || method.payment_method)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-amber-200 bg-amber-50 text-xs font-medium capitalize text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                          {method.method_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
                            method.action === 'purchase'
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                              : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                          }`}
                        >
                          {method.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Min: <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatAmount(method.action === 'cashout' ? method.min_amount_cashout : method.min_amount_purchase)}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            Max: <span className="font-medium text-gray-900 dark:text-gray-100">
                              {formatAmount(method.action === 'cashout' ? method.max_amount_cashout : method.max_amount_purchase)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.isEnabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${method.isEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                          {method.isEnabled ? 'Active' : 'Inactive'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-3 p-4 lg:hidden">
              {sortedResults.map((method) => (
                <div
                  key={method.loadingKey}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800/80"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-slate-800">
                          {getPaymentMethodIcon(method.payment_method, { size: 'lg', asInitialFallback: true })}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-medium leading-tight text-gray-900 dark:text-gray-100">
                            {formatPaymentMethod(method.payment_method_display || method.payment_method)}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Amount Limits */}
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Amount Limits</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Min:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatAmount(method.action === 'cashout' ? method.min_amount_cashout : method.min_amount_purchase)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Max:</span>{' '}
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {formatAmount(method.action === 'cashout' ? method.max_amount_cashout : method.max_amount_purchase)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Mobile badges */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3 dark:border-gray-700">
                      <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium capitalize text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                        {method.method_type}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium capitalize ${
                          method.action === 'purchase'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                            : 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300'
                        }`}
                      >
                        {method.action}
                      </span>
                      
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.isEnabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${method.isEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
                        {method.isEnabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

