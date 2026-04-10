import type {
  CashoutPaymentMethod,
  PaymentMethod,
  PaymentMethodsListResponseRaw,
  PurchasePaymentMethod,
} from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';
import {
  filterPurchaseCategoriesLikeSettings,
  isPurchaseAllowedBySuperadmin,
} from '@/lib/utils/payment-methods-category-filters';

function isNestedCashout(arr: unknown): arr is CashoutPaymentMethod[] {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    typeof (arr[0] as CashoutPaymentMethod).has_subcategories === 'boolean'
  );
}

function isNestedPurchase(arr: unknown): arr is PurchasePaymentMethod[] {
  return (
    Array.isArray(arr) &&
    arr.length > 0 &&
    typeof (arr[0] as PurchasePaymentMethod).has_subcategories === 'boolean'
  );
}

/**
 * Omitted from the provider dropdown and not treated as an integrator slug when splitting
 * payment-method vs provider filters (e.g. PayPal is a rail, not Binpay/Tierlock-style provider).
 */
const PROVIDER_FILTER_EXCLUDED_SLUGS = new Set(['paypal']);

const MANUAL_ADJUSTMENT_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'freeplay', label: 'Freeplay' },
  { value: 'manual', label: 'Manual' },
  { value: 'seize_tip', label: 'Seize Tip' },
  { value: 'external_deposit', label: 'External Deposit' },
  { value: 'external_cashout', label: 'External Cashout' },
  { value: 'void', label: 'Void' },
];

/** API/query param for the card rail (matches backend). */
export const PAYMENT_METHOD_CARD_QUERY_VALUE = 'card';

/** UI label for the card rail in transaction filters (query value remains `card`). */
export const PAYMENT_METHOD_CARD_DISPLAY_LABEL = 'Card';

/**
 * Map card-style parent slugs to the query value the API expects (`card`).
 */
export function normalizePaymentMethodFilterQueryValue(raw: string | null | undefined): string {
  const s = raw?.trim();
  if (!s) return '';
  const k = s.toLowerCase().replace(/-/g, '_');
  if (
    k === 'card' ||
    k === 'credit_card' ||
    k === 'debit_card' ||
    k === 'credit_debit_card' ||
    k === 'credit_and_debit_card'
  ) {
    return PAYMENT_METHOD_CARD_QUERY_VALUE;
  }
  return s;
}

/** True when API/settings use the long "Credit & Debit Card" style label for the card rail. */
export function isCreditDebitCardCategoryDisplay(display: string | null | undefined): boolean {
  const t = display?.trim().toLowerCase() ?? '';
  if (!t) return false;
  const s = t.replace(/\s+/g, ' ');
  return s.includes('credit') && s.includes('debit') && s.includes('card');
}

/**
 * Purchase-tab parent categories (Payment Settings → Purchase), then manual / internal rails.
 * No cashout-only parents.
 */
export function buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const result: Array<{ value: string; label: string }> = [];
  const seen = new Set<string>();

  const pushParentCategory = (
    slug: string | null | undefined,
    display: string | null | undefined,
  ) => {
    const isCardRail =
      normalizePaymentMethodFilterQueryValue(slug) === PAYMENT_METHOD_CARD_QUERY_VALUE ||
      isCreditDebitCardCategoryDisplay(display);
    const queryValue = isCardRail
      ? PAYMENT_METHOD_CARD_QUERY_VALUE
      : normalizePaymentMethodFilterQueryValue(slug) || slug?.trim() || '';
    if (!queryValue) return;
    const key = queryValue.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    const label = isCardRail
      ? PAYMENT_METHOD_CARD_DISPLAY_LABEL
      : formatPaymentMethod(display?.trim() ? display.trim() : queryValue);
    result.push({ value: queryValue, label });
  };

  const purchaseRaw = data.purchase ?? [];
  if (isNestedPurchase(purchaseRaw)) {
    for (const cat of filterPurchaseCategoriesLikeSettings(purchaseRaw)) {
      pushParentCategory(cat.payment_method, cat.payment_method_display);
    }
  } else {
    for (const m of purchaseRaw as PaymentMethod[]) {
      if (!isPurchaseAllowedBySuperadmin(m.enabled_for_purchase_by_superadmin)) continue;
      pushParentCategory(m.payment_method, m.payment_method_display);
    }
  }

  for (const { value, label } of MANUAL_ADJUSTMENT_METHOD_OPTIONS) {
    const k = value.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      result.push({ value, label });
    }
  }

  return result;
}

/**
 * Unique provider slugs for transaction history `provider` query param, derived from
 * the same admin payment-methods payload used elsewhere (subcategory integrators).
 */
export function buildProviderFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const map = new Map<string, { value: string; label: string }>();

  const add = (raw: string | null | undefined, displayHint: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (PROVIDER_FILTER_EXCLUDED_SLUGS.has(key)) return;
    const label =
      displayHint?.trim() && displayHint.trim().length > 0
        ? displayHint.trim()
        : formatPaymentMethod(v);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { value: v, label });
      return;
    }
    if (displayHint?.trim() && displayHint.trim().length > 0) {
      map.set(key, { value: prev.value, label: displayHint.trim() });
    }
  };

  const cashout = data.cashout ?? [];
  if (isNestedCashout(cashout)) {
    for (const parent of cashout) {
      for (const sub of parent.subcategories ?? []) {
        add(sub.provider_payment_method, sub.provider_payment_method_display);
      }
    }
  } else {
    for (const m of cashout as PaymentMethod[]) {
      add(m.provider_payment_method, m.payment_method_display);
    }
  }

  const purchase = data.purchase ?? [];
  if (isNestedPurchase(purchase)) {
    for (const parent of purchase) {
      for (const sub of parent.subcategories ?? []) {
        add(sub.provider_payment_method, sub.provider_payment_method_display);
      }
    }
  } else {
    for (const m of purchase as PaymentMethod[]) {
      add(m.provider_payment_method, m.payment_method_display);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
  );
}
