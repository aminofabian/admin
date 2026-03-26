import { create } from 'zustand';
import { paymentMethodsApi } from '@/lib/api';
import type {
  PaymentMethod,
  PaymentMethodAction,
  PaymentMethodsListResponse,
  PaymentMethodsListResponseRaw,
  CashoutPaymentMethod,
  PurchasePaymentMethod,
  UpdatePaymentMethodRequest,
} from '@/types';

interface PaymentMethodsState {
  paymentMethods: PaymentMethodsListResponse | null;
  /** Raw nested cashout for hierarchical UI (categories + subcategories) */
  cashoutCategories: CashoutPaymentMethod[] | null;
  /** Raw nested purchase for hierarchical UI (categories + subcategories) */
  purchaseCategories: PurchasePaymentMethod[] | null;
  isLoading: boolean;
  error: string | null;
}

interface UpdatePaymentMethodParams {
  id: number;
  action: PaymentMethodAction;
  value: boolean;
}

interface UpdatePaymentMethodAmountsParams {
  id: number;
  action: PaymentMethodAction;
  minAmount: number | null;
  maxAmount: number | null;
}

interface PaymentMethodsActions {
  fetchPaymentMethods: () => Promise<void>;
  updatePaymentMethod: (params: UpdatePaymentMethodParams) => Promise<void>;
  updatePaymentMethodAmounts: (params: UpdatePaymentMethodAmountsParams) => Promise<void>;
  reset: () => void;
}

type PaymentMethodsStore = PaymentMethodsState & PaymentMethodsActions;

const initialState: PaymentMethodsState = {
  paymentMethods: null,
  cashoutCategories: null,
  purchaseCategories: null,
  isLoading: false,
  error: null,
};

/** Company admin UI: omit methods the superadmin has disabled (`false`). `undefined` kept for older API responses. */
const isPurchaseAllowedBySuperadmin = (flag: boolean | undefined): boolean => flag !== false;

const isCashoutAllowedBySuperadmin = (flag: boolean | undefined): boolean => flag !== false;

/** Trim nested trees so settings / processing never surface gated-off providers. */
const filterPurchaseCategoriesForStore = (
  purchase: PurchasePaymentMethod[],
): PurchasePaymentMethod[] =>
  purchase
    .filter((parent) => isPurchaseAllowedBySuperadmin(parent.enabled_for_purchase_by_superadmin))
    .map((parent) => ({
      ...parent,
      subcategories: (parent.subcategories ?? []).filter((sub) =>
        isPurchaseAllowedBySuperadmin(sub.enabled_for_purchase_by_superadmin),
      ),
    }))
    .filter((parent) =>
      (parent.subcategories ?? []).some((s) => s.is_configured === true && s.id != null),
    );

const filterCashoutCategoriesForStore = (cashout: CashoutPaymentMethod[]): CashoutPaymentMethod[] =>
  cashout
    .filter((parent) => isCashoutAllowedBySuperadmin(parent.enabled_for_cashout_by_superadmin))
    .map((parent) => ({
      ...parent,
      subcategories: (parent.subcategories ?? []).filter((sub) =>
        isCashoutAllowedBySuperadmin(sub.enabled_for_cashout_by_superadmin),
      ),
    }))
    .filter((parent) =>
      (parent.subcategories ?? []).some((s) => s.is_configured === true && s.id != null),
    );

const normalizeMethods = (methods: PaymentMethod[]): PaymentMethod[] =>
  methods.map((method) => ({
    ...method,
    is_enabled_for_cashout: Boolean(method.is_enabled_for_cashout),
    is_enabled_for_purchase: Boolean(method.is_enabled_for_purchase),
  }));

/** Flatten cashout with subcategories into PaymentMethod rows (configured subcategories only) */
const flattenCashout = (cashout: CashoutPaymentMethod[]): PaymentMethod[] => {
  const rows: PaymentMethod[] = [];
  for (const parent of cashout) {
    if (!isCashoutAllowedBySuperadmin(parent.enabled_for_cashout_by_superadmin)) continue;
    if (parent.has_subcategories && parent.subcategories?.length) {
      for (const sub of parent.subcategories) {
        if (
          sub.is_configured === true &&
          sub.id != null &&
          isCashoutAllowedBySuperadmin(sub.enabled_for_cashout_by_superadmin)
        ) {
          rows.push({
            id: sub.id,
            payment_method: sub.payment_method,
            payment_method_display: sub.payment_method_display || sub.provider_payment_method_display || sub.payment_method,
            method_type: sub.method_type || sub.payment_method || 'N/A',
            provider_payment_method: sub.provider_payment_method ?? undefined,
            is_enabled_for_cashout: Boolean(sub.is_enabled_for_cashout),
            enabled_for_cashout_by_superadmin: sub.enabled_for_cashout_by_superadmin,
            min_amount_cashout: sub.min_amount_cashout ?? null,
            max_amount_cashout: sub.max_amount_cashout ?? null,
            superadmin_min_amount_cashout: sub.superadmin_min_amount_cashout ?? null,
            superadmin_max_amount_cashout: sub.superadmin_max_amount_cashout ?? null,
            created: sub.created ?? '',
            modified: sub.modified ?? '',
          });
        }
      }
    }
  }
  return rows;
};

/** Flatten purchase with subcategories into PaymentMethod rows (configured subcategories only) */
const flattenPurchase = (purchase: PurchasePaymentMethod[]): PaymentMethod[] => {
  const rows: PaymentMethod[] = [];
  for (const parent of purchase) {
    if (!isPurchaseAllowedBySuperadmin(parent.enabled_for_purchase_by_superadmin)) continue;
    if (parent.has_subcategories && parent.subcategories?.length) {
      for (const sub of parent.subcategories) {
        if (
          sub.is_configured === true &&
          sub.id != null &&
          isPurchaseAllowedBySuperadmin(sub.enabled_for_purchase_by_superadmin)
        ) {
          rows.push({
            id: sub.id,
            payment_method: sub.payment_method,
            payment_method_display: sub.payment_method_display || sub.provider_payment_method_display || sub.payment_method,
            method_type: sub.method_type || sub.payment_method || 'N/A',
            provider_payment_method: sub.provider_payment_method ?? undefined,
            is_enabled_for_purchase: Boolean(sub.is_enabled_for_purchase),
            enabled_for_purchase_by_superadmin: sub.enabled_for_purchase_by_superadmin,
            min_amount_purchase: sub.min_amount_purchase ?? null,
            max_amount_purchase: sub.max_amount_purchase ?? null,
            superadmin_min_amount_purchase: sub.superadmin_min_amount_purchase ?? null,
            superadmin_max_amount_purchase: sub.superadmin_max_amount_purchase ?? null,
            created: sub.created ?? '',
            modified: sub.modified ?? '',
          });
        }
      }
    }
  }
  return rows;
};

export const usePaymentMethodsStore = create<PaymentMethodsStore>((set, get) => ({
  ...initialState,

  fetchPaymentMethods: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await paymentMethodsApi.list();

      const isNestedCashout = (arr: unknown): arr is CashoutPaymentMethod[] =>
        Array.isArray(arr) &&
        arr.length > 0 &&
        typeof (arr[0] as CashoutPaymentMethod).has_subcategories === 'boolean';

      const isNestedPurchase = (arr: unknown): arr is PurchasePaymentMethod[] =>
        Array.isArray(arr) &&
        arr.length > 0 &&
        typeof (arr[0] as PurchasePaymentMethod).has_subcategories === 'boolean';

      const cashoutRaw = data.cashout ?? [];
      const purchaseRaw = data.purchase ?? [];
      const cashoutFlat = isNestedCashout(cashoutRaw)
        ? flattenCashout(cashoutRaw)
        : (cashoutRaw as PaymentMethod[]).filter((m) =>
            isCashoutAllowedBySuperadmin(m.enabled_for_cashout_by_superadmin),
          );
      const purchaseFlat = isNestedPurchase(purchaseRaw)
        ? flattenPurchase(purchaseRaw)
        : (purchaseRaw as PaymentMethod[]).filter((m) =>
            isPurchaseAllowedBySuperadmin(m.enabled_for_purchase_by_superadmin),
          );

      set({
        paymentMethods: {
          cashout: normalizeMethods(cashoutFlat),
          purchase: normalizeMethods(purchaseFlat),
        },
        cashoutCategories: isNestedCashout(cashoutRaw)
          ? filterCashoutCategoriesForStore(cashoutRaw)
          : null,
        purchaseCategories: isNestedPurchase(purchaseRaw)
          ? filterPurchaseCategoriesForStore(purchaseRaw)
          : null,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load payment methods';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to view payment methods.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  updatePaymentMethod: async ({ id, action, value }: UpdatePaymentMethodParams) => {
    try {
      const payload: UpdatePaymentMethodRequest =
        action === 'cashout'
          ? { is_enabled_for_cashout: value }
          : { is_enabled_for_purchase: value };

      await paymentMethodsApi.patch(id, payload);

      const currentPaymentMethods = get().paymentMethods;
      const cashoutCategories = get().cashoutCategories;
      const purchaseCategories = get().purchaseCategories;

      if (currentPaymentMethods) {
        const updateList = (methods: PaymentMethod[]) =>
          methods.map((method) => {
            if (method.id !== id) {
              return method;
            }

            if (action === 'cashout') {
              return { ...method, is_enabled_for_cashout: value };
            }

            return { ...method, is_enabled_for_purchase: value };
          });

        const updateCashoutCategories = (cats: CashoutPaymentMethod[] | null): CashoutPaymentMethod[] | null => {
          if (!cats || action !== 'cashout') return cats;
          return cats.map((parent) => ({
            ...parent,
            subcategories: parent.subcategories.map((sub) =>
              sub.id === id ? { ...sub, is_enabled_for_cashout: value } : sub
            ),
            enabled_subcategories_count: parent.subcategories.reduce(
              (n, s) => n + (s.id === id ? (value ? 1 : 0) : (s.is_enabled_for_cashout ? 1 : 0)),
              0
            ),
          }));
        };

        const updatePurchaseCategories = (cats: PurchasePaymentMethod[] | null): PurchasePaymentMethod[] | null => {
          if (!cats || action !== 'purchase') return cats;
          return cats.map((parent) => ({
            ...parent,
            subcategories: parent.subcategories.map((sub) =>
              sub.id === id ? { ...sub, is_enabled_for_purchase: value } : sub
            ),
            enabled_subcategories_count: parent.subcategories.reduce(
              (n, s) => n + (s.id === id ? (value ? 1 : 0) : (s.is_enabled_for_purchase ? 1 : 0)),
              0
            ),
          }));
        };

        set({
          paymentMethods: {
            cashout: updateList(currentPaymentMethods.cashout),
            purchase: updateList(currentPaymentMethods.purchase),
          },
          cashoutCategories: updateCashoutCategories(cashoutCategories),
          purchaseCategories: updatePurchaseCategories(purchaseCategories),
        });
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to update payment method';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to update payment methods.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  updatePaymentMethodAmounts: async ({ id, action, minAmount, maxAmount }: UpdatePaymentMethodAmountsParams) => {
    try {
      const payload: UpdatePaymentMethodRequest =
        action === 'cashout'
          ? {
              min_amount_cashout: minAmount,
              max_amount_cashout: maxAmount,
            }
          : {
              min_amount_purchase: minAmount,
              max_amount_purchase: maxAmount,
            };

      await paymentMethodsApi.patch(id, payload);

      const currentPaymentMethods = get().paymentMethods;
      const cashoutCategories = get().cashoutCategories;
      const purchaseCategories = get().purchaseCategories;

      if (currentPaymentMethods) {
        const updateList = (methods: PaymentMethod[]) =>
          methods.map((method) => {
            if (method.id !== id) {
              return method;
            }

            if (action === 'cashout') {
              return {
                ...method,
                min_amount_cashout: minAmount !== null ? String(minAmount) : null,
                max_amount_cashout: maxAmount !== null ? String(maxAmount) : null,
              };
            }

            return {
              ...method,
              min_amount_purchase: minAmount !== null ? String(minAmount) : null,
              max_amount_purchase: maxAmount !== null ? String(maxAmount) : null,
            };
          });

        const updateCashoutCategories = (cats: CashoutPaymentMethod[] | null): CashoutPaymentMethod[] | null => {
          if (!cats || action !== 'cashout') return cats;
          return cats.map((parent) => ({
            ...parent,
            subcategories: parent.subcategories.map((sub) =>
              sub.id === id
                ? {
                    ...sub,
                    min_amount_cashout: minAmount !== null ? String(minAmount) : null,
                    max_amount_cashout: maxAmount !== null ? String(maxAmount) : null,
                  }
                : sub
            ),
          }));
        };

        const updatePurchaseCategories = (cats: PurchasePaymentMethod[] | null): PurchasePaymentMethod[] | null => {
          if (!cats || action !== 'purchase') return cats;
          return cats.map((parent) => ({
            ...parent,
            subcategories: parent.subcategories.map((sub) =>
              sub.id === id
                ? {
                    ...sub,
                    min_amount_purchase: minAmount !== null ? String(minAmount) : null,
                    max_amount_purchase: maxAmount !== null ? String(maxAmount) : null,
                  }
                : sub
            ),
          }));
        };

        set({
          paymentMethods: {
            cashout: updateList(currentPaymentMethods.cashout),
            purchase: updateList(currentPaymentMethods.purchase),
          },
          cashoutCategories: updateCashoutCategories(cashoutCategories),
          purchaseCategories: updatePurchaseCategories(purchaseCategories),
        });
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to update payment method amounts';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to update payment methods.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

