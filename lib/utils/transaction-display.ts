const AMOUNT_GREEN = 'text-emerald-600 dark:text-emerald-400';
const AMOUNT_RED = 'text-rose-600 dark:text-rose-400';

export function getTransactionAmountColorClass(
  type: string | undefined | null,
  amount: string | number | undefined | null,
): string {
  const t = (type || '').toLowerCase();
  if (t === 'add' || t === 'purchase') return AMOUNT_GREEN;
  if (t === 'deduct') return AMOUNT_RED;
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
