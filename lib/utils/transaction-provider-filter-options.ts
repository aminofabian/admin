import type {
  CashoutPaymentMethod,
  PaymentMethod,
  PaymentMethodsListResponseRaw,
  PurchasePaymentMethod,
} from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';

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
