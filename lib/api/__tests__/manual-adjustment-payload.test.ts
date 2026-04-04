import {
  buildManualPaymentRequestBody,
  parseLedgerAmount,
  type ManualAdjustmentKind,
} from '../manual-adjustment-payload';

describe('parseLedgerAmount', () => {
  it('should parse numeric strings', () => {
    expect(parseLedgerAmount('100.50')).toBe(100.5);
    expect(parseLedgerAmount('1,234.5')).toBe(1234.5);
  });

  it('should return null for empty or invalid', () => {
    expect(parseLedgerAmount('')).toBeNull();
    expect(parseLedgerAmount(undefined)).toBeNull();
    expect(parseLedgerAmount('x')).toBeNull();
  });
});

describe('buildManualPaymentRequestBody', () => {
  it('should map freeplay to increase main with backend reason key freeplay', () => {
    const body = buildManualPaymentRequestBody(1, 'freeplay', 10, { remarks: ' promo ' });
    expect(body).toEqual({
      player_id: 1,
      value: 10,
      type: 'increase',
      balanceType: 'main',
      reason: 'freeplay',
      remarks: 'promo',
      adjustment_type: 'freeplay',
    });
  });

  it('should map external_deposit to increase main external_deposit', () => {
    const body = buildManualPaymentRequestBody(2, 'external_deposit', 25, {});
    expect(body.type).toBe('increase');
    expect(body.balanceType).toBe('main');
    expect(body.reason).toBe('external_deposit');
    expect(body.adjustment_type).toBe('external_deposit');
  });

  it('should map external_cashout to decrease main external_cashout', () => {
    const body = buildManualPaymentRequestBody(3, 'external_cashout', 5, { remarks: 'paid cash' });
    expect(body.type).toBe('decrease');
    expect(body.balanceType).toBe('main');
    expect(body.reason).toBe('external_cashout');
  });

  it('should map void to decrease main with void_reason', () => {
    const body = buildManualPaymentRequestBody(4, 'void', 15, {
      voidReasonCode: 'fraud',
      remarks: 'details',
    });
    expect(body.type).toBe('decrease');
    expect(body.balanceType).toBe('main');
    expect(body.reason).toBe('void');
    expect(body.void_reason).toBe('fraud');
    expect(body.remarks).toBe('fraud: details');
  });

  it('should cover every ManualAdjustmentKind', () => {
    const kinds: ManualAdjustmentKind[] = [
      'freeplay',
      'external_deposit',
      'external_cashout',
      'void',
    ];
    for (const k of kinds) {
      const body = buildManualPaymentRequestBody(1, k, 1, { voidReasonCode: 'rule_breaking' });
      expect(body.adjustment_type).toBe(k);
      expect(body.player_id).toBe(1);
      expect(body.value).toBe(1);
    }
  });
});
