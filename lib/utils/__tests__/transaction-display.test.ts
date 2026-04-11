import { describe, expect, it } from 'vitest';
import {
  getTransactionAmountColorClass,
  getTransactionKind,
  getTransactionTypeBadgeStyle,
} from '../transaction-display';

describe('transaction-display', () => {
  describe('getTransactionKind', () => {
    it('uses txn_type when type is missing', () => {
      expect(getTransactionKind({ type: '', txn_type: 'add' })).toBe('add');
    });

    it('prefers type when both are set', () => {
      expect(getTransactionKind({ type: 'deduct', txn_type: 'purchase' })).toBe('deduct');
    });

    it('normalizes casing on type', () => {
      expect(getTransactionKind({ type: 'ADD', txn_type: undefined })).toBe('add');
    });
  });

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

    it('should use red for cashout regardless of amount sign', () => {
      expect(getTransactionAmountColorClass('cashout', '5')).toContain('rose');
      expect(getTransactionAmountColorClass('CASHOUT', '5')).toContain('rose');
      expect(getTransactionAmountColorClass('cashout', '-3')).toContain('rose');
    });

    it('should fall back to amount sign for other types', () => {
      expect(getTransactionAmountColorClass('unknown', '5')).toContain('emerald');
      expect(getTransactionAmountColorClass('unknown', '-3')).toContain('rose');
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
