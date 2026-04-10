import type {
  CashoutPaymentMethod,
  CashoutSubcategory,
  PurchasePaymentMethod,
  PurchaseSubcategory,
} from '@/types';

/** Synthetic parent row: collapsible "Crypto" bundle in admin payment settings UI */
export const CRYPTO_UI_BUNDLE_PAYMENT_METHOD = '__ui_crypto_bundle__';

function normalizeCategoryKey(s: string | undefined): string {
  return (s ?? '').toLowerCase().replace(/[\s_-]+/g, '');
}

/**
 * True when the API exposes this coin as its own top-level category (Litecoin, Bitcoin, Lightning, …).
 * Umbrella rows named only "Crypto" / "Cryptocurrency" are left alone so we do not double-nest.
 */
export function shouldGroupStandaloneCryptoCategory(parent: {
  payment_method: string;
  payment_method_display: string;
}): boolean {
  const key = normalizeCategoryKey(parent.payment_method);
  if (key === 'crypto' || key === 'cryptocurrency') return false;

  const display = normalizeCategoryKey(parent.payment_method_display);

  if (/^litecoin$|^ltc$/.test(key) || /^litecoin$|^ltc$/.test(display)) return true;
  if (/^bitcoin$|^btc$/.test(key) || /^bitcoin$|^btc$/.test(display)) return true;
  if (/^lightning$|^ln$|^lnbtc$/.test(key) || /^lightning$|^ln$/.test(display)) return true;
  if (/^bitcoinlightning$/.test(key) || /^bitcoinlightning$/.test(display)) return true;
  if (display.includes('bitcoin') && display.includes('lightning')) return true;

  return false;
}

/** Merge standalone coin categories (BTC, LTC, Lightning, …) into one collapsible "Crypto" parent. */
export function mergeStandaloneCryptoPurchaseCategories(
  categories: PurchasePaymentMethod[],
): PurchasePaymentMethod[] {
  const cryptoCats = categories.filter(shouldGroupStandaloneCryptoCategory);
  if (cryptoCats.length <= 1) return categories;

  const mergedSubs: PurchaseSubcategory[] = cryptoCats.flatMap((cat) =>
    (cat.subcategories ?? []).filter((s) => s.is_configured === true && s.id != null),
  );

  const synthetic: PurchasePaymentMethod = {
    payment_method: CRYPTO_UI_BUNDLE_PAYMENT_METHOD,
    payment_method_display: 'Crypto',
    enabled_for_purchase_by_superadmin: cryptoCats.some((c) =>
      isPurchaseAllowedBySuperadmin(c.enabled_for_purchase_by_superadmin),
    ),
    has_subcategories: true,
    subcategories: mergedSubs,
  };

  const result: PurchasePaymentMethod[] = [];
  let inserted = false;
  for (const c of categories) {
    if (!shouldGroupStandaloneCryptoCategory(c)) {
      result.push(c);
      continue;
    }
    if (!inserted) {
      result.push(synthetic);
      inserted = true;
    }
  }
  return result;
}

export function mergeStandaloneCryptoCashoutCategories(
  categories: CashoutPaymentMethod[],
): CashoutPaymentMethod[] {
  const cryptoCats = categories.filter(shouldGroupStandaloneCryptoCategory);
  if (cryptoCats.length <= 1) return categories;

  const mergedSubs: CashoutSubcategory[] = cryptoCats.flatMap((cat) =>
    (cat.subcategories ?? []).filter((s) => s.is_configured === true && s.id != null),
  );

  const synthetic: CashoutPaymentMethod = {
    payment_method: CRYPTO_UI_BUNDLE_PAYMENT_METHOD,
    payment_method_display: 'Crypto',
    enabled_for_cashout_by_superadmin: cryptoCats.some((c) =>
      isCashoutAllowedBySuperadmin(c.enabled_for_cashout_by_superadmin),
    ),
    has_subcategories: true,
    subcategories: mergedSubs,
  };

  const result: CashoutPaymentMethod[] = [];
  let inserted = false;
  for (const c of categories) {
    if (!shouldGroupStandaloneCryptoCategory(c)) {
      result.push(c);
      continue;
    }
    if (!inserted) {
      result.push(synthetic);
      inserted = true;
    }
  }
  return result;
}

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
