import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayerReferralOverrideSection } from '../player-referral-override-section';

const { addToast, fetchForPlayer, saveForPlayer, override } = vi.hoisted(() => ({
  addToast: vi.fn(),
  fetchForPlayer: vi.fn(),
  saveForPlayer: vi.fn().mockResolvedValue({}),
  override: {
    id: 1,
    player: 67,
    player_username: 'testme7',
    referrer_bonus_type: 'percentage' as const,
    referrer_bonus_percentage: '5.00',
    referrer_bonus_fixed_amount: '0.00',
    referred_player_bonus_amount: '2.00',
  },
}));

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return { ...actual, useToast: () => ({ addToast }) };
});

vi.mock('@/stores', () => ({
  useReferralPlayerOverrideStore: () => ({
    byPlayerId: {
      67: { override, isLoading: false, isSaving: false, error: null },
    },
    fetchForPlayer,
    saveForPlayer,
  }),
}));

describe('PlayerReferralOverrideSection', () => {
  beforeEach(() => {
    addToast.mockClear();
    saveForPlayer.mockClear();
  });

  it('saves a fixed referrer bonus without the percentage', async () => {
    const user = userEvent.setup();
    render(<PlayerReferralOverrideSection playerId={67} playerUsername="testme7" canEdit />);

    expect(screen.getByRole('radio', { name: 'Percentage' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByLabelText('Referrer bonus percentage (%)')).toHaveValue('5.00');

    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    const bonus = screen.getByLabelText('Referrer bonus ($)');
    await user.clear(bonus);
    await user.type(bonus, '10');
    await user.click(screen.getByRole('button', { name: 'Save override' }));

    expect(saveForPlayer).toHaveBeenCalledWith({
      player: 67,
      referrer_bonus_type: 'fixed',
      referrer_bonus_fixed_amount: 10,
      referred_player_bonus_amount: 2,
    });
  });

  it('saves the percentage after switching back', async () => {
    const user = userEvent.setup();
    render(<PlayerReferralOverrideSection playerId={67} playerUsername="testme7" canEdit />);

    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    await user.click(screen.getByRole('button', { name: 'Save override' }));

    expect(saveForPlayer).toHaveBeenCalledWith({
      player: 67,
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: 5,
      referred_player_bonus_amount: 2,
    });
  });
});
