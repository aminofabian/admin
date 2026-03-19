'use client';

import { useEffect, useMemo, useState } from 'react';
import { ErrorState, EmptyState } from '@/components/features';
import { usePaymentMethodsStore } from '@/stores';
import { useToast } from '@/components/ui/toast';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Skeleton, Card, CardHeader, CardContent, Badge, Button } from '@/components/ui';
import { PaymentAmountModal } from './payment-amount-modal';
import type { PaymentMethod, PaymentMethodAction, CashoutPaymentMethod, CashoutSubcategory, PurchasePaymentMethod, PurchaseSubcategory } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';
import { getPaymentMethodIcon } from '@/lib/utils/payment-method-icons';


export function PaymentSettingsSection() {
  const paymentMethods = usePaymentMethodsStore((state) => state.paymentMethods);
  const cashoutCategories = usePaymentMethodsStore((state) => state.cashoutCategories);
  const purchaseCategories = usePaymentMethodsStore((state) => state.purchaseCategories);
  const isLoading = usePaymentMethodsStore((state) => state.isLoading);
  const error = usePaymentMethodsStore((state) => state.error);
  const fetchPaymentMethods = usePaymentMethodsStore((state) => state.fetchPaymentMethods);
  const { addToast } = useToast();
  const updatePaymentMethodAmounts = usePaymentMethodsStore((state) => state.updatePaymentMethodAmounts);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [filterAction, setFilterAction] = useState<PaymentMethodAction>('purchase');
  const [amountModalOpen, setAmountModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodRow | null>(null);
  const [isUpdatingAmounts, setIsUpdatingAmounts] = useState(false);

  const toggleExpandedCategory = (key: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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

  const handleEditAmounts = (method: PaymentMethodRow) => {
    setSelectedPaymentMethod(method);
    setAmountModalOpen(true);
  };

  /** Convert configured cashout subcategory to PaymentMethodRow for modal/API */
  const subToRow = (sub: CashoutSubcategory): PaymentMethodRow => ({
    id: sub.id!,
    payment_method: sub.payment_method,
    payment_method_display: sub.payment_method_display || sub.provider_payment_method_display || sub.payment_method,
    method_type: sub.method_type || sub.payment_method || 'N/A',
    provider_payment_method: sub.provider_payment_method ?? undefined,
    action: 'cashout',
    isEnabled: Boolean(sub.is_enabled_for_cashout),
    loadingKey: `cashout-${sub.id}`,
    min_amount_cashout: sub.min_amount_cashout ?? null,
    max_amount_cashout: sub.max_amount_cashout ?? null,
    superadmin_min_amount_cashout: sub.superadmin_min_amount_cashout ?? null,
    superadmin_max_amount_cashout: sub.superadmin_max_amount_cashout ?? null,
    created: sub.created ?? '',
    modified: sub.modified ?? '',
  });

  /** Convert configured purchase subcategory to PaymentMethodRow for modal/API */
  const purchaseSubToRow = (sub: PurchaseSubcategory): PaymentMethodRow => ({
    id: sub.id!,
    payment_method: sub.payment_method,
    payment_method_display: sub.payment_method_display || sub.provider_payment_method_display || sub.payment_method,
    method_type: sub.method_type || sub.payment_method || 'N/A',
    provider_payment_method: sub.provider_payment_method ?? undefined,
    action: 'purchase',
    isEnabled: Boolean(sub.is_enabled_for_purchase),
    loadingKey: `purchase-${sub.id}`,
    min_amount_purchase: sub.min_amount_purchase ?? null,
    max_amount_purchase: sub.max_amount_purchase ?? null,
    superadmin_min_amount_purchase: sub.superadmin_min_amount_purchase ?? null,
    superadmin_max_amount_purchase: sub.superadmin_max_amount_purchase ?? null,
    created: sub.created ?? '',
    modified: sub.modified ?? '',
  });

  const handleSaveAmounts = async (minAmount: number | null, maxAmount: number | null) => {
    if (!selectedPaymentMethod) return;

    setIsUpdatingAmounts(true);
    try {
      await updatePaymentMethodAmounts({
        id: selectedPaymentMethod.id,
        action: selectedPaymentMethod.action,
        minAmount,
        maxAmount,
      });

      addToast({
        type: 'success',
        title: 'Amounts updated',
        description: `Amount limits for ${selectedPaymentMethod.payment_method_display} have been updated successfully.`,
      });

      setAmountModalOpen(false);
      setSelectedPaymentMethod(null);
    } catch (error) {
      console.error('Failed to update payment method amounts:', error);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: `Failed to update amount limits for ${selectedPaymentMethod.payment_method_display}.`,
      });
    } finally {
      setIsUpdatingAmounts(false);
    }
  };

  const formatAmount = (amount: string | null | undefined): string => {
    if (!amount) return 'No limit';
    const num = parseFloat(amount);
    if (isNaN(num)) return 'No limit';
    return `$${num.toFixed(2)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-7 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-6 gap-4 px-6 py-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-6 gap-4 px-6 py-5">
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
                    <div className="flex justify-end">
                      <Skeleton className="h-9 w-24 rounded-lg" />
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
          Payment Methods
        </h2>
        <div className="flex items-center gap-3">
          {(['purchase', 'cashout'] as PaymentMethodAction[]).map((action) => {
            const isActive = filterAction === action;
            return (
              <button
                key={action}
                type="button"
                onClick={() => setFilterAction(action)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  isActive
                    ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {action}
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment Methods */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden shadow-sm">
        {!paymentMethods ? (
          <div className="py-16 px-8">
            <EmptyState 
              title="No Payment Methods" 
              description="Payment methods will appear here once configured"
            />
          </div>
        ) : filterAction === 'purchase' && purchaseCategories && purchaseCategories.length > 0 ? (
          /* Hierarchical Purchase View: Categories + Subcategories */
          <div className="space-y-4 p-6 lg:p-8">
            {purchaseCategories
              .filter((category) => {
                const configuredCount = category.subcategories?.filter((s) => s.is_configured && s.id != null).length ?? 0;
                return configuredCount > 0;
              })
              .map((category) => {
              const hasSubs = category.has_subcategories && (category.subcategories?.length ?? 0) > 0;
              const isExpanded = expandedCategories.has(category.payment_method);
              const configuredSubs = category.subcategories?.filter((s) => s.is_configured && s.id != null) ?? [];
              const activeCount = configuredSubs.filter((s) => s.is_enabled_for_purchase).length;
              const inactiveCount = configuredSubs.length - activeCount;

              return (
                <Card
                  key={category.payment_method}
                  className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
                >
                  <CardHeader
                    className={`py-5 px-5 lg:px-6 ${hasSubs ? 'cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors' : ''}`}
                    onClick={() => hasSubs && toggleExpandedCategory(category.payment_method)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                          {getPaymentMethodIcon(category.payment_method, { size: 'lg', asInitialFallback: true })}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {formatPaymentMethod(category.payment_method_display || category.payment_method)}
                          </div>
                          {hasSubs && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span className="text-green-600 dark:text-green-400 font-medium">{activeCount} active</span>
                              <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
                              <span className="text-gray-500 dark:text-gray-400">{inactiveCount} inactive</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {hasSubs && (
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                            isExpanded ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rotate-180' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {hasSubs && isExpanded && category.subcategories && (
                    <CardContent className="p-0">
                      <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {category.subcategories
                          .filter((sub) => sub.is_configured === true && sub.id != null)
                          .map((sub) => {
                            const loadingKey = `purchase-${sub.id}`;

                            return (
                            <div
                              key={sub.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-6 pr-5 lg:pl-8 lg:pr-6 py-4 sm:py-5"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0 w-9 h-9 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                  {getPaymentMethodIcon(sub.payment_method ?? sub.provider_payment_method, {
                                    size: 'md',
                                    methodType: sub.method_type,
                                    providerPaymentMethod: sub.provider_payment_method_display ?? sub.provider_payment_method,
                                    asInitialFallback: true,
                                  })}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {formatPaymentMethod(sub.payment_method_display || sub.payment_method)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                      {sub.method_type || sub.payment_method || 'N/A'}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span
                                      className={`text-xs font-medium ${
                                        sub.is_enabled_for_purchase
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                    >
                                      {sub.is_enabled_for_purchase ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Min <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(sub.min_amount_purchase)}</span></span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span>Max <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(sub.max_amount_purchase)}</span></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAmounts(purchaseSubToRow(sub));
                                      }}
                                      disabled={isUpdatingAmounts}
                                      className="h-8 text-xs"
                                    >
                                      Edit Limits
                                    </Button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (loadingIds.has(loadingKey)) return;
                                        setLoadingIds((prev) => new Set(prev).add(loadingKey));
                                        try {
                                          const newStatus = !sub.is_enabled_for_purchase;
                                          await usePaymentMethodsStore.getState().updatePaymentMethod({
                                            id: sub.id!,
                                            action: 'purchase',
                                            value: newStatus,
                                          });
                                          addToast({
                                            type: 'success',
                                            title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                                            description: `${sub.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                                          });
                                        } catch (err) {
                                          addToast({
                                            type: 'error',
                                            title: 'Update failed',
                                            description: `Failed to ${sub.is_enabled_for_purchase ? 'disable' : 'enable'} ${sub.payment_method_display}.`,
                                          });
                                        } finally {
                                          setLoadingIds((prev) => {
                                            const next = new Set(prev);
                                            next.delete(loadingKey);
                                            return next;
                                          });
                                        }
                                      }}
                                      disabled={loadingIds.has(loadingKey)}
                                      className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                                        sub.is_enabled_for_purchase
                                          ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                                          : 'border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                                      }`}
                                    >
                                      {loadingIds.has(loadingKey) ? (
                                        <>
                                          <span className="animate-spin mr-1.5 inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                          {sub.is_enabled_for_purchase ? 'Disabling...' : 'Enabling...'}
                                        </>
                                      ) : (
                                        sub.is_enabled_for_purchase ? 'Disable' : 'Enable'
                                      )}
                                    </button>
                                  </div>
                                </div>
                            </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : filterAction === 'cashout' && cashoutCategories && cashoutCategories.length > 0 ? (
          /* Hierarchical Cashout View: Categories + Subcategories */
          <div className="space-y-4 p-6 lg:p-8">
            {cashoutCategories
              .filter((category) => {
                const configuredCount = category.subcategories?.filter((s) => s.is_configured && s.id != null).length ?? 0;
                return configuredCount > 0;
              })
              .map((category) => {
              const hasSubs = category.has_subcategories && (category.subcategories?.length ?? 0) > 0;
              const isExpanded = expandedCategories.has(category.payment_method);
              const configuredSubs = category.subcategories?.filter((s) => s.is_configured && s.id != null) ?? [];
              const activeCount = configuredSubs.filter((s) => s.is_enabled_for_cashout).length;
              const inactiveCount = configuredSubs.length - activeCount;

              return (
                <Card
                  key={category.payment_method}
                  className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm"
                >
                  <CardHeader
                    className={`py-5 px-5 lg:px-6 ${hasSubs ? 'cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors' : ''}`}
                    onClick={() => hasSubs && toggleExpandedCategory(category.payment_method)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                          {getPaymentMethodIcon(category.payment_method, { size: 'lg', asInitialFallback: true })}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                            {formatPaymentMethod(category.payment_method_display || category.payment_method)}
                          </div>
                          {hasSubs && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              <span className="text-green-600 dark:text-green-400 font-medium">{activeCount} active</span>
                              <span className="text-gray-400 dark:text-gray-500 mx-1">·</span>
                              <span className="text-gray-500 dark:text-gray-400">{inactiveCount} inactive</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {hasSubs && (
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                            isExpanded ? 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rotate-180' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  {hasSubs && isExpanded && category.subcategories && (
                    <CardContent className="p-0">
                      <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
                        {category.subcategories
                          .filter((sub) => sub.is_configured === true && sub.id != null)
                          .map((sub) => {
                            const loadingKey = `cashout-${sub.id}`;

                            return (
                            <div
                              key={sub.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-6 pr-5 lg:pl-8 lg:pr-6 py-4 sm:py-5"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex-shrink-0 w-9 h-9 rounded-md bg-white dark:bg-slate-800 flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                  {getPaymentMethodIcon(sub.payment_method ?? sub.provider_payment_method, {
                                    size: 'md',
                                    methodType: sub.method_type,
                                    providerPaymentMethod: sub.provider_payment_method_display ?? sub.provider_payment_method,
                                    asInitialFallback: true,
                                  })}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                    {formatPaymentMethod(sub.payment_method_display || sub.payment_method)}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                      {sub.method_type || sub.payment_method || 'N/A'}
                                    </span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span
                                      className={`text-xs font-medium ${
                                        sub.is_enabled_for_cashout
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}
                                    >
                                      {sub.is_enabled_for_cashout ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Min <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(sub.min_amount_cashout)}</span></span>
                                    <span className="text-gray-300 dark:text-gray-600">·</span>
                                    <span>Max <span className="font-medium text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(sub.max_amount_cashout)}</span></span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAmounts(subToRow(sub));
                                      }}
                                      disabled={isUpdatingAmounts}
                                      className="h-8 text-xs"
                                    >
                                      Edit Limits
                                    </Button>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (loadingIds.has(loadingKey)) return;
                                        setLoadingIds((prev) => new Set(prev).add(loadingKey));
                                        try {
                                          const newStatus = !sub.is_enabled_for_cashout;
                                          await usePaymentMethodsStore.getState().updatePaymentMethod({
                                            id: sub.id!,
                                            action: 'cashout',
                                            value: newStatus,
                                          });
                                          addToast({
                                            type: 'success',
                                            title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                                            description: `${sub.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                                          });
                                        } catch (err) {
                                          addToast({
                                            type: 'error',
                                            title: 'Update failed',
                                            description: `Failed to ${sub.is_enabled_for_cashout ? 'disable' : 'enable'} ${sub.payment_method_display}.`,
                                          });
                                        } finally {
                                          setLoadingIds((prev) => {
                                            const next = new Set(prev);
                                            next.delete(loadingKey);
                                            return next;
                                          });
                                        }
                                      }}
                                      disabled={loadingIds.has(loadingKey)}
                                      className={`h-8 px-3 rounded-md text-xs font-medium border transition-colors ${
                                        sub.is_enabled_for_cashout
                                          ? 'border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                                          : 'border-green-200 dark:border-green-900/50 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/20'
                                      }`}
                                    >
                                      {loadingIds.has(loadingKey) ? (
                                        <>
                                          <span className="animate-spin mr-1.5 inline-block h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                                          {sub.is_enabled_for_cashout ? 'Disabling...' : 'Enabling...'}
                                        </>
                                      ) : (
                                        sub.is_enabled_for_cashout ? 'Disable' : 'Enable'
                                      )}
                                    </button>
                                  </div>
                                </div>
                            </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="py-16 px-8">
            <EmptyState 
              title="No Payment Methods" 
              description="Payment methods will appear here once configured"
            />
          </div>
        ) : (
          <>
            {/* Desktop Table View (Purchase or flat Cashout) */}
            <div className="hidden lg:block overflow-x-auto">
              <Table className="[&_th]:px-6 [&_th]:py-4 [&_td]:px-6 [&_td]:py-4">
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Amount Limits</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedResults.map((method) => (
                    <TableRow key={method.loadingKey} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center ring-1 ring-border/50 shadow-sm dark:shadow-none dark:border dark:border-border/50">
                          {getPaymentMethodIcon(method.payment_method, { size: 'md', methodType: method.method_type, providerPaymentMethod: method.provider_payment_method ?? undefined, asInitialFallback: true })}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {formatPaymentMethod(method.payment_method_display || method.payment_method)}
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
                    <TableCell>
                      <div className="inline-flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 dark:bg-slate-800 dark:border dark:border-slate-600/50 border border-gray-200 dark:border-slate-600/50 shadow-sm dark:shadow-none w-fit">
                        <div className="text-xs text-gray-600 dark:text-slate-400">
                          Min: <span className="font-medium text-gray-900 dark:text-slate-200 tabular-nums">
                            {formatAmount(method.action === 'cashout' ? method.min_amount_cashout : method.min_amount_purchase)}
                          </span>
                        </div>
                        <span className="w-px h-4 bg-gray-200 dark:bg-slate-600" aria-hidden />
                        <div className="text-xs text-gray-600 dark:text-slate-400">
                          Max: <span className="font-medium text-gray-900 dark:text-slate-200 tabular-nums">
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
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditAmounts(method)}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0"
                          title="Edit amount limits"
                        >
                          Edit Min/Max
                        </button>
                        <button
                          onClick={async () => {
                            const isCurrentlyLoading = loadingIds.has(method.loadingKey);
                            if (isCurrentlyLoading) return;

                            setLoadingIds((prev) => new Set(prev).add(method.loadingKey));
                            
                            try {
                              const newStatus = !method.isEnabled;
                              await usePaymentMethodsStore.getState().updatePaymentMethod({
                                id: method.id,
                                action: method.action,
                                value: newStatus,
                              });
                              
                              addToast({
                                type: 'success',
                                title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                                description: `${method.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                              });
                            } catch (error) {
                              console.error('Failed to update payment method:', error);
                              addToast({
                                type: 'error',
                                title: 'Update failed',
                                description: `Failed to ${method.isEnabled ? 'disable' : 'enable'} ${method.payment_method_display}.`,
                              });
                            } finally {
                              setLoadingIds((prev) => {
                                const next = new Set(prev);
                                next.delete(method.loadingKey);
                                return next;
                              });
                            }
                          }}
                          disabled={loadingIds.has(method.loadingKey)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                            method.isEnabled
                              ? loadingIds.has(method.loadingKey)
                                ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed opacity-70'
                                : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                              : loadingIds.has(method.loadingKey)
                                ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-not-allowed opacity-70'
                                : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                          }`}
                        >
                          {loadingIds.has(method.loadingKey) ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                              <span className="whitespace-nowrap">
                                {method.isEnabled ? 'Disabling...' : 'Enabling...'}
                              </span>
                            </>
                          ) : (
                            <span className="whitespace-nowrap">{method.isEnabled ? 'Disable' : 'Enable'}</span>
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4 p-4 lg:p-0">
            {sortedResults.map((method) => (
              <div
                key={method.loadingKey}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-6">
                    {/* Left: Icon + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center ring-1 ring-border/50 shadow-sm dark:shadow-none dark:border dark:border-border/50">
                        {getPaymentMethodIcon(method.payment_method, { size: 'lg', methodType: method.method_type, providerPaymentMethod: method.provider_payment_method ?? undefined, asInitialFallback: true })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 dark:text-gray-100 leading-tight truncate">
                          {formatPaymentMethod(method.payment_method_display || method.payment_method)}
                        </h3>
                      </div>
                    </div>

                    {/* Right: Action Button */}
                    <button
                      onClick={async () => {
                        const isCurrentlyLoading = loadingIds.has(method.loadingKey);
                        if (isCurrentlyLoading) return;

                        setLoadingIds((prev) => new Set(prev).add(method.loadingKey));
                        
                        try {
                          const newStatus = !method.isEnabled;
                          await usePaymentMethodsStore.getState().updatePaymentMethod({
                            id: method.id,
                            action: method.action,
                            value: newStatus,
                          });
                          
                          addToast({
                            type: 'success',
                            title: newStatus ? 'Payment method enabled' : 'Payment method disabled',
                            description: `${method.payment_method_display} has been ${newStatus ? 'enabled' : 'disabled'} successfully.`,
                          });
                        } catch (error) {
                          console.error('Failed to update payment method:', error);
                          addToast({
                            type: 'error',
                            title: 'Update failed',
                            description: `Failed to ${method.isEnabled ? 'disable' : 'enable'} ${method.payment_method_display}.`,
                          });
                        } finally {
                          setLoadingIds((prev) => {
                            const next = new Set(prev);
                            next.delete(method.loadingKey);
                            return next;
                          });
                        }
                      }}
                      disabled={loadingIds.has(method.loadingKey)}
                      className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                        method.isEnabled
                          ? loadingIds.has(method.loadingKey)
                            ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed opacity-70'
                            : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                          : loadingIds.has(method.loadingKey)
                            ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-not-allowed opacity-70'
                            : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                      }`}
                    >
                      {loadingIds.has(method.loadingKey) ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                          <span className="whitespace-nowrap">
                            {method.isEnabled ? 'Disabling...' : 'Enabling...'}
                          </span>
                        </>
                      ) : (
                        <span className="whitespace-nowrap">{method.isEnabled ? 'Disable' : 'Enable'}</span>
                      )}
                    </button>
                  </div>

                  {/* Mobile Amount Limits */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Amount Limits</span>
                      <button
                        onClick={() => handleEditAmounts(method)}
                        className="px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/50"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/90 dark:bg-slate-800 dark:border dark:border-slate-600/50 border border-gray-200 dark:border-slate-600/50 shadow-sm dark:shadow-none w-fit">
                      <div className="text-xs">
                        <span className="text-gray-600 dark:text-slate-400">Min:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-slate-200 tabular-nums">
                          {formatAmount(method.action === 'cashout' ? method.min_amount_cashout : method.min_amount_purchase)}
                        </span>
                      </div>
                      <span className="w-px h-4 bg-gray-200 dark:bg-slate-600" aria-hidden />
                      <div className="text-xs">
                        <span className="text-gray-600 dark:text-slate-400">Max:</span>{' '}
                        <span className="font-medium text-gray-900 dark:text-slate-200 tabular-nums">
                          {formatAmount(method.action === 'cashout' ? method.max_amount_cashout : method.max_amount_purchase)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile badges */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
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

      {/* Amount Modal */}
      <PaymentAmountModal
        isOpen={amountModalOpen}
        onClose={() => {
          setAmountModalOpen(false);
          setSelectedPaymentMethod(null);
        }}
        paymentMethod={selectedPaymentMethod as PaymentMethod | null}
        action={filterAction}
        onSave={handleSaveAmounts}
        isLoading={isUpdatingAmounts}
        scope="admin"
      />
    </div>
  );
}
