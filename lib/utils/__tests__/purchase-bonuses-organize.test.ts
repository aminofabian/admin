import { describe, expect, it } from 'vitest';
import { sortPurchaseBonusesForDisplay } from '../purchase-bonuses-organize';
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
  describe('sortPurchaseBonusesForDisplay', () => {
    it('should sort by formatted top-up method then id', () => {
      const sorted = sortPurchaseBonusesForDisplay([
        bonus({ id: 2, topup_method: 'stripe' }),
        bonus({ id: 1, topup_method: 'banxa' }),
      ]);
      expect(sorted.map((b) => b.id)).toEqual([1, 2]);
    });

    it('should use id as tiebreaker when topup labels match', () => {
      const sorted = sortPurchaseBonusesForDisplay([
        bonus({ id: 5, topup_method: 'bitcoin' }),
        bonus({ id: 3, topup_method: 'bitcoin' }),
      ]);
      expect(sorted.map((b) => b.id)).toEqual([3, 5]);
    });
  });
});
