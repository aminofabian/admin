'use client';

import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import { LoadingState, ErrorState } from '@/components/features';
import { usePaymentMethodsStore } from '@/stores';
import { useToast } from '@/components/ui/toast';

const PAYMENT_ICON: JSX.Element = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

export function PaymentSettingsSection() {
  const paymentMethods = usePaymentMethodsStore((state) => state.paymentMethods);
  const isLoading = usePaymentMethodsStore((state) => state.isLoading);
  const error = usePaymentMethodsStore((state) => state.error);
  const fetchPaymentMethods = usePaymentMethodsStore((state) => state.fetchPaymentMethods);
  const { addToast } = useToast();
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());

  const results = paymentMethods?.results ?? [];
  const totalCount = paymentMethods?.count ?? 0;

  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  if (isLoading && !paymentMethods) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchPaymentMethods} />;
  }

  const enabledCount = results.filter(m => m.is_enabled).length;
  const disabledCount = results.filter(m => !m.is_enabled).length;

  // Sort payment methods: cryptos first, then others
  const sortedResults = [...results].sort((a, b) => {
    const aIsCrypto = a.method_type?.toLowerCase().includes('crypto') || a.payment_method?.toLowerCase().includes('crypto');
    const bIsCrypto = b.method_type?.toLowerCase().includes('crypto') || b.payment_method?.toLowerCase().includes('crypto');
    
    if (aIsCrypto && !bIsCrypto) return -1;
    if (!aIsCrypto && bIsCrypto) return 1;
    return 0;
  });

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
            {PAYMENT_ICON}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-foreground">
              Payment Methods
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and configure available payment methods
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-md border border-green-200 dark:border-green-800">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-xs font-medium">{enabledCount} Active</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-950/30 text-gray-700 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-800">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span className="text-xs font-medium">{disabledCount} Inactive</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-800">
                <span className="text-xs font-medium">{totalCount} Total</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods List */}
      {results.length === 0 ? (
        <div className="bg-card border border-border rounded-lg">
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              {PAYMENT_ICON}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No Payment Methods</h3>
            <p className="text-sm text-muted-foreground">
              Payment methods will appear here once configured
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedResults.map((method) => (
            <div
              key={method.id}
              className="bg-card border border-border rounded-lg hover:border-primary/30 hover:shadow-sm transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex items-center justify-between gap-6">
                  {/* Left: Icon + Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${method.is_enabled ? 'bg-green-50 dark:bg-green-950/30' : 'bg-gray-50 dark:bg-gray-950/30'}`}>
                      <svg className={`w-5 h-5 ${method.is_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground leading-tight truncate">
                        {method.payment_method_display}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {method.payment_method}
                      </p>
                    </div>
                  </div>

                  {/* Center: Badges */}
                  <div className="hidden md:flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                      {method.method_type}
                    </span>
                    
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.is_enabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${method.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                      {method.is_enabled ? 'Active' : 'Inactive'}
                    </span>

                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(method.modified).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Right: Action Button */}
                  <button
                    onClick={async () => {
                      const isCurrentlyLoading = loadingIds.has(method.id);
                      if (isCurrentlyLoading) return;

                      setLoadingIds((prev) => new Set(prev).add(method.id));
                      
                      try {
                        const newStatus = !method.is_enabled;
                        await usePaymentMethodsStore.getState().updatePaymentMethod(method.id, {
                          is_enabled: newStatus,
                        });
                        
                        // Show success toast
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
                          description: `Failed to ${method.is_enabled ? 'disable' : 'enable'} ${method.payment_method_display}.`,
                        });
                      } finally {
                        setLoadingIds((prev) => {
                          const next = new Set(prev);
                          next.delete(method.id);
                          return next;
                        });
                      }
                    }}
                    disabled={loadingIds.has(method.id)}
                    className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      method.is_enabled
                        ? loadingIds.has(method.id)
                          ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 cursor-not-allowed opacity-70'
                          : 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/40 hover:border-orange-300 dark:hover:border-orange-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                        : loadingIds.has(method.id)
                          ? 'bg-green-100 dark:bg-green-950/50 text-green-600 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-not-allowed opacity-70'
                          : 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/50 hover:border-green-300 dark:hover:border-green-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95 active:translate-y-0'
                    }`}
                  >
                    {loadingIds.has(method.id) ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                        <span className="whitespace-nowrap">
                          {method.is_enabled ? 'Disabling...' : 'Enabling...'}
                        </span>
                      </>
                    ) : (
                      <span className="whitespace-nowrap">{method.is_enabled ? 'Disable' : 'Enable'}</span>
                    )}
                  </button>
                </div>

                {/* Mobile badges - show below on small screens */}
                <div className="md:hidden flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border">
                  <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-800 text-xs font-medium capitalize">
                    {method.method_type}
                  </span>
                  
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium ${method.is_enabled ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${method.is_enabled ? 'bg-green-500' : 'bg-red-500'}`} />
                    {method.is_enabled ? 'Active' : 'Inactive'}
                  </span>

                  <span className="text-xs text-muted-foreground">
                    {new Date(method.modified).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
