import { describe, expect, it } from 'vitest';
import {
  buildPaymentMethodFilterOptionsFromPaymentMethodsRaw,
  buildProviderFilterOptionsFromPaymentMethodsRaw,
} from '../transaction-provider-filter-options';
import type { PaymentMethod, PaymentMethodsListResponseRaw } from '@/types';

describe('buildProviderFilterOptionsFromPaymentMethodsRaw', () => {
  it('collects unique provider_payment_method from cashout and purchase subcategories', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              payment_method: 'visa',
              payment_method_display: 'Visa',
              provider_payment_method: 'binpay',
              provider_payment_method_display: 'Binpay',
            },
            {
              id: 2,
              payment_method: 'tierlock_sub',
              payment_method_display: 'Tierlock Sub',
              provider_payment_method: 'tierlock',
              provider_payment_method_display: null,
            },
          ],
        },
      ],
      purchase: [
        {
          payment_method: 'card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 3,
              payment_method: 'banxa',
              payment_method_display: 'Banxa',
              provider_payment_method: 'banxa',
              provider_payment_method_display: 'Banxa Pay',
            },
          ],
        },
      ],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value).sort()).toEqual(['banxa', 'binpay', 'tierlock']);
    expect(opts.find((o) => o.value === 'banxa')?.label).toBe('Banxa Pay');
  });

  it('dedupes case-insensitively and keeps a display name when provided', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'x',
          payment_method_display: 'X',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              payment_method: 'a',
              payment_method_display: 'A',
              provider_payment_method: 'BinPay',
              provider_payment_method_display: 'BinPay Display',
            },
            {
              id: 2,
              payment_method: 'b',
              payment_method_display: 'B',
              provider_payment_method: 'binpay',
              provider_payment_method_display: null,
            },
          ],
        },
      ],
      purchase: [],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts).toHaveLength(1);
    expect(opts[0]?.label).toBe('BinPay Display');
  });

  it('omits paypal from provider filter options', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              payment_method: 'paypal',
              payment_method_display: 'PayPal',
              provider_payment_method: 'paypal',
              provider_payment_method_display: 'PayPal',
            },
            {
              id: 2,
              payment_method: 'venmo',
              payment_method_display: 'Venmo',
              provider_payment_method: 'binpay',
              provider_payment_method_display: 'Binpay',
            },
          ],
        },
      ],
      purchase: [],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value.toLowerCase())).not.toContain('paypal');
    expect(opts.some((o) => o.value.toLowerCase() === 'binpay')).toBe(true);
  });

  it('reads provider_payment_method from flat payment method rows', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          id: 1,
          payment_method: 'taparcadia',
          payment_method_display: 'Tap',
          method_type: 'payout',
          provider_payment_method: 'taparcadia',
          is_enabled_for_cashout: true,
          created: '',
          modified: '',
        } satisfies PaymentMethod,
      ] as unknown as PaymentMethodsListResponseRaw['cashout'],
      purchase: [],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.some((o) => o.value === 'taparcadia')).toBe(true);
  });
});

describe('buildPaymentMethodFilterOptionsFromPaymentMethodsRaw', () => {
  it('uses parent category slug/label like Payment Settings Purchase tab (not sub-rails)', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'card',
          payment_method_display: 'Credit & Debit Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'venmo',
              payment_method_display: 'Venmo',
              provider_payment_method: 'binpay',
              provider_payment_method_display: 'Binpay',
            },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const card = opts.find((o) => o.value === 'card');
    expect(card?.label).toBe('Credit & Debit Card');
    expect(opts.map((o) => o.value)).not.toContain('venmo');
    expect(opts.map((o) => o.value)).not.toContain('binpay');
  });

  it('omits categories with no configured subcategories', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'crypto',
          payment_method_display: 'Crypto',
          has_subcategories: true,
          subcategories: [],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value)).not.toContain('crypto');
  });

  it('lists parent category even when sub payment_method matches provider slug', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'payout',
          payment_method_display: 'Payout',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'tierlock',
              payment_method_display: 'Tierlock',
              provider_payment_method: 'tierlock',
              provider_payment_method_display: 'Tierlock',
            },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value)).toContain('payout');
    expect(opts.map((o) => o.value)).not.toContain('tierlock');
  });

  it('keeps provider slugs on provider list only for nested data', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'zelle',
          payment_method_display: 'Zelle',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'chime',
              payment_method_display: 'Chime',
              provider_payment_method: 'taparcadia',
              provider_payment_method_display: 'Taparcadia',
            },
          ],
        },
      ],
    };

    const payment = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    const providers = buildProviderFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    expect(payment).toContain('zelle');
    expect(payment).not.toContain('chime');
    expect(payment).not.toContain('taparcadia');
    expect(providers).toContain('taparcadia');
    expect(providers).not.toContain('chime');
  });

  it('ignores cashout-only categories; purchase order preserved', () => {
    const data: PaymentMethodsListResponseRaw = {
      purchase: [
        {
          payment_method: 'apple_pay',
          payment_method_display: 'Apple Pay',
          has_subcategories: true,
          subcategories: [
            { id: 1, is_configured: true, payment_method: 'ap1', payment_method_display: 'Ap1' },
          ],
        },
      ],
      cashout: [
        {
          payment_method: 'venmo',
          payment_method_display: 'Venmo',
          has_subcategories: true,
          subcategories: [
            { id: 2, is_configured: true, payment_method: 'v1', payment_method_display: 'V1' },
          ],
        },
        {
          payment_method: 'apple_pay',
          payment_method_display: 'Apple Pay Cashout',
          has_subcategories: true,
          subcategories: [
            { id: 3, is_configured: true, payment_method: 'ap2', payment_method_display: 'Ap2' },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const values = opts.map((o) => o.value);
    expect(values[0]).toBe('apple_pay');
    expect(values).not.toContain('venmo');
    expect(opts.find((o) => o.value === 'apple_pay')?.label).toBe('Apple Pay');
    expect(values).toContain('manual');
  });

  it('appends manual adjustment rails after purchase categories', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'misc',
          payment_method_display: 'Misc',
          has_subcategories: true,
          subcategories: [
            { id: 1, is_configured: true, payment_method: 'free_play', payment_method_display: 'Freeplay' },
          ],
        },
      ],
      purchase: [],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.some((o) => o.value === 'manual' && o.label === 'Manual')).toBe(true);
    expect(opts.some((o) => o.value === 'freeplay')).toBe(true);
  });

  it('empty API payload yields manual adjustment options only', () => {
    const data: PaymentMethodsListResponseRaw = { cashout: [], purchase: [] };
    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(
      opts.every((o) =>
        ['freeplay', 'manual', 'seize_tip', 'external_deposit', 'external_cashout', 'void'].includes(o.value),
      ),
    ).toBe(true);
  });

  it('parent paypal category on payment list; provider list still omits paypal integrator slug', () => {
    const data: PaymentMethodsListResponseRaw = {
      purchase: [
        {
          payment_method: 'paypal',
          payment_method_display: 'Paypal',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'paypal_wallet',
              payment_method_display: 'PayPal',
              provider_payment_method: 'paypal',
              provider_payment_method_display: 'PayPal',
            },
          ],
        },
      ],
      cashout: [],
    };

    const payment = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    const providers = buildProviderFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    expect(payment).toContain('paypal');
    expect(providers).not.toContain('paypal');
  });
});
