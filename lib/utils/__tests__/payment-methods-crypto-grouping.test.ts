import { describe, expect, it } from 'vitest';
import type { PurchasePaymentMethod } from '@/types';
import {
  CRYPTO_UI_BUNDLE_PAYMENT_METHOD,
  mergeStandaloneCryptoPurchaseCategories,
  shouldGroupStandaloneCryptoCategory,
} from '@/lib/utils/payment-methods-category-filters';

const sub = (
  id: number,
  display: string,
  overrides: Partial<PurchasePaymentMethod['subcategories'][0]> = {},
): PurchasePaymentMethod['subcategories'][0] => ({
  id,
  payment_method: display.toLowerCase().replace(/\s+/g, '_'),
  payment_method_display: display,
  is_configured: true,
  is_enabled_for_purchase: true,
  enabled_for_purchase_by_superadmin: true,
  ...overrides,
});

describe('shouldGroupStandaloneCryptoCategory', () => {
  it('returns true for standalone coin category slugs', () => {
    expect(
      shouldGroupStandaloneCryptoCategory({
        payment_method: 'litecoin',
        payment_method_display: 'Litecoin',
      }),
    ).toBe(true);
    expect(
      shouldGroupStandaloneCryptoCategory({
        payment_method: 'bitcoin',
        payment_method_display: 'Bitcoin',
      }),
    ).toBe(true);
    expect(
      shouldGroupStandaloneCryptoCategory({
        payment_method: 'bitcoin_lightning',
        payment_method_display: 'Bitcoin Lightning',
      }),
    ).toBe(true);
  });

  it('returns false for umbrella crypto parent', () => {
    expect(
      shouldGroupStandaloneCryptoCategory({
        payment_method: 'crypto',
        payment_method_display: 'Crypto',
      }),
    ).toBe(false);
  });

  it('returns false for non-crypto categories', () => {
    expect(
      shouldGroupStandaloneCryptoCategory({
        payment_method: 'card',
        payment_method_display: 'Card',
      }),
    ).toBe(false);
  });
});

describe('mergeStandaloneCryptoPurchaseCategories', () => {
  it('returns the same array when at most one standalone crypto category', () => {
    const single: PurchasePaymentMethod[] = [
      {
        payment_method: 'litecoin',
        payment_method_display: 'Litecoin',
        has_subcategories: true,
        subcategories: [sub(1, 'Litecoin')],
      },
    ];
    expect(mergeStandaloneCryptoPurchaseCategories(single)).toBe(single);
  });

  it('merges multiple standalone coin categories into one Crypto parent', () => {
    const input: PurchasePaymentMethod[] = [
      {
        payment_method: 'litecoin',
        payment_method_display: 'Litecoin',
        has_subcategories: true,
        subcategories: [sub(1, 'Litecoin')],
      },
      {
        payment_method: 'bitcoin',
        payment_method_display: 'Bitcoin',
        has_subcategories: true,
        subcategories: [sub(2, 'Bitcoin')],
      },
      {
        payment_method: 'card',
        payment_method_display: 'Card',
        has_subcategories: true,
        subcategories: [sub(3, 'Visa')],
      },
    ];

    const out = mergeStandaloneCryptoPurchaseCategories(input);

    expect(out).toHaveLength(2);
    expect(out[0].payment_method).toBe(CRYPTO_UI_BUNDLE_PAYMENT_METHOD);
    expect(out[0].payment_method_display).toBe('Crypto');
    expect(out[0].subcategories).toHaveLength(2);
    expect(out[0].subcategories?.map((s) => s.id)).toEqual([1, 2]);
    expect(out[1].payment_method).toBe('card');
  });
});
