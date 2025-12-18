import type { PaymentMethod, PaymentMethodAction } from '@/types';
import { validatePaymentAmounts } from '../payment-amount-modal';

const buildMethod = (overrides: Partial<PaymentMethod> = {}): PaymentMethod => ({
  id: 1,
  payment_method: 'test',
  payment_method_display: 'Test Method',
  method_type: 'test',
  is_enabled_for_cashout: true,
  is_enabled_for_purchase: true,
  enabled_for_cashout_by_superadmin: true,
  enabled_for_purchase_by_superadmin: true,
  min_amount_cashout: null,
  max_amount_cashout: null,
  min_amount_purchase: null,
  max_amount_purchase: null,
  superadmin_min_amount_cashout: null,
  superadmin_max_amount_cashout: null,
  superadmin_min_amount_purchase: null,
  superadmin_max_amount_purchase: null,
  created: '',
  modified: '',
  ...overrides,
});

const validate = (
  scope: 'admin' | 'superadmin',
  action: PaymentMethodAction,
  paymentMethod: PaymentMethod | null,
  minAmount: string,
  maxAmount: string,
) =>
  validatePaymentAmounts({
    scope,
    action,
    paymentMethod,
    minAmount,
    maxAmount,
  });

describe('validatePaymentAmounts', () => {
  it('allows empty values when no limits are set', () => {
    const method = buildMethod();
    const errors = validate('admin', 'cashout', method, '', '');
    expect(errors).toEqual({});
  });

  it('rejects admin min below superadmin minimum', () => {
    const method = buildMethod({ superadmin_min_amount_cashout: '2.00' });
    const errors = validate('admin', 'cashout', method, '1.00', '');
    expect(errors.minAmount).toBeDefined();
  });

  it('rejects admin max above superadmin maximum', () => {
    const method = buildMethod({ superadmin_max_amount_purchase: '100.00' });
    const errors = validate('admin', 'purchase', method, '', '150.00');
    expect(errors.maxAmount).toBeDefined();
  });

  it('accepts admin values within superadmin range', () => {
    const method = buildMethod({
      superadmin_min_amount_cashout: '2.00',
      superadmin_max_amount_cashout: '100.00',
    });
    const errors = validate('admin', 'cashout', method, '10.00', '50.00');
    expect(errors).toEqual({});
  });

  it('does not enforce superadmin limits for superadmin scope', () => {
    const method = buildMethod({
      superadmin_min_amount_purchase: '2.00',
      superadmin_max_amount_purchase: '100.00',
    });
    const errors = validate('superadmin', 'purchase', method, '0.50', '500.00');
    // Still applies basic min/max validation but not superadmin range
    expect(errors.minAmount).toBeUndefined();
    expect(errors.maxAmount).toBeUndefined();
  });
});

