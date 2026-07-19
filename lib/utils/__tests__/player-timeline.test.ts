import { describe, expect, it } from 'vitest';
import {
  formatPlayerTimelineDetailLabel,
  formatRouletteSpinQuantityLine,
  formatRouletteTimelineTypeLabel,
  formatVerificationTimelineTypeLabel,
  mapPlayerTimelineResult,
  resolvePlayerTimelineAmountDisplay,
  resolvePlayerTimelineBalanceDisplay,
  resolveVerificationTimelineOutcome,
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

  it('shows provider in details instead of payment method for card purchases', () => {
    const item = mapPlayerTimelineResult({
      id: '71',
      type: 'purchase',
      status: 'completed',
      payment_method: 'card',
      payment_details: {
        provider: 'binpay',
        payment_method: 'card',
        purchase_category: 'card',
      },
      created_at: '2026-06-01T17:42:08Z',
    });

    expect(item.provider).toBe('binpay');
    expect(formatPlayerTimelineDetailLabel(item)).toBe('Binpay');
  });

  it('falls back to payment method when provider is missing', () => {
    const item = mapPlayerTimelineResult({
      id: '72',
      type: 'purchase',
      status: 'completed',
      payment_method: 'chime',
      created_at: '2026-06-01T17:42:08Z',
    });

    expect(formatPlayerTimelineDetailLabel(item)).toBe('Chime');
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

  it('maps try again rewards from roulette_reward timeline rows', () => {
    const item = mapPlayerTimelineResult({
      id: '76',
      type: 'reward',
      status: 'completed',
      amount: '0.00',
      reason: 'roulette_try_again',
      reason_display: 'roulette_try_again',
      timeline_source: 'roulette_reward',
      description: 'Roulette reward - Try Again',
      roulette: {
        position: 5,
        prize: 'Try Again',
        prize_type: 'Try Again',
      },
      roulette_reward: {
        reward_type: 'try_again',
        prize: 'Try Again',
        prize_type: 'Try Again',
        amount: '0.00',
        spin: 'True',
      },
      created_at: '2026-06-23T23:13:56Z',
    });

    expect(item.provider).toBe('roulette');
    expect(item.roulette_spins?.reward_type).toBe('try_again');
    expect(item.roulette_spins?.position).toBe(5);
    expect(formatRouletteTimelineTypeLabel(item)).toBe('Try again');

    const amount = resolvePlayerTimelineAmountDisplay(item);
    expect(amount.primaryText).toBe('Try again');
    expect(amount.showAsCurrency).toBe(false);
    expect(formatPlayerTimelineDetailLabel(item)).toBe('Prize wheel · Slot 5');
  });
});

describe('player-timeline verification entries', () => {
  it('maps binpay identity approval as a verification row', () => {
    const item = mapPlayerTimelineResult({
      id: 1714,
      payment_method: 'verification',
      amount: '0.00',
      bonus_amount: '0.00',
      status: 'completed',
      type: 'verification',
      description: 'BinpayYour identity verification',
      reason: 'binpay_kyc_approved',
      reason_display: 'Binpay',
      provider: 'Binpay',
      verification: {
        event: 'binpay_kyc_approved',
        title: 'Binpay',
        identity_verification_status: 'approved',
      },
      payload: {
        event: 'binpay_kyc_approved',
        title: 'Binpay',
        identity_verification_status: 'approved',
      },
      created_at: '2026-07-10T10:29:29Z',
    });

    expect(item.kind).toBe('verification');
    expect(formatVerificationTimelineTypeLabel(item)).toBe('Identity approved');
    expect(resolveVerificationTimelineOutcome(item)).toBe('approved');
    expect(formatPlayerTimelineDetailLabel(item)).toBe('Binpay');

    const amount = resolvePlayerTimelineAmountDisplay(item);
    expect(amount.primaryText).toBe('Approved');
    expect(amount.showAsCurrency).toBe(false);
  });

  it('maps binpay identity rejection', () => {
    const item = mapPlayerTimelineResult({
      id: 1715,
      payment_method: 'verification',
      amount: '0.00',
      status: 'completed',
      type: 'verification',
      reason: 'binpay_kyc_rejected',
      reason_display: 'Binpay',
      provider: 'Binpay',
      verification: {
        event: 'binpay_kyc_rejected',
        identity_verification_status: 'rejected',
      },
      created_at: '2026-07-10T11:00:00Z',
    });

    expect(item.kind).toBe('verification');
    expect(formatVerificationTimelineTypeLabel(item)).toBe('Identity rejected');
    expect(resolveVerificationTimelineOutcome(item)).toBe('rejected');
    expect(resolvePlayerTimelineAmountDisplay(item).primaryText).toBe('Rejected');
  });
});
