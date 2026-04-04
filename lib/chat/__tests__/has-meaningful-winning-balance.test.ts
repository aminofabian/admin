import { describe, expect, it } from 'vitest';
import { hasMeaningfulWinningBalance } from '../map-chat-api';

describe('hasMeaningfulWinningBalance', () => {
  it('is false for zero as number or string', () => {
    expect(hasMeaningfulWinningBalance(0)).toBe(false);
    expect(hasMeaningfulWinningBalance('0')).toBe(false);
    expect(hasMeaningfulWinningBalance('0.00')).toBe(false);
  });

  it('is false for undefined/null', () => {
    expect(hasMeaningfulWinningBalance(undefined)).toBe(false);
    expect(hasMeaningfulWinningBalance(null)).toBe(false);
  });

  it('is true for positive amounts', () => {
    expect(hasMeaningfulWinningBalance(9)).toBe(true);
    expect(hasMeaningfulWinningBalance('9.00')).toBe(true);
  });
});
