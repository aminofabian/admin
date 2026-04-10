import { describe, expect, it } from 'vitest';
import {
  groupPurchaseBonusesForDisplay,
  getPurchaseBonusGroupLabel,
  PURCHASE_BONUS_UNCATEGORIZED_LABEL,
} from '../purchase-bonuses-organize';
import type { PurchaseBonus } from '@/types';

function bonus(partial: Partial<PurchaseBonus> & Pick<PurchaseBonus, 'id' | 'topup_method'>): PurchaseBonus {
  return {
    user: 0,
    bonus_type: 'percentage',
    bonus: 0,
    ...partial,
  } as PurchaseBonus;
}

describe('purchase-bonuses-organize', () => {
  describe('getPurchaseBonusGroupLabel', () => {
    it('should use purchase_category_display verbatim when set', () => {
      expect(
        getPurchaseBonusGroupLabel(
          bonus({
            id: 1,
            topup_method: 'paypal',
            purchase_category_display: 'PayPal',
          }),
        ),
      ).toBe('PayPal');
    });

    it('should not infer category from topup_method when display is missing', () => {
      expect(
        getPurchaseBonusGroupLabel(
          bonus({
            id: 1,
            topup_method: 'paypal',
          }),
        ),
      ).toBe(PURCHASE_BONUS_UNCATEGORIZED_LABEL);
    });
  });

  describe('groupPurchaseBonusesForDisplay', () => {
    it('should group rows that share the same purchase_category_display', () => {
      const groups = groupPurchaseBonusesForDisplay([
        bonus({
          id: 2,
          topup_method: 'stripe',
          purchase_category_display: 'Credit Debit Card',
        }),
        bonus({
          id: 1,
          topup_method: 'banxa',
          purchase_category_display: 'Credit Debit Card',
        }),
      ]);
      expect(groups).toHaveLength(1);
      expect(groups[0].category).toBe('Credit Debit Card');
      expect(groups[0].items.map((b) => b.id)).toEqual([1, 2]);
    });

    it('should use API display strings only for separate groups', () => {
      const groups = groupPurchaseBonusesForDisplay([
        bonus({
          id: 1,
          topup_method: 'bitcoin-lightning',
          purchase_category: 'cashapp',
          purchase_category_display: 'Cashapp Pay',
        }),
        bonus({
          id: 2,
          topup_method: 'cashapp',
          purchase_category: 'cashapp',
          purchase_category_display: 'Cash App',
        }),
      ]);
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.category).sort()).toEqual(['Cash App', 'Cashapp Pay']);
    });

    it('should sort groups alphabetically and put Other last', () => {
      const groups = groupPurchaseBonusesForDisplay([
        bonus({ id: 1, topup_method: 'venmo', purchase_category_display: 'Venmo' }),
        bonus({ id: 2, topup_method: 'bitcoin', purchase_category_display: 'Crypto' }),
        bonus({ id: 3, topup_method: 'unknown_rail' }),
      ]);
      expect(groups.map((g) => g.category)).toEqual(['Crypto', 'Venmo', PURCHASE_BONUS_UNCATEGORIZED_LABEL]);
    });
  });
});
