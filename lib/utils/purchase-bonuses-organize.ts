import type { PurchaseBonus } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';

function comparePurchaseBonuses(a: PurchaseBonus, b: PurchaseBonus): number {
  const la = formatPaymentMethod(a.topup_method).toLowerCase();
  const lb = formatPaymentMethod(b.topup_method).toLowerCase();
  if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: 'base' });
  return a.id - b.id;
}

/** Stable sort for purchase bonus lists (flat tables / widgets). */
export function sortPurchaseBonusesForDisplay(bonuses: PurchaseBonus[]): PurchaseBonus[] {
  return [...bonuses].sort(comparePurchaseBonuses);
}
