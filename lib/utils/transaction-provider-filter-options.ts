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

/** Slugs used for `transaction.provider` / integrator — exclude from payment-method filter. */
function collectProviderSlugSet(data: PaymentMethodsListResponseRaw): Set<string> {
  const slugs = new Set<string>();
  const addSlug = (raw: string | null | undefined) => {
    const v = raw?.trim();
    if (v) slugs.add(v.toLowerCase());
  };

  const cashout = data.cashout ?? [];
  if (isNestedCashout(cashout)) {
    for (const parent of cashout) {
      for (const sub of parent.subcategories ?? []) {
        addSlug(sub.provider_payment_method);
        const pm = sub.payment_method?.trim();
        const ppm = sub.provider_payment_method?.trim();
        if (pm && ppm && pm.toLowerCase() === ppm.toLowerCase()) {
          addSlug(pm);
        }
      }
    }
  } else {
    for (const m of cashout as PaymentMethod[]) {
      addSlug(m.provider_payment_method);
      const pm = m.payment_method?.trim();
      const ppm = m.provider_payment_method?.trim();
      if (pm && ppm && pm.toLowerCase() === ppm.toLowerCase()) {
        addSlug(pm);
      }
    }
  }

  const purchase = data.purchase ?? [];
  if (isNestedPurchase(purchase)) {
    for (const parent of purchase) {
      for (const sub of parent.subcategories ?? []) {
        addSlug(sub.provider_payment_method);
        const pm = sub.payment_method?.trim();
        const ppm = sub.provider_payment_method?.trim();
        if (pm && ppm && pm.toLowerCase() === ppm.toLowerCase()) {
          addSlug(pm);
        }
      }
    }
  } else {
    for (const m of purchase as PaymentMethod[]) {
      addSlug(m.provider_payment_method);
      const pm = m.payment_method?.trim();
      const ppm = m.provider_payment_method?.trim();
      if (pm && ppm && pm.toLowerCase() === ppm.toLowerCase()) {
        addSlug(pm);
      }
    }
  }

  return slugs;
}

const MANUAL_ADJUSTMENT_METHOD_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'free_play', label: 'Freeplay' },
  { value: 'freeplay', label: 'Freeplay' },
  { value: 'manual', label: 'Manual' },
  { value: 'seize_tip', label: 'Seize Tip' },
  { value: 'external_deposit', label: 'External Deposit' },
  { value: 'external_cashout', label: 'External Cashout' },
  { value: 'void', label: 'Void' },
];

/**
 * Payment rails for history `payment_method` query param — category + subcategory `payment_method`
 * only, never `provider_payment_method` integrator slugs.
 */
export function buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const providerSlugs = collectProviderSlugSet(data);
  const map = new Map<string, { value: string; label: string }>();

  const addMethod = (raw: string | null | undefined, displayHint: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    if (providerSlugs.has(v.toLowerCase())) return;
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
      addMethod(parent.payment_method, parent.payment_method_display);
      for (const sub of parent.subcategories ?? []) {
        addMethod(sub.payment_method, sub.payment_method_display);
      }
    }
  } else {
    for (const m of cashout as PaymentMethod[]) {
      addMethod(m.payment_method, m.payment_method_display);
    }
  }

  const purchase = data.purchase ?? [];
  if (isNestedPurchase(purchase)) {
    for (const parent of purchase) {
      addMethod(parent.payment_method, parent.payment_method_display);
      for (const sub of parent.subcategories ?? []) {
        addMethod(sub.payment_method, sub.payment_method_display);
      }
    }
  } else {
    for (const m of purchase as PaymentMethod[]) {
      addMethod(m.payment_method, m.payment_method_display);
    }
  }

  for (const { value, label } of MANUAL_ADJUSTMENT_METHOD_OPTIONS) {
    if (!providerSlugs.has(value.toLowerCase())) {
      map.set(value.toLowerCase(), { value, label });
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }),
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
