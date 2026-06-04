import { describe, expect, it } from 'vitest';
import {
  formatPlayerTimelineDetailLabel,
  formatRouletteSpinQuantityLine,
  formatRouletteTimelineTypeLabel,
  mapPlayerTimelineResult,
  resolvePlayerTimelineAmountDisplay,
  resolvePlayerTimelineBalanceDisplay,
} from '../player-timeline';

describe('player-timeline roulette entries', () => {
  it('maps roulette_spins from API payload', () => {
    const item = mapPlayerTimelineResult({
      id: '71',
      type: 'add',
      status: 'completed',
      provider: 'roulette',
      amount: '0',
      game: 'Roulette 71',
      reason: 'roulette_respin',
      reason_display: 'roulette_respin',
      roulette_spins: {
        entry_type: 'reward_add',
        quantity: 1,
        previous_balance: 0,
        new_balance: 1,
        reward_type: 'respin',
        position: 2,
      },
      created_at: '2026-06-04T19:44:09Z',
    });

    expect(item.roulette_spins?.reward_type).toBe('respin');
    expect(item.roulette_spins?.quantity).toBe(1);
  });

  it('shows respin line instead of $0.00 for spin-only rewards', () => {
    const item = mapPlayerTimelineResult({
      id: '71',
      type: 'add',
      provider: 'roulette',
      amount: '0',
      roulette_spins: {
        entry_type: 'reward_add',
        quantity: 1,
        reward_type: 'respin',
      },
      created_at: '2026-06-04T19:44:09Z',
    });

    const amount = resolvePlayerTimelineAmountDisplay(item);
    expect(amount.primaryText).toBe('+1 respin');
    expect(amount.showAsCurrency).toBe(false);
  });

  it('shows spin balance transition when no cash movement', () => {
    const item = mapPlayerTimelineResult({
      id: '71',
      type: 'add',
      provider: 'roulette',
      amount: '0',
      previous_balance: '0',
      new_balance: '0',
      roulette_spins: {
        previous_balance: 0,
        new_balance: 1,
        quantity: 1,
        reward_type: 'respin',
      },
      created_at: '2026-06-04T19:44:09Z',
    });

    const balance = resolvePlayerTimelineBalanceDisplay(item);
    expect(balance?.displayText).toBe('0 → 1 spins');
  });

  it('prefers cash balance when prize includes money', () => {
    const item = mapPlayerTimelineResult({
      id: '68',
      type: 'add',
      provider: 'roulette',
      amount: '0',
      bonus_amount: '5',
      previous_balance: '503.45',
      new_balance: '508.45',
      roulette_spins: {
        reward_type: 'main_balance',
        quantity: 5,
      },
      created_at: '2026-06-04T19:43:10Z',
    });

    const balance = resolvePlayerTimelineBalanceDisplay(item);
    expect(balance?.displayText).toContain('$503.45');
    expect(balance?.displayText).toContain('$508.45');
  });

  it('labels admin spin adjustments', () => {
    const item = mapPlayerTimelineResult({
      id: '80',
      type: 'add',
      provider: 'roulette',
      amount: '0',
      reason: 'spin_balance_add',
      roulette_spins: {
        entry_type: 'reward_add',
        quantity: 3,
        previous_balance: 1,
        new_balance: 4,
      },
      created_at: '2026-06-04T20:00:00Z',
    });

    expect(formatRouletteTimelineTypeLabel(item)).toBe('Spins added');
    expect(formatRouletteSpinQuantityLine(item.roulette_spins!, 'add')).toBe('+3 spins');
  });

  it('uses prize wheel label instead of internal roulette ids', () => {
    const item = mapPlayerTimelineResult({
      id: '71',
      type: 'add',
      provider: 'roulette',
      game: 'Roulette 71',
      unique_id: '71',
      roulette_spins: { reward_type: 'respin', position: 2 },
      created_at: '2026-06-04T19:44:09Z',
    });

    expect(formatPlayerTimelineDetailLabel(item)).toBe('Prize wheel · Slot 2');
  });

  it('labels spin usage as deduct', () => {
    const item = mapPlayerTimelineResult({
      id: '75',
      type: 'deduct',
      provider: 'roulette',
      amount: '0',
      game: 'Roulette 75',
      roulette_spins: {
        entry_type: 'spin_use',
        quantity: 1,
        previous_balance: 2,
        new_balance: 1,
      },
      created_at: '2026-06-04T19:44:09Z',
    });

    expect(formatRouletteTimelineTypeLabel(item)).toBe('Spin used');
    expect(resolvePlayerTimelineAmountDisplay(item).primaryText).toBe('−1 spin');
    expect(formatPlayerTimelineDetailLabel(item)).toBe('Prize wheel');
  });
});
