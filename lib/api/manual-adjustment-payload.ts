/**
 * Maps product manual adjustment kinds to the legacy manual-payment API shape.
 * Extra fields (`adjustment_type`, `void_reason`) are forwarded for backends that support them.
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

export interface ManualPaymentRequestBody {
  player_id: number;
  value: number;
  type: 'increase' | 'decrease';
  balanceType: 'main' | 'winning';
  reason: string;
  remarks?: string;
  adjustment_type: ManualAdjustmentKind;
  void_reason?: string;
}

/** Manual-payment API success shape; backend may add limit fields over time. */
export interface ManualPaymentResponse {
  status: string;
  player_bal: number;
  player_winning_bal: number;
  cashout_limit?: number | string;
  locked_balance?: number | string;
}

export function buildManualPaymentRequestBody(
  playerId: number,
  kind: ManualAdjustmentKind,
  value: number,
  options: { remarks?: string; voidReasonCode?: string },
): ManualPaymentRequestBody {
  const remarks = options.remarks?.trim() || undefined;

  switch (kind) {
    case 'freeplay':
      return {
        player_id: playerId,
        value,
        type: 'increase',
        balanceType: 'main',
        reason: 'free_play',
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
    case 'void': {
      const code = options.voidReasonCode?.trim();
      const combinedRemarks =
        remarks && code ? `${code}: ${remarks}` : remarks || code;
      return {
        player_id: playerId,
        value,
        type: 'decrease',
        balanceType: 'winning',
        reason: 'void',
        remarks: combinedRemarks,
        adjustment_type: kind,
        void_reason: code,
      };
    }
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
