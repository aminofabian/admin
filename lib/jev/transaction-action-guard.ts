import { isJevConfigured, toolGuard, type JevPresetResult } from './client';

export type TransactionActionType =
  | 'cancel'
  | 'complete'
  | 'send_to_binpay'
  | 'send_to_tierlock'
  | 'send_to_taparcadia'
  | 'send_to_btcpay'
  | 'send_to_payapi';

export type JevGateOutcome =
  | { kind: 'skip'; reason: 'not_configured' | 'error' }
  | { kind: 'allow'; result: JevPresetResult }
  | { kind: 'deny'; result: JevPresetResult }
  | { kind: 'needs_confirmation'; result: JevPresetResult };

const ACTION_META: Record<
  TransactionActionType,
  { label: string; sideEffects: string[]; reversibility: string }
> = {
  cancel: {
    label: 'Cancel a pending transaction',
    sideEffects: ['Marks the transaction cancelled', 'May release reserved funds'],
    reversibility: 'partially_reversible',
  },
  complete: {
    label: 'Mark a transaction complete',
    sideEffects: ['Finalizes funds movement', 'Updates player / ledger state'],
    reversibility: 'difficult',
  },
  send_to_binpay: {
    label: 'Send cashout to BinPay',
    sideEffects: ['Initiates external payout', 'Moves real money'],
    reversibility: 'difficult',
  },
  send_to_tierlock: {
    label: 'Send cashout to Tierlock',
    sideEffects: ['Initiates external payout', 'Moves real money'],
    reversibility: 'difficult',
  },
  send_to_taparcadia: {
    label: 'Send cashout to Taparcadia',
    sideEffects: ['Initiates external payout', 'Moves real money'],
    reversibility: 'difficult',
  },
  send_to_btcpay: {
    label: 'Send cashout to BTCPay',
    sideEffects: ['Initiates external crypto payout', 'Moves real money'],
    reversibility: 'difficult',
  },
  send_to_payapi: {
    label: 'Send cashout to PayAPI',
    sideEffects: ['Initiates external payout', 'Moves real money'],
    reversibility: 'difficult',
  },
};

function isActionType(value: string): value is TransactionActionType {
  return value in ACTION_META;
}

/**
 * Ask Jev whether this transaction-action should proceed.
 * Probabilities are signals only — not authorization.
 * When JEV_API_KEY is unset, skips quietly so local/dev keeps working.
 */
export async function guardTransactionAction(input: {
  txnId: string;
  type: string;
  alreadyConfirmed: boolean;
}): Promise<JevGateOutcome> {
  if (!isJevConfigured()) {
    return { kind: 'skip', reason: 'not_configured' };
  }

  if (!isActionType(input.type)) {
    return { kind: 'skip', reason: 'error' };
  }

  const meta = ACTION_META[input.type];

  try {
    const result = await toolGuard({
      tool: 'transaction_action',
      action: `${meta.label} (txn_id=${input.txnId}, type=${input.type})`,
      arguments_summary: [`txn_id=${input.txnId}`, `type=${input.type}`],
      side_effects: meta.sideEffects,
      safeguards: [
        'Admin JWT required',
        'Existing UI confirmation for pending purchase/cashout complete/cancel',
      ],
      policy: [
        'Jev decisions are advisory signals',
        'deny blocks; confirm/review require explicit operator confirmation',
        'Irreversible payouts should not auto-proceed on low confidence',
      ],
      reversibility: meta.reversibility,
    });

    const decision = (result.decision || '').toLowerCase();

    if (decision === 'deny') {
      return { kind: 'deny', result };
    }

    if (
      (decision === 'confirm' || decision === 'review') &&
      !input.alreadyConfirmed
    ) {
      return { kind: 'needs_confirmation', result };
    }

    return { kind: 'allow', result };
  } catch (error) {
    // Fail open on Jev outages so admins are not stuck; log without secrets.
    console.warn(
      'Jev toolGuard unavailable; proceeding without gate:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return { kind: 'skip', reason: 'error' };
  }
}
