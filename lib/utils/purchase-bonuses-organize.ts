import type { PurchaseBonus } from '@/types';
import { formatPaymentMethod } from '@/lib/utils/formatters';

/** Label for rows that have no `purchase_category_display` from the API. */
export const PURCHASE_BONUS_UNCATEGORIZED_LABEL = 'Other';

export type PurchaseBonusGroup = {
  /** Exactly `purchase_category_display` from the API, or {@link PURCHASE_BONUS_UNCATEGORIZED_LABEL}. */
  category: string;
  items: PurchaseBonus[];
};

/**
 * Section title = API `purchase_category_display` only. No inference from `topup_method`.
 */
export function getPurchaseBonusGroupLabel(bonus: PurchaseBonus): string {
  const display = bonus.purchase_category_display?.trim();
  if (display) return display;
  return PURCHASE_BONUS_UNCATEGORIZED_LABEL;
}

function comparePurchaseBonuses(a: PurchaseBonus, b: PurchaseBonus): number {
  const la = formatPaymentMethod(a.topup_method).toLowerCase();
  const lb = formatPaymentMethod(b.topup_method).toLowerCase();
  if (la !== lb) return la.localeCompare(lb, undefined, { sensitivity: 'base' });
  return a.id - b.id;
}

function compareGroupNames(a: string, b: string): number {
  if (a === PURCHASE_BONUS_UNCATEGORIZED_LABEL && b !== PURCHASE_BONUS_UNCATEGORIZED_LABEL) return 1;
  if (b === PURCHASE_BONUS_UNCATEGORIZED_LABEL && a !== PURCHASE_BONUS_UNCATEGORIZED_LABEL) return -1;
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

/**
 * Groups strictly by `purchase_category_display`; sorts groups A–Z with "Other" last.
 */
export function groupPurchaseBonusesForDisplay(bonuses: PurchaseBonus[]): PurchaseBonusGroup[] {
  const byCategory = new Map<string, PurchaseBonus[]>();
  for (const bonus of bonuses) {
    const key = getPurchaseBonusGroupLabel(bonus);
    const list = byCategory.get(key);
    if (list) list.push(bonus);
    else byCategory.set(key, [bonus]);
  }

  const groups: PurchaseBonusGroup[] = Array.from(byCategory.entries()).map(([category, items]) => ({
    category,
    items: [...items].sort(comparePurchaseBonuses),
  }));

  groups.sort((a, b) => compareGroupNames(a.category, b.category));

  return groups;
}
