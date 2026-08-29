'use client';

import { useEffect, useState } from 'react';
import { paymentMethodsApi } from '@/lib/api';
import {
  buildHistoryPaymentMethodFilterOptionsFromPaymentMethodsRaw,
  buildHistoryProviderFilterOptionsFromPaymentMethodsRaw,
  STATIC_PAYMENT_METHOD_FILTER_OPTIONS,
  STATIC_PROVIDER_FILTER_OPTIONS,
} from '@/lib/utils/transaction-provider-filter-options';

type FilterOption = { value: string; label: string };

/**
 * Loads Payment method / Provider dropdown options for transaction history from
 * `GET api/admin/payment-methods`. Falls back to the static canonical lists if the request fails.
 */
export function useHistoryPaymentFilterOptions(enabled: boolean) {
  const [paymentMethodOptions, setPaymentMethodOptions] = useState<FilterOption[]>([]);
  const [providerOptions, setProviderOptions] = useState<FilterOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      try {
        const data = await paymentMethodsApi.list();
        if (!isMounted) return;
        setPaymentMethodOptions(buildHistoryPaymentMethodFilterOptionsFromPaymentMethodsRaw(data));
        setProviderOptions(buildHistoryProviderFilterOptionsFromPaymentMethodsRaw(data));
      } catch (error) {
        console.error('Failed to load payment filter options for transaction history:', error);
        if (!isMounted) return;
        setPaymentMethodOptions(STATIC_PAYMENT_METHOD_FILTER_OPTIONS);
        setProviderOptions(STATIC_PROVIDER_FILTER_OPTIONS);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return {
    paymentMethodOptions,
    providerOptions,
    isLoading,
  };
}
