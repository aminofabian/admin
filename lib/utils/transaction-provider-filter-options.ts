import type {
  CashoutPaymentMethod,
  PaymentMethod,
  PaymentMethodsListResponseRaw,
  PurchasePaymentMethod,
} from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';
import {
  filterCashoutCategoriesLikeSettings,
  filterPurchaseCategoriesLikeSettings,
  isCashoutAllowedBySuperadmin,
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

function normKey(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase().replace(/-/g, '_');
}

/** Sort dropdown options A–Z by visible label (stable tie-break on value). */
function sortFilterOptionsByLabel<T extends { label: string; value: string }>(options: T[]): T[] {
  return [...options].sort((a, b) => {
    const byLabel = a.label.localeCompare(b.label, undefined, { sensitivity: 'base', numeric: true });
    if (byLabel !== 0) return byLabel;
    return a.value.localeCompare(b.value, undefined, { sensitivity: 'base', numeric: true });
  });
}

/**
 * Omitted from the provider dropdown and not treated as an integrator slug when splitting
 * payment-method vs provider filters (e.g. PayPal is a rail, not Binpay/Tierlock-style provider).
 */
const PROVIDER_FILTER_EXCLUDED_SLUGS = new Set(['paypal']);

/**
 * Internal provider-filter value for history API: same integrator slug as Bitcoin Lightning
 * (`bitcoin_lightning`) but scoped to Cash App topups. The store expands this to
 * `provider=bitcoin_lightning&payment_method=cashapp` on fetch.
 */
export const CASHAPP_PAY_PROVIDER_FILTER_VALUE = '__cashapp_pay__';

/** API/query param for the card rail (matches backend). */
export const PAYMENT_METHOD_CARD_QUERY_VALUE = 'card';

/** UI label for the card rail in transaction filters (query value remains `card`). */
export const PAYMENT_METHOD_CARD_DISPLAY_LABEL = 'Card';

const CRYPTO_PAYMENT_METHOD_KEYS = new Set([
  'crypto',
  'cryptocurrency',
  'bitcoin',
  'btc',
  'litecoin',
  'ltc',
  'lightning',
  'ln',
  'lnbtc',
  'bitcoin_lightning',
]);

/**
 * Canonical payment-method filter: known query values and labels; options appear only when
 * superadmin-enabled purchase parents match (plus always-on ledger rails: Manual, Signup).
 * Returned options are sorted alphabetically by label.
 */
const PAYMENT_METHOD_CANONICAL: Array<{
  queryValue: string;
  label: string;
  matchKeys: string[];
  alwaysVisible?: boolean;
}> = [
  { queryValue: 'crypto', label: 'Crypto', matchKeys: ['crypto'] },
  { queryValue: 'card', label: 'Card', matchKeys: ['card'] },
  { queryValue: 'cashapp', label: 'Cashapp', matchKeys: ['cashapp', 'cash_app'] },
  { queryValue: 'apple_pay', label: 'Apple Pay', matchKeys: ['apple_pay', 'applepay'] },
  { queryValue: 'google_pay', label: 'Google Pay', matchKeys: ['google_pay', 'googlepay'] },
  { queryValue: 'paypal', label: 'Paypal', matchKeys: ['paypal'] },
  { queryValue: 'venmo', label: 'Venmo', matchKeys: ['venmo'] },
  { queryValue: 'chime', label: 'Chime', matchKeys: ['chime'] },
  { queryValue: 'zelle', label: 'Zelle', matchKeys: ['zelle'] },
  { queryValue: 'tierlock', label: 'Tierlock', matchKeys: ['tierlock'] },
  { queryValue: 'manual', label: 'Manual', matchKeys: ['manual'], alwaysVisible: true },
  { queryValue: 'signup', label: 'Signup', matchKeys: ['signup'], alwaysVisible: true },
];

/**
 * Canonical provider filter rows (labels / match keys). Shown when an enabled subcategory exposes the
 * integrator (superadmin + configured) or when the row is a ledger/synthetic provider (always available).
 * Returned options are sorted alphabetically by label.
 */
const PROVIDER_CANONICAL: Array<{
  label: string;
  matchKeys: string[];
  alwaysVisible?: boolean;
  /** When set, this row's filter value is fixed (not the API slug from settings). */
  fixedFilterValue?: string;
}> = [
  { label: 'Banxa', matchKeys: ['banxa'] },
  { label: 'Bitcoin', matchKeys: ['bitcoin'] },
  { label: 'Litecoin', matchKeys: ['litecoin'] },
  { label: 'Bitcoin Lightning', matchKeys: ['bitcoin_lightning'] },
  { label: 'Stripe', matchKeys: ['stripe'] },
  { label: 'Robinhood', matchKeys: ['robinhood'] },
  { label: 'Binpay', matchKeys: ['binpay'] },
  { label: 'Tierlock', matchKeys: ['tierlock'] },
  { label: 'Cashapp', matchKeys: ['cashapp', 'cash_app'] },
  {
    label: 'Cashapp Pay',
    matchKeys: ['bitcoin_lightning', 'cashapp_pay', 'cashapppay'],
    fixedFilterValue: CASHAPP_PAY_PROVIDER_FILTER_VALUE,
  },
  { label: 'Topper', matchKeys: ['topper'] },
  { label: 'Moonpay', matchKeys: ['moonpay'] },
  { label: 'Tap', matchKeys: ['tap', 'taparcadia'] },
  { label: 'Freeplay', matchKeys: ['freeplay', 'free_play'], alwaysVisible: true },
  { label: 'External Deposit', matchKeys: ['external_deposit'], alwaysVisible: true },
  { label: 'External Cashout', matchKeys: ['external_cashout'], alwaysVisible: true },
  { label: 'Void', matchKeys: ['void'], alwaysVisible: true },
  { label: 'Signup', matchKeys: ['signup'], alwaysVisible: true },
];

function rollupCryptoPaymentMethodKeys(keys: Set<string>): void {
  const has = [...keys].some((k) => CRYPTO_PAYMENT_METHOD_KEYS.has(k));
  if (!has) return;
  for (const k of [...keys]) {
    if (CRYPTO_PAYMENT_METHOD_KEYS.has(k)) keys.delete(k);
  }
  keys.add('crypto');
}

/**
 * Map card-style parent slugs to the query value the API expects (`card`).
 */
/**
 * Provider dropdown value for history filters: maps API-style `bitcoin_lightning` + `cashapp`
 * payment method to the composite Cashapp Pay option.
 */
export function resolveHistoryTransactionProviderFilterForUi(
  rawProvider: string | null | undefined,
  rawPaymentMethod: string | null | undefined,
): string {
  const p = normKey(rawProvider);
  if (String(rawProvider ?? '').trim() === CASHAPP_PAY_PROVIDER_FILTER_VALUE) {
    return CASHAPP_PAY_PROVIDER_FILTER_VALUE;
  }
  const pm = normKey(normalizePaymentMethodFilterQueryValue(rawPaymentMethod ?? ''));
  if (p === 'bitcoin_lightning' && pm === 'cashapp') {
    return CASHAPP_PAY_PROVIDER_FILTER_VALUE;
  }
  return String(rawProvider ?? '').trim();
}

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

function collectPurchaseParentPaymentMethodRows(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const rows: Array<{ value: string; label: string }> = [];
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
    const key = normKey(queryValue);
    if (seen.has(key)) return;
    seen.add(key);
    const label = isCardRail
      ? PAYMENT_METHOD_CARD_DISPLAY_LABEL
      : formatPaymentMethod(display?.trim() ? display.trim() : queryValue);
    rows.push({ value: queryValue, label });
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

  return rows;
}

function enabledPaymentMethodKeysFromParents(
  data: PaymentMethodsListResponseRaw,
): Set<string> {
  const parents = collectPurchaseParentPaymentMethodRows(data);
  const keys = new Set<string>();
  for (const row of parents) {
    keys.add(normKey(row.value));
  }
  rollupCryptoPaymentMethodKeys(keys);
  return keys;
}

/**
 * Purchase-tab parent categories (Payment Settings → Purchase), superadmin-enabled only, then
 * sorted A–Z by label. Manual / Signup are always listed for ledger history filters.
 */
export function buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const enabledKeys = enabledPaymentMethodKeysFromParents(data);
  const result: Array<{ value: string; label: string }> = [];

  for (const row of PAYMENT_METHOD_CANONICAL) {
    const visible =
      row.alwaysVisible === true || row.matchKeys.some((k) => enabledKeys.has(normKey(k)));
    if (visible) {
      result.push({ value: row.queryValue, label: row.label });
    }
  }

  return sortFilterOptionsByLabel(result);
}

function collectRawProviderMap(
  data: PaymentMethodsListResponseRaw,
): Map<string, { value: string; label: string }> {
  const map = new Map<string, { value: string; label: string }>();

  const add = (raw: string | null | undefined, displayHint: string | null | undefined) => {
    const v = raw?.trim();
    if (!v) return;
    const key = normKey(v);
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
    const filtered = filterCashoutCategoriesLikeSettings(cashout);
    for (const parent of filtered) {
      for (const sub of parent.subcategories ?? []) {
        if (sub.is_configured !== true || sub.id == null) continue;
        add(sub.provider_payment_method, sub.provider_payment_method_display);
      }
    }
  } else {
    for (const m of cashout as PaymentMethod[]) {
      if (!isCashoutAllowedBySuperadmin(m.enabled_for_cashout_by_superadmin)) continue;
      add(m.provider_payment_method, m.payment_method_display);
    }
  }

  const purchase = data.purchase ?? [];
  if (isNestedPurchase(purchase)) {
    const filtered = filterPurchaseCategoriesLikeSettings(purchase);
    for (const parent of filtered) {
      for (const sub of parent.subcategories ?? []) {
        if (sub.is_configured !== true || sub.id == null) continue;
        add(sub.provider_payment_method, sub.provider_payment_method_display);
      }
    }
  } else {
    for (const m of purchase as PaymentMethod[]) {
      if (!isPurchaseAllowedBySuperadmin(m.enabled_for_purchase_by_superadmin)) continue;
      add(m.provider_payment_method, m.payment_method_display);
    }
  }

  return map;
}

/**
 * Provider slugs for transaction history `provider` query param: superadmin-enabled integrators from
 * payment settings plus ledger providers always available; sorted A–Z by label.
 */
export function buildProviderFilterOptionsFromPaymentMethodsRaw(
  data: PaymentMethodsListResponseRaw,
): Array<{ value: string; label: string }> {
  const rawMap = collectRawProviderMap(data);
  const result: Array<{ value: string; label: string }> = [];

  for (const row of PROVIDER_CANONICAL) {
    const fromApi = row.matchKeys.map((k) => rawMap.get(normKey(k))).find(Boolean);
    const visible = row.alwaysVisible === true || fromApi != null;
    if (!visible) continue;

    const value =
      row.fixedFilterValue ?? fromApi?.value ?? row.matchKeys[0].replace(/-/g, '_');

    result.push({ value, label: row.label });
  }

  return sortFilterOptionsByLabel(result);
}
