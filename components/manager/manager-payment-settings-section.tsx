'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorState, EmptyState } from '@/components/features';
import { usePaymentMethodsStore } from '@/stores';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Skeleton } from '@/components/ui';
import type { PaymentMethod, PaymentMethodAction } from '@/types';

// Get payment method initials
const getPaymentMethodInitials = (paymentMethodDisplay: string): string => {
  const words = paymentMethodDisplay.trim().split(/\s+/);
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  } else if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  
  return 'PM';
};

/**
 * Manager Payment Settings Section - Read-only
 * Shows payment methods but does not allow editing
 */
export function ManagerPaymentSettingsSection() {
  const paymentMethods = usePaymentMethodsStore((state) => state.paymentMethods);
  const isLoading = usePaymentMethodsStore((state) => state.isLoading);
  const error = usePaymentMethodsStore((state) => state.error);
  const fetchPaymentMethods = usePaymentMethodsStore((state) => state.fetchPaymentMethods);
  const [filterAction, setFilterAction] = useState<PaymentMethodAction>('cashout');

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
  const totalCount = filteredResults.length;
  const enabledCount = filteredResults.filter((method) => method.isEnabled).length;
  const disabledCount = filteredResults.filter((method) => !method.isEnabled).length;
  const actionCounts: Record<PaymentMethodAction, number> = {
    cashout: methodsByAction.cashout.length,
    purchase: methodsByAction.purchase.length,
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-40 shrink-0" />
            <div className="flex-1 min-w-0" />
            <div className="flex items-center gap-2 shrink-0">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
            >
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-4 gap-4 px-4 py-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                      </div>
                    </div>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          
          {/* Title */}
          <div className="flex flex-col shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Payment Methods
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              View payment method configurations (read-only)
            </p>
          </div>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Filter Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(['purchase', 'cashout'] as PaymentMethodAction[]).map((action) => {
              const isActive = filterAction === action;
              return (
                <button
                  key={action}
                  type="button"
                  onClick={() => setFilterAction(action)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium capitalize transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90'
                      : 'bg-white dark:bg-gray-900 text-muted-foreground border-gray-200 dark:border-gray-800 hover:text-primary hover:border-primary/40 hover:bg-primary/5 dark:hover:bg-primary/10'
                  }`}
                >
                  {action}
                  <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0 text-xs font-semibold ${
                    isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {actionCounts[action]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Payment Methods</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{totalCount}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {enabledCount}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
          <div className="text-2xl font-bold text-gray-500 mt-1">{disabledCount}</div>
        </div>
      </div>

      {/* Payment Methods Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!paymentMethods || filteredResults.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No Payment Methods" 
              description="Payment methods will appear here once configured"
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((method) => (
                    <TableRow key={method.loadingKey} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                            {getPaymentMethodInitials(method.payment_method_display)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {method.payment_method_display}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                          {method.method_type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 capitalize">
                          {method.action}
                        </span>
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

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-2">
              {sortedResults.map((method) => (
                <div
                  key={method.loadingKey}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-6">
                      {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-md">
                          {getPaymentMethodInitials(method.payment_method_display)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                            {method.payment_method_display}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Mobile badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                        {method.method_type}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800 text-xs font-medium capitalize">
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

