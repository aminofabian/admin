import { describe, expect, it } from 'vitest';
import type { ChatUser } from '@/types';
import { mergeWinningBalanceFromDirectoryRow } from '../merge-player-ledger-display';

const baseUser = (overrides: Partial<ChatUser> = {}): ChatUser => ({
  id: 'u1',
  user_id: 1,
  username: 'player1',
  email: 'p@example.com',
  isOnline: true,
  balance: '100.00',
  ...overrides,
});

describe('mergeWinningBalanceFromDirectoryRow', () => {
  it('returns selected when no matching row in directory', () => {
    const selected = baseUser({ winningBalance: '9.00' });
    const merged = mergeWinningBalanceFromDirectoryRow(selected, []);
    expect(merged).toBe(selected);
  });

  it('clears stale winnings when directory row omits winningBalance', () => {
    const selected = baseUser({ winningBalance: '9.00' });
    const list: ChatUser[] = [baseUser({ user_id: 1 })];
    const merged = mergeWinningBalanceFromDirectoryRow(selected, list);
    expect(merged.winningBalance).toBeUndefined();
    expect(merged.balance).toBe('100.00');
  });

  it('uses directory winnings when present', () => {
    const selected = baseUser({ winningBalance: '9.00' });
    const list: ChatUser[] = [baseUser({ user_id: 1, winningBalance: '5.00' })];
    const merged = mergeWinningBalanceFromDirectoryRow(selected, list);
    expect(merged.winningBalance).toBe('5.00');
  });

  it('returns same reference when values already match', () => {
    const selected = baseUser({ winningBalance: '2.00' });
    const list: ChatUser[] = [baseUser({ user_id: 1, winningBalance: '2.00' })];
    const merged = mergeWinningBalanceFromDirectoryRow(selected, list);
    expect(merged).toBe(selected);
  });

  it('fills cashoutLimit from directory when selected omits it', () => {
    const selected = baseUser();
    const list: ChatUser[] = [baseUser({ user_id: 1, cashoutLimit: '25.00' })];
    const merged = mergeWinningBalanceFromDirectoryRow(selected, list);
    expect(merged.cashoutLimit).toBe('25.00');
  });

  it('fills lockedBalance from directory when selected omits it', () => {
    const selected = baseUser();
    const list: ChatUser[] = [baseUser({ user_id: 1, lockedBalance: '5.00' })];
    const merged = mergeWinningBalanceFromDirectoryRow(selected, list);
    expect(merged.lockedBalance).toBe('5.00');
  });
});
