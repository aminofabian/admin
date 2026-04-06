/**
 * Admin manual adjustments → manual-payment API.
 *
 * Product rules (server must enforce; client mirrors critical guards):
 *
 * **6.1 Freeplay (add only)** — `type: increase`, `reason: freeplay`, main balance only.
 * Balance ↑ · cashout_limit unchanged · History: Add + method Freeplay · Analytics: Freeplay.
 *
 * **6.2 External deposit (add only)** — `type: increase`, `reason: external_deposit`.
 * Balance ↑ · cashout_limit unchanged · History: Add + method External Deposit ·
 * Analytics: Purchase with method External Deposit.
 *
 * **6.3 External cashout (deduct only)** — `type: decrease`, `reason: external_cashout`.
 * Allowed only if amount ≤ cashout_limit (and ≤ balance client-side). Balance ↓ · cashout_limit ↓ ·
 * History: Deduct + method External Cashout · Analytics: Cashout + External Cashout.
 *
 * **6.4 Void (deduct only)** — `type: decrease`, `reason: void`; optional `remarks` for notes.
 * Balance ↓ · locked-first (locked_balance first; cashout_limit only if locked insufficient) ·
 * History: Deduct + method Void + reason · Analytics: Void.
 */

export const MANUAL_ADJUSTMENT_KINDS = [
  'freeplay',
  'external_deposit',
  'external_cashout',
  'void',
] as const;

export type ManualAdjustmentKind = (typeof MANUAL_ADJUSTMENT_KINDS)[number];

/** Parse API balance/limit strings for client-side checks (e.g. external cashout cap). */
export function parseLedgerAmount(value: string | undefined | null): number | null {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const n = Number.parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export type ExternalCashoutValidation =
  | { ok: true }
  | {
      ok: false;
      reason: 'invalid_amount' | 'limit_unknown' | 'exceeds_limit' | 'exceeds_balance';
    };

/**
 * Client guard for 6.3: amount must be ≤ cashout_limit when limit is known, and ≤ balance when balance is known.
 */
export function validateExternalCashoutAmount(
  amount: number,
  cashoutLimitStr: string | undefined | null,
  balanceStr: string | undefined | null,
): ExternalCashoutValidation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: 'invalid_amount' };
  }
  const limit = parseLedgerAmount(cashoutLimitStr ?? undefined);
  if (limit === null) {
    return { ok: false, reason: 'limit_unknown' };
  }
  if (amount > limit) {
    return { ok: false, reason: 'exceeds_limit' };
  }
  const bal = parseLedgerAmount(balanceStr ?? undefined);
  if (bal !== null && amount > bal) {
    return { ok: false, reason: 'exceeds_balance' };
  }
  return { ok: true };
}

export interface ManualPaymentRequestBody {
  player_id: number;
  value: number;
  type: 'increase' | 'decrease';
  balanceType: 'main' | 'winning';
  reason: string;
  remarks?: string;
  adjustment_type: ManualAdjustmentKind;
}

/** Manual-payment API success shape; backend may add limit fields over time. */
export interface ManualPaymentResponse {
  status: string;
  player_bal: number;
  /** Omitted when the deployment uses a single balance bucket. */
  player_winning_bal?: number | string;
  cashout_limit?: number | string;
  locked_balance?: number | string;
}

export function buildManualPaymentRequestBody(
  playerId: number,
  kind: ManualAdjustmentKind,
  value: number,
  options: { remarks?: string },
): ManualPaymentRequestBody {
  const remarks = options.remarks?.trim() || undefined;

  switch (kind) {
    case 'freeplay':
      return {
        player_id: playerId,
        value,
        type: 'increase',
        balanceType: 'main',
        reason: 'freeplay',
        remarks,
        adjustment_type: kind,
      };
    case 'external_deposit':
      return {
        player_id: playerId,
        value,
        type: 'increase',
        balanceType: 'main',
        reason: 'external_deposit',
        remarks,
        adjustment_type: kind,
      };
    case 'external_cashout':
      return {
        player_id: playerId,
        value,
        type: 'decrease',
        balanceType: 'main',
        reason: 'external_cashout',
        remarks,
        adjustment_type: kind,
      };
    case 'void':
      return {
        player_id: playerId,
        value,
        type: 'decrease',
        balanceType: 'main',
        reason: 'void',
        remarks,
        adjustment_type: kind,
      };
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
