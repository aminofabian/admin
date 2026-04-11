import { describe, expect, it } from 'vitest';
import {
  buildPaymentMethodFilterOptionsFromPaymentMethodsRaw,
  buildProviderFilterOptionsFromPaymentMethodsRaw,
  CASHAPP_PAY_PROVIDER_FILTER_VALUE,
  isCreditDebitCardCategoryDisplay,
  normalizePaymentMethodFilterQueryValue,
  PAYMENT_METHOD_CARD_DISPLAY_LABEL,
  PAYMENT_METHOD_CARD_QUERY_VALUE,
  resolveHistoryTransactionProviderFilterForUi,
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
              is_configured: true,
              payment_method: 'visa',
              payment_method_display: 'Visa',
              provider_payment_method: 'binpay',
              provider_payment_method_display: 'Binpay',
            },
            {
              id: 2,
              is_configured: true,
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
              is_configured: true,
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
    expect(opts.map((o) => o.value)).toEqual([
      'banxa',
      'binpay',
      'tierlock',
      'freeplay',
      'external_deposit',
      'external_cashout',
      'void',
      'signup',
    ]);
    expect(opts.find((o) => o.value === 'banxa')?.label).toBe('Banxa');
  });

  it('dedupes case-insensitively and uses canonical provider labels', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'x',
          payment_method_display: 'X',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'a',
              payment_method_display: 'A',
              provider_payment_method: 'BinPay',
              provider_payment_method_display: 'BinPay Display',
            },
            {
              id: 2,
              is_configured: true,
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
    const binpay = opts.filter((o) => o.value.toLowerCase() === 'binpay');
    expect(binpay).toHaveLength(1);
    expect(binpay[0]?.label).toBe('Binpay');
    expect(opts.some((o) => o.value === 'freeplay')).toBe(true);
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
              is_configured: true,
              payment_method: 'paypal',
              payment_method_display: 'PayPal',
              provider_payment_method: 'paypal',
              provider_payment_method_display: 'PayPal',
            },
            {
              id: 2,
              is_configured: true,
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

  it('omits integrators when superadmin has disabled the subcategory', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'banxa',
              payment_method_display: 'Banxa',
              provider_payment_method: 'banxa',
              enabled_for_purchase_by_superadmin: false,
            },
            {
              id: 2,
              is_configured: true,
              payment_method: 'stripe',
              payment_method_display: 'Stripe',
              provider_payment_method: 'stripe',
            },
          ],
        },
      ],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.some((o) => o.value === 'banxa')).toBe(false);
    expect(opts.some((o) => o.value === 'stripe')).toBe(true);
  });

  it('uses composite filter value for Cashapp Pay when bitcoin_lightning is configured', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'crypto',
          payment_method_display: 'Crypto',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'ln',
              payment_method_display: 'Lightning',
              provider_payment_method: 'bitcoin_lightning',
              provider_payment_method_display: 'Bitcoin Lightning',
            },
          ],
        },
      ],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    const cashappPay = opts.find((o) => o.label === 'Cashapp Pay');
    const lightning = opts.find((o) => o.label === 'Bitcoin Lightning');
    expect(cashappPay?.value).toBe(CASHAPP_PAY_PROVIDER_FILTER_VALUE);
    expect(lightning?.value).toBe('bitcoin_lightning');
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

describe('resolveHistoryTransactionProviderFilterForUi', () => {
  it('returns sentinel when provider filter is the Cashapp Pay composite value', () => {
    expect(
      resolveHistoryTransactionProviderFilterForUi(CASHAPP_PAY_PROVIDER_FILTER_VALUE, ''),
    ).toBe(CASHAPP_PAY_PROVIDER_FILTER_VALUE);
  });

  it('maps bitcoin_lightning + cashapp payment method to Cashapp Pay filter value', () => {
    expect(
      resolveHistoryTransactionProviderFilterForUi('bitcoin_lightning', 'cashapp'),
    ).toBe(CASHAPP_PAY_PROVIDER_FILTER_VALUE);
  });

  it('does not map bitcoin_lightning without cashapp payment method', () => {
    expect(resolveHistoryTransactionProviderFilterForUi('bitcoin_lightning', '')).toBe(
      'bitcoin_lightning',
    );
  });
});

describe('isCreditDebitCardCategoryDisplay', () => {
  it('detects long-form card category labels', () => {
    expect(isCreditDebitCardCategoryDisplay('Credit & Debit Card')).toBe(true);
    expect(isCreditDebitCardCategoryDisplay('credit and debit card')).toBe(true);
    expect(isCreditDebitCardCategoryDisplay('Banxa')).toBe(false);
  });
});

describe('normalizePaymentMethodFilterQueryValue', () => {
  it('maps card aliases to card', () => {
    expect(normalizePaymentMethodFilterQueryValue('card')).toBe(PAYMENT_METHOD_CARD_QUERY_VALUE);
    expect(normalizePaymentMethodFilterQueryValue('credit_debit_card')).toBe(PAYMENT_METHOD_CARD_QUERY_VALUE);
    expect(normalizePaymentMethodFilterQueryValue('credit-card')).toBe(PAYMENT_METHOD_CARD_QUERY_VALUE);
  });

  it('leaves other slugs unchanged', () => {
    expect(normalizePaymentMethodFilterQueryValue('venmo')).toBe('venmo');
  });
});

describe('buildPaymentMethodFilterOptionsFromPaymentMethodsRaw', () => {
  it('maps Credit & Debit Card display to query value card and label Card', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'custom_card_parent',
          payment_method_display: 'Credit & Debit Card',
          has_subcategories: true,
          subcategories: [
            { id: 1, is_configured: true, payment_method: 'x', payment_method_display: 'X' },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const row = opts.find((o) => o.value === PAYMENT_METHOD_CARD_QUERY_VALUE);
    expect(row?.label).toBe(PAYMENT_METHOD_CARD_DISPLAY_LABEL);
  });

  it('normalizes card parent slug variants to query value card with Card label', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'credit_debit_card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'stripe',
              payment_method_display: 'Stripe',
            },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const row = opts.find((o) => o.value === PAYMENT_METHOD_CARD_QUERY_VALUE);
    expect(row?.label).toBe(PAYMENT_METHOD_CARD_DISPLAY_LABEL);
  });

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
    const card = opts.find((o) => o.value === PAYMENT_METHOD_CARD_QUERY_VALUE);
    expect(card?.label).toBe(PAYMENT_METHOD_CARD_DISPLAY_LABEL);
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

  it('maps tierlock purchase parent to canonical Tierlock payment-method filter', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [],
      purchase: [
        {
          payment_method: 'tierlock',
          payment_method_display: 'Tierlock',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'tierlock_rail',
              payment_method_display: 'Tierlock Rail',
              provider_payment_method: 'tierlock',
              provider_payment_method_display: 'Tierlock',
            },
          ],
        },
      ],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value)).toContain('tierlock');
    expect(opts.map((o) => o.value)).not.toContain('payout');
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

  it('lists freeplay on provider filter, not payment-method filter, when only cashout has free_play', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'misc',
          payment_method_display: 'Misc',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'free_play',
              payment_method_display: 'Freeplay',
              provider_payment_method: 'freeplay',
            },
          ],
        },
      ],
      purchase: [],
    };

    const paymentOpts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const providerOpts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(paymentOpts.some((o) => o.value === 'manual' && o.label === 'Manual')).toBe(true);
    expect(paymentOpts.some((o) => o.value === 'freeplay')).toBe(false);
    expect(providerOpts.some((o) => o.value === 'freeplay')).toBe(true);
  });

  it('empty API payload yields manual and signup payment options only', () => {
    const data: PaymentMethodsListResponseRaw = { cashout: [], purchase: [] };
    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value).sort()).toEqual(['manual', 'signup'].sort());
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
