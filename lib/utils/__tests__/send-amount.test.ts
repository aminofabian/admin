import { describe, expect, it } from 'vitest';
import {
  MAX_SEND_AMOUNT_RATIO,
  MIN_SEND_AMOUNT_RATIO,
  formatSendAmountForPayload,
  formatSendAmountInput,
  getSendAmountBounds,
  validateSendAmountInput,
} from '../send-amount';

describe('getSendAmountBounds', () => {
  it('matches the 10% to 110% payout window', () => {
    expect(MIN_SEND_AMOUNT_RATIO).toBe(0.1);
    expect(MAX_SEND_AMOUNT_RATIO).toBe(1.1);
  });

  it('uses 10% and 110% of a whole-dollar cashout', () => {
    expect(getSendAmountBounds(100)).toEqual({ min: 10, max: 110 });
    expect(getSendAmountBounds('97.50')).toEqual({ min: 9.75, max: 107.25 });
  });

  it('rounds fractional cents inward so displayed bounds stay inside the range', () => {
    expect(getSendAmountBounds('10.04')).toEqual({ min: 1.01, max: 11.04 });
  });

  it('returns null when the cashout amount is missing', () => {
    expect(getSendAmountBounds('')).toBeNull();
    expect(getSendAmountBounds(0)).toBeNull();
  });
});

describe('validateSendAmountInput', () => {
  it('accepts the cashout amount and the inclusive bounds', () => {
    expect(validateSendAmountInput('97.50', '97.50')).toEqual({ ok: true, amount: 97.5 });
    expect(validateSendAmountInput('10.00', 100)).toEqual({ ok: true, amount: 10 });
    expect(validateSendAmountInput('110', 100)).toEqual({ ok: true, amount: 110 });
  });

  it('rejects amounts outside 10% to 110%', () => {
    expect(validateSendAmountInput('9.99', 100).ok).toBe(false);
    expect(validateSendAmountInput('110.01', 100).ok).toBe(false);
  });

  it('rejects values that are not a currency amount', () => {
    expect(validateSendAmountInput('', 100).ok).toBe(false);
    expect(validateSendAmountInput('97.555', 100).ok).toBe(false);
    expect(validateSendAmountInput('-5', 100).ok).toBe(false);
  });
});

describe('formatSendAmountInput', () => {
  it('prefills the cashout amount with two decimals', () => {
    expect(formatSendAmountInput('97.5')).toBe('97.50');
    expect(formatSendAmountForPayload(97.5)).toBe('97.50');
  });
});
