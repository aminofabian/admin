import type { Transaction } from '@/types';

const PREVIOUS_BALANCE_KEYS = [
  'previous_balance',
  'previousBalance',
  'balance_before',
  'previous_credits_balance',
  'old_balance',
] as const;

const NEW_BALANCE_KEYS = [
  'new_balance',
  'newBalance',
  'balance_after',
  'new_credits_balance',
  'current_balance',
  'updated_balance',
] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function pickBalanceField(
  raw: Record<string, unknown>,
  nested: Record<string, unknown> | null,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const top = raw[key];
    if (top !== undefined && top !== null && top !== '') {
      return String(top);
    }
    if (nested) {
      const inner = nested[key];
      if (inner !== undefined && inner !== null && inner !== '') {
        return String(inner);
      }
    }
  }
  return undefined;
}

/**
 * Normalize credit ledger fields from WebSocket / nested `data` shapes.
 * Some backends send only `balance` for the post-txn value or use alternate keys.
 */
export function resolveCreditLedgerBalancesFromWsPayload(
  rawUnknown: unknown,
  nestedUnknown: unknown,
): { previous_balance: string; new_balance: string } {
  const raw = asRecord(rawUnknown) ?? {};
  const nested = asRecord(nestedUnknown);

  const previous_balance = pickBalanceField(raw, nested, PREVIOUS_BALANCE_KEYS) ?? '0';
  let new_balance = pickBalanceField(raw, nested, NEW_BALANCE_KEYS);

  if (new_balance === undefined || new_balance === previous_balance) {
    const balanceOnly = pickBalanceField(raw, nested, ['balance']);
    if (balanceOnly !== undefined && balanceOnly !== previous_balance) {
      new_balance = balanceOnly;
    }
  }

  return {
    previous_balance,
    new_balance: new_balance ?? '0',
  };
}

export function ledgerBalancesAreDuplicateSnapshot(prev: string, next: string): boolean {
  const a = Number.parseFloat(String(prev).trim());
  const b = Number.parseFloat(String(next).trim());
  if (Number.isFinite(a) && Number.isFinite(b)) {
    return Math.abs(a - b) < 1e-9;
  }
  return String(prev).trim() === String(next).trim();
}

/**
 * When REST already had a real before→after pair and the WebSocket patch repeats the same
 * "after" value for both fields, keep the REST ledger so the UI does not show A → A.
 */
export function shouldPreserveLedgerBalancesWhenMerging(
  existing: Pick<Transaction, 'previous_balance' | 'new_balance'>,
  incoming: Pick<Transaction, 'previous_balance' | 'new_balance'>,
): boolean {
  const incomingFlat = ledgerBalancesAreDuplicateSnapshot(
    incoming.previous_balance,
    incoming.new_balance,
  );
  const existingHadTransition = !ledgerBalancesAreDuplicateSnapshot(
    existing.previous_balance,
    existing.new_balance,
  );
  return incomingFlat && existingHadTransition;
}

/** Map game-activity `data` (credits + legacy balance keys) to strings for merge / preserve checks. */
export function creditsLedgerStringsFromActivityData(
  data: Record<string, unknown> | null | undefined,
): Pick<Transaction, 'previous_balance' | 'new_balance'> {
  if (!data) {
    return { previous_balance: '0', new_balance: '0' };
  }
  const prev = data.previous_credits_balance ?? data.previous_balance;
  const next = data.new_credits_balance ?? data.new_balance;
  return {
    previous_balance: prev === undefined || prev === null ? '0' : String(prev),
    new_balance: next === undefined || next === null ? '0' : String(next),
  };
}

export function shouldPreserveGameActivityCreditsWhenMerging(
  existingData: Record<string, unknown> | null | undefined,
  incomingData: Record<string, unknown> | null | undefined,
): boolean {
  return shouldPreserveLedgerBalancesWhenMerging(
    creditsLedgerStringsFromActivityData(existingData),
    creditsLedgerStringsFromActivityData(incomingData),
  );
}

/**
 * When game activity `data` shows the same credits before/after, re-resolve from alternate WS keys
 * (same as purchases/cashouts) and write canonical `previous_credits_balance` / `new_credits_balance`.
 */
export function patchGameActivityMergedDataCreditsFromWs(mergedData: Record<string, unknown>): void {
  const prevRaw = mergedData.previous_credits_balance ?? mergedData.previous_balance;
  const nextRaw = mergedData.new_credits_balance ?? mergedData.new_balance;
  const prevStr = prevRaw === undefined || prevRaw === null ? '' : String(prevRaw);
  const nextStr = nextRaw === undefined || nextRaw === null ? '' : String(nextRaw);

  if (!ledgerBalancesAreDuplicateSnapshot(prevStr, nextStr)) {
    return;
  }

  const { previous_balance, new_balance } = resolveCreditLedgerBalancesFromWsPayload(mergedData, null);
  const pn = Number.parseFloat(previous_balance);
  const nn = Number.parseFloat(new_balance);
  if (Number.isFinite(pn)) mergedData.previous_credits_balance = pn;
  if (Number.isFinite(nn)) mergedData.new_credits_balance = nn;
}
