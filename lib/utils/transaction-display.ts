const AMOUNT_GREEN = 'text-emerald-600 dark:text-emerald-400';
const AMOUNT_RED = 'text-rose-600 dark:text-rose-400';

/**
 * History / list payloads may expose the row kind as `type` and/or `txn_type`.
 * Prefer `type` when present; otherwise use `txn_type`. Normalized to lowercase.
 */
export function getTransactionKind(transaction: {
  type?: string | null;
  txn_type?: string | null;
}): string {
  const primary = String(transaction.type ?? '').trim();
  if (primary !== '') return primary.toLowerCase();
  return String(transaction.txn_type ?? '').trim().toLowerCase();
}

export function getTransactionAmountColorClass(
  type: string | undefined | null,
  amount: string | number | undefined | null,
): string {
  const t = (type || '').toLowerCase();
  if (t === 'add' || t === 'purchase') return AMOUNT_GREEN;
  if (t === 'deduct' || t === 'cashout') return AMOUNT_RED;
  const amountValue = parseFloat(String(amount ?? 0));
  return amountValue >= 0 ? AMOUNT_GREEN : AMOUNT_RED;
}

export function getTransactionTypeBadgeStyle(
  type: string | undefined | null,
  paymentMethod: string | undefined | null,
): { variant: 'success' | 'danger' | 'default'; isTransfer: boolean } {
  const t = (type || '').toLowerCase();
  const method = (paymentMethod || '').toLowerCase();
  const isTransfer = t.includes('transfer') || method.includes('transfer');
  if (isTransfer) return { variant: 'default', isTransfer: true };
  if (t === 'add' || t === 'purchase') return { variant: 'success', isTransfer: false };
  if (t === 'deduct') return { variant: 'danger', isTransfer: false };
  return { variant: 'danger', isTransfer: false };
}
