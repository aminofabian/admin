import { describe, expect, it } from 'vitest';
import {
  buildPaymentMethodFilterOptionsFromPaymentMethodsRaw,
  buildProviderFilterOptionsFromPaymentMethodsRaw,
} from '../transaction-provider-filter-options';
import type { PaymentMethodsListResponseRaw } from '@/types';

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

  it('still lists paypal as a payment method when API marks it as provider_payment_method', () => {
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
          ],
        },
      ],
      purchase: [],
    };

    const paymentOpts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(paymentOpts.map((o) => o.value.toLowerCase())).toContain('paypal');
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
        } as unknown as PaymentMethod,
      ],
      purchase: [],
    };

    const opts = buildProviderFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.some((o) => o.value === 'taparcadia')).toBe(true);
  });
});

describe('buildPaymentMethodFilterOptionsFromPaymentMethodsRaw', () => {
  it('includes subcategory rails but omits integrator provider_payment_method slugs', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'card',
          payment_method_display: 'Card',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
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

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const values = opts.map((o) => o.value);
    expect(values).not.toContain('card');
    expect(values).toContain('venmo');
    expect(values).not.toContain('binpay');
  });

  it('includes parent payment_method when a category has no subcategories', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'crypto',
          payment_method_display: 'Crypto',
          has_subcategories: true,
          subcategories: [],
        },
      ],
      purchase: [],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value)).toContain('crypto');
  });

  it('drops sub rows where payment_method is the integrator slug', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'payout',
          payment_method_display: 'Payout',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              payment_method: 'tierlock',
              payment_method_display: 'Tierlock',
              provider_payment_method: 'tierlock',
              provider_payment_method_display: 'Tierlock',
            },
          ],
        },
      ],
      purchase: [],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    expect(opts.map((o) => o.value)).not.toContain('tierlock');
  });

  it('keeps provider and payment lists disjoint for nested data', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'zelle',
          payment_method_display: 'Zelle',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              payment_method: 'chime',
              payment_method_display: 'Chime',
              provider_payment_method: 'taparcadia',
              provider_payment_method_display: 'Taparcadia',
            },
          ],
        },
      ],
      purchase: [],
    };

    const payment = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    const providers = buildProviderFilterOptionsFromPaymentMethodsRaw(data).map((o) => o.value.toLowerCase());
    expect(payment).not.toContain('zelle');
    expect(payment).toContain('chime');
    expect(payment).not.toContain('taparcadia');
    expect(providers).toContain('taparcadia');
    expect(providers).not.toContain('chime');
  });

  it('merges free_play into freeplay so Freeplay appears once', () => {
    const data: PaymentMethodsListResponseRaw = {
      cashout: [
        {
          payment_method: 'misc',
          payment_method_display: 'Misc',
          has_subcategories: true,
          subcategories: [
            { id: 1, payment_method: 'free_play', payment_method_display: 'Freeplay' },
          ],
        },
      ],
      purchase: [],
    };

    const opts = buildPaymentMethodFilterOptionsFromPaymentMethodsRaw(data);
    const freeplayRows = opts.filter((o) => o.label === 'Freeplay');
    expect(freeplayRows).toHaveLength(1);
    expect(freeplayRows[0]?.value).toBe('freeplay');
  });
});
