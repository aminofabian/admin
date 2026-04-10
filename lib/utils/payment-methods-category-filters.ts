import type { CashoutPaymentMethod, PurchasePaymentMethod } from '@/types';

/** Company admin UI: omit methods the superadmin has disabled (`false`). */
export const isPurchaseAllowedBySuperadmin = (flag: boolean | undefined): boolean => flag !== false;

export const isCashoutAllowedBySuperadmin = (flag: boolean | undefined): boolean => flag !== false;

/**
 * Same rules as Payment Settings purchase tab (`purchaseCategories`) and
 * `usePaymentMethodsStore` — superadmin gates + at least one configured subcategory.
 */
export function filterPurchaseCategoriesLikeSettings(
  purchase: PurchasePaymentMethod[],
): PurchasePaymentMethod[] {
  return purchase
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
}

/**
 * Same rules as Payment Settings cashout tab (`cashoutCategories`) and store.
 */
export function filterCashoutCategoriesLikeSettings(
  cashout: CashoutPaymentMethod[],
): CashoutPaymentMethod[] {
  return cashout
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
}
