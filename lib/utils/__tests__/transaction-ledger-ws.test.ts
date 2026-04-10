import { describe, expect, it } from 'vitest';
import {
  ledgerBalancesAreDuplicateSnapshot,
  patchGameActivityMergedDataCreditsFromWs,
  resolveCreditLedgerBalancesFromWsPayload,
  shouldPreserveGameActivityCreditsWhenMerging,
  shouldPreserveLedgerBalancesWhenMerging,
} from '../transaction-ledger-ws';

describe('resolveCreditLedgerBalancesFromWsPayload', () => {
  it('uses balance as new when new_balance duplicates previous', () => {
    const raw = { previous_balance: '60', new_balance: '60', balance: '50' };
    const result = resolveCreditLedgerBalancesFromWsPayload(raw, null);
    expect(result).toEqual({ previous_balance: '60', new_balance: '50' });
  });

  it('reads nested data alternate keys', () => {
    const raw = { data: { balance_before: '70', balance_after: '60' } };
    const nested = raw.data as Record<string, unknown>;
    const result = resolveCreditLedgerBalancesFromWsPayload(raw, nested);
    expect(result).toEqual({ previous_balance: '70', new_balance: '60' });
  });

  it('defaults missing fields to 0', () => {
    const result = resolveCreditLedgerBalancesFromWsPayload({}, null);
    expect(result).toEqual({ previous_balance: '0', new_balance: '0' });
  });
});

describe('shouldPreserveLedgerBalancesWhenMerging', () => {
  it('returns true when incoming is flat but existing had a transition', () => {
    expect(
      shouldPreserveLedgerBalancesWhenMerging(
        { previous_balance: '70', new_balance: '60' },
        { previous_balance: '60', new_balance: '60' },
      ),
    ).toBe(true);
  });

  it('returns false when incoming carries a real transition', () => {
    expect(
      shouldPreserveLedgerBalancesWhenMerging(
        { previous_balance: '70', new_balance: '60' },
        { previous_balance: '70', new_balance: '55' },
      ),
    ).toBe(false);
  });
});

describe('ledgerBalancesAreDuplicateSnapshot', () => {
  it('treats numerically equal strings as duplicate', () => {
    expect(ledgerBalancesAreDuplicateSnapshot('60', '60.00')).toBe(true);
  });
});

describe('shouldPreserveGameActivityCreditsWhenMerging', () => {
  it('returns true when REST credits transitioned and WS sends duplicate credits', () => {
    expect(
      shouldPreserveGameActivityCreditsWhenMerging(
        { previous_credits_balance: 70, new_credits_balance: 60 },
        { previous_credits_balance: 60, new_credits_balance: 60 },
      ),
    ).toBe(true);
  });
});

describe('patchGameActivityMergedDataCreditsFromWs', () => {
  it('sets new_credits_balance from balance when credits snapshot is duplicate', () => {
    const merged = {
      previous_credits_balance: 60,
      new_credits_balance: 60,
      balance: 50,
    };
    patchGameActivityMergedDataCreditsFromWs(merged);
    expect(merged.new_credits_balance).toBe(50);
  });
});
