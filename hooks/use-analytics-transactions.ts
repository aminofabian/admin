import { useState, useEffect } from 'react';
import { analyticsApi, type AnalyticsFilters } from '@/lib/api/analytics';
import type {
  TransactionSummary,
  PaymentMethodBreakdown,
  BonusAnalytics,
  PurchaseMethodGroupedRow,
  CashoutMethodGroupedRow,
  ManualAdjustmentRow,
} from '@/lib/api/analytics';

/** Maps API payload to a consistent TransactionSummary (handles missing keys and total_cash_in alias). */
function normalizeTransactionSummary(raw: TransactionSummary | Record<string, unknown>): TransactionSummary {
  const o = raw as Record<string, unknown>;
  const num = (v: unknown): number => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);
  const purchase =
    typeof o.total_purchase === 'number' && !Number.isNaN(o.total_purchase)
      ? o.total_purchase
      : typeof o.total_cash_in === 'number' && !Number.isNaN(o.total_cash_in)
        ? o.total_cash_in
        : 0;
  return {
    total_purchase: purchase,
    total_cashout: num(o.total_cashout),
    total_transfer: num(o.total_transfer),
  };
}

function normalizePurchaseMethodGrouped(raw: unknown): PurchaseMethodGroupedRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const s = (v: unknown): string => (typeof v === 'string' ? v : '');
  const payment_method = s(o.payment_method);
  if (!payment_method) return null;
  return {
    payment_method,
    payment_method_display: typeof o.payment_method_display === 'string' ? o.payment_method_display : undefined,
    purchase: n(o.purchase),
    bonus: n(o.bonus),
    average_bonus_pct: n(o.average_bonus_pct),
    success_rate: n(o.success_rate),
    average_transaction_size: n(o.average_transaction_size),
    usage_distribution_pct: n(o.usage_distribution_pct),
  };
}

function normalizeCashoutMethodGrouped(raw: unknown): CashoutMethodGroupedRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const s = (v: unknown): string => (typeof v === 'string' ? v : '');
  const payment_method = s(o.payment_method);
  if (!payment_method) return null;
  return {
    payment_method,
    payment_method_display: typeof o.payment_method_display === 'string' ? o.payment_method_display : undefined,
    cashout: n(o.cashout),
    success_rate: n(o.success_rate),
    average_transaction_size: n(o.average_transaction_size),
    usage_distribution_pct: n(o.usage_distribution_pct),
  };
}

function normalizeManualAdjustment(raw: unknown): ManualAdjustmentRow | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const s = (v: unknown): string => (typeof v === 'string' ? v : '');
  const adjustment_type = s(o.adjustment_type);
  if (!adjustment_type) return null;
  return {
    adjustment_type,
    adjustment_display: typeof o.adjustment_display === 'string' ? o.adjustment_display : undefined,
    amount: n(o.amount),
  };
}

/** Ensures every bonus analytics field is a finite number (matches API snake_case payload). */
function normalizeBonusAnalytics(raw: unknown): BonusAnalytics {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    total_bonus: n(o.total_bonus),
    purchase_bonus: n(o.purchase_bonus),
    average_purchase_bonus_pct: n(o.average_purchase_bonus_pct),
    signup_bonus: n(o.signup_bonus),
    average_signup_bonus: n(o.average_signup_bonus),
    first_deposit_bonus: n(o.first_deposit_bonus),
    average_first_deposit_bonus_pct: n(o.average_first_deposit_bonus_pct),
    transfer_bonus: n(o.transfer_bonus),
    average_transfer_bonus_pct: n(o.average_transfer_bonus_pct),
    total_free_play: n(o.total_free_play),
    average_free_play: n(o.average_free_play),
    seized_or_tipped_fund: n(o.seized_or_tipped_fund),
  };
}

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
          setData(normalizeTransactionSummary(response.data));
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
  const [purchaseMethodsGrouped, setPurchaseMethodsGrouped] = useState<PurchaseMethodGroupedRow[]>([]);
  const [cashoutMethodsGrouped, setCashoutMethodsGrouped] = useState<CashoutMethodGroupedRow[]>([]);
  const [manualAdjustments, setManualAdjustments] = useState<ManualAdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await analyticsApi.getPaymentMethods(filters);
        if (response.status === 'success' && response.data) {
          const paymentMethodsArray: PaymentMethodBreakdown[] = [];

          // Process purchases data
          if (response.data.purchases) {
            Object.entries(response.data.purchases).forEach(([paymentMethod, metrics]) => {
              paymentMethodsArray.push({
                payment_method: paymentMethod,
                type: 'purchase',
                purchase: metrics.purchase ?? 0,
                bonus: metrics.bonus ?? 0,
                average_bonus_pct: metrics.average_bonus_pct ?? 0,
                cashout: 0, // Purchases don't have cashout data
                success_rate: metrics.success_rate ?? 0,
                average_transaction_size: metrics.average_transaction_size ?? 0,
                usage_distribution_pct: metrics.usage_distribution_pct ?? 0,
              });
            });
          }

          // Process cashouts data
          if (response.data.cashouts) {
            Object.entries(response.data.cashouts).forEach(([paymentMethod, metrics]) => {
              paymentMethodsArray.push({
                payment_method: paymentMethod,
                type: 'cashout',
                purchase: 0, // Cashouts don't have purchase data
                bonus: 0, // Cashouts don't have bonus data
                average_bonus_pct: 0, // Cashouts don't have bonus data
                cashout: metrics.cashout ?? 0,
                success_rate: metrics.success_rate ?? 0,
                average_transaction_size: metrics.average_transaction_size ?? 0,
                usage_distribution_pct: metrics.usage_distribution_pct ?? 0,
              });
            });
          }

          const purchaseGrouped: PurchaseMethodGroupedRow[] = Array.isArray(response.data.purchase_methods)
            ? response.data.purchase_methods
                .map(normalizePurchaseMethodGrouped)
                .filter((row): row is PurchaseMethodGroupedRow => row !== null)
            : [];
          const cashoutGrouped: CashoutMethodGroupedRow[] = Array.isArray(response.data.cashout_methods)
            ? response.data.cashout_methods
                .map(normalizeCashoutMethodGrouped)
                .filter((row): row is CashoutMethodGroupedRow => row !== null)
            : [];
          const manualAdjustmentRows: ManualAdjustmentRow[] = Array.isArray(response.data.manual_adjustments)
            ? response.data.manual_adjustments
                .map(normalizeManualAdjustment)
                .filter((row): row is ManualAdjustmentRow => row !== null)
            : [];

          setData(paymentMethodsArray);
          setPurchaseMethodsGrouped(purchaseGrouped);
          setCashoutMethodsGrouped(cashoutGrouped);
          setManualAdjustments(manualAdjustmentRows);
        } else {
          throw new Error(response.message || 'Failed to fetch payment methods');
        }
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load payment methods';
        console.warn('⚠️ Payment methods failed:', errorMessage);
        setError(errorMessage);
        setData([]);
        setPurchaseMethodsGrouped([]);
        setCashoutMethodsGrouped([]);
        setManualAdjustments([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [JSON.stringify(filters)]);

  return { data, purchaseMethodsGrouped, cashoutMethodsGrouped, manualAdjustments, loading, error };
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
          setData(normalizeBonusAnalytics(response.data));
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
