import { useState, useEffect } from 'react';
import { analyticsApi, type AnalyticsFilters } from '@/lib/api/analytics';
import type {
  TransactionSummary,
  PaymentMethodBreakdown,
  BonusAnalytics,
} from '@/lib/api/analytics';

export function useTransactionSummary(filters?: AnalyticsFilters) {
  const [data, setData] = useState<TransactionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getTransactionSummary(filters);
        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch transaction summary');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load transaction summary';
        console.warn('⚠️ Transaction summary failed:', errorMessage);
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}

export function usePaymentMethods(filters?: AnalyticsFilters) {
  const [data, setData] = useState<PaymentMethodBreakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getPaymentMethods(filters);
        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch payment methods');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load payment methods';
        console.warn('⚠️ Payment methods failed:', errorMessage);
        setError(errorMessage);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}

export function useBonusAnalytics(filters?: AnalyticsFilters) {
  const [data, setData] = useState<BonusAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getBonusAnalytics(filters);
        if (response.status === 'success' && response.data) {
          setData(response.data);
        } else {
          throw new Error(response.message || 'Failed to fetch bonus analytics');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load bonus analytics';
        console.warn('⚠️ Bonus analytics failed:', errorMessage);
        setError(errorMessage);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, loading, error };
}
