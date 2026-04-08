import { describe, expect, it } from 'vitest';
import { getTransactionAmountColorClass, getTransactionTypeBadgeStyle } from '../transaction-display';

describe('transaction-display', () => {
  describe('getTransactionAmountColorClass', () => {
    it('should use green for add regardless of positive amount', () => {
      expect(getTransactionAmountColorClass('add', '5')).toContain('emerald');
      expect(getTransactionAmountColorClass('ADD', '5')).toContain('emerald');
    });

    it('should use green for purchase', () => {
      expect(getTransactionAmountColorClass('purchase', '10')).toContain('emerald');
    });

    it('should use red for deduct regardless of positive amount', () => {
      expect(getTransactionAmountColorClass('deduct', '5')).toContain('rose');
      expect(getTransactionAmountColorClass('DEDUCT', '5')).toContain('rose');
    });

    it('should fall back to amount sign for other types', () => {
      expect(getTransactionAmountColorClass('cashout', '5')).toContain('emerald');
      expect(getTransactionAmountColorClass('cashout', '-3')).toContain('rose');
    });
  });

  describe('getTransactionTypeBadgeStyle', () => {
    it('should mark transfer and use default variant', () => {
      const a = getTransactionTypeBadgeStyle('transfer_in', null);
      expect(a.isTransfer).toBe(true);
      expect(a.variant).toBe('default');
    });

    it('should use success for add and purchase', () => {
      expect(getTransactionTypeBadgeStyle('add', null).variant).toBe('success');
      expect(getTransactionTypeBadgeStyle('purchase', null).variant).toBe('success');
    });

    it('should use danger for deduct', () => {
      expect(getTransactionTypeBadgeStyle('deduct', null).variant).toBe('danger');
    });
  });
});
