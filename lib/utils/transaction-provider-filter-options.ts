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
 * Omitted from the provider dropdown and not treated as an integrator slug when splitting
 * payment-method vs provider filters (e.g. PayPal is a rail, not Binpay/Tierlock-style provider).
 */
const PROVIDER_FILTER_EXCLUDED_SLUGS = new Set(['paypal']);

/** Slugs used for `transaction.provider` / integrator — exclude from payment-method filter. */
function collectProviderSlugSet(data: PaymentMethodsListResponseRaw): Set<string> {
  const slugs = new Set<string>();
  const addSlug = (raw: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (PROVIDER_FILTER_EXCLUDED_SLUGS.has(key)) return;
    slugs.add(key);
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
  { value: 'freeplay', label: 'Freeplay' },
  { value: 'manual', label: 'Manual' },
  { value: 'seize_tip', label: 'Seize Tip' },
  { value: 'external_deposit', label: 'External Deposit' },
  { value: 'external_cashout', label: 'External Cashout' },
  { value: 'void', label: 'Void' },
];

/** Same rail, different API spellings — one dropdown row, one query value. */
const PAYMENT_METHOD_FILTER_VALUE_ALIASES: Record<string, string> = {
  free_play: 'freeplay',
};

function canonicalPaymentMethodFilterValue(slug: string): string {
  const trimmed = slug.trim();
  const k = trimmed.toLowerCase();
  return PAYMENT_METHOD_FILTER_VALUE_ALIASES[k] ?? trimmed;
}

/**
 * Payment rails for history `payment_method` query param — subcategory `payment_method`
 * when subcategories exist (parent is only a UI group, e.g. Card vs Credit and Debit Card),
 * never `provider_payment_method` integrator slugs.
 */
export function buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const providerSlugs = collectProviderSlugSet(data);
  const map = new Map<string, { value: string; label: string }>();

  const addMethod = (raw: string | null | undefined, displayHint: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    const canonical = canonicalPaymentMethodFilterValue(v);
    const key = canonical.toLowerCase();
    if (providerSlugs.has(key)) return;
    const label =
      displayHint?.trim() && displayHint.trim().length > 0
        ? displayHint.trim()
        : formatPaymentMethod(canonical);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { value: canonical, label });
      return;
    }
    if (displayHint?.trim() && displayHint.trim().length > 0) {
      map.set(key, { value: prev.value, label: displayHint.trim() });
    }
  };

  const cashout = data.cashout ?? [];
  if (isNestedCashout(cashout)) {
    for (const parent of cashout) {
      const subs = parent.subcategories ?? [];
      if (subs.length === 0) {
        addMethod(parent.payment_method, parent.payment_method_display);
      }
      for (const sub of subs) {
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
      const subs = parent.subcategories ?? [];
      if (subs.length === 0) {
        addMethod(parent.payment_method, parent.payment_method_display);
      }
      for (const sub of subs) {
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
