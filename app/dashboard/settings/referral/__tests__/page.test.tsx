import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReferralSettingsPage from '../page';

const { addToast, fetchReferralSettings, patchReferralSettings, referralSettings } = vi.hoisted(
  () => ({
    addToast: vi.fn(),
    fetchReferralSettings: vi.fn(),
    patchReferralSettings: vi.fn().mockResolvedValue({}),
    referralSettings: {
      id: 2,
      is_enabled: true,
      referrer_bonus_type: 'percentage' as const,
      referrer_bonus_percentage: '10.00',
      referrer_bonus_fixed_amount: '25.00',
      referrer_bonus_cap: '15.00',
      referred_player_bonus_amount: '5.00',
      created: '2026-07-27T13:56:19.679066Z',
      modified: '2026-07-27T14:43:37.967901Z',
    },
  }),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'company', username: 'admin' },
    isLoading: false,
  }),
}));

vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return { ...actual, useToast: () => ({ addToast }) };
});

vi.mock('@/stores', () => ({
  useReferralSettingsStore: () => ({
    referralSettings,
    isLoading: false,
    error: null,
    fetchReferralSettings,
    patchReferralSettings,
  }),
}));

vi.mock('@/components/dashboard/settings/referral-promo-codes-section', () => ({
  ReferralPromoCodesSection: () => null,
}));

describe('ReferralSettingsPage', () => {
  beforeEach(() => {
    addToast.mockClear();
    patchReferralSettings.mockClear();
  });

  it('saves a fixed amount without sending the percentage fields', async () => {
    const user = userEvent.setup();
    render(<ReferralSettingsPage />);

    expect(screen.getByRole('radio', { name: 'Percentage' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByLabelText('Bonus')).toHaveValue('10.00');
    expect(screen.getByLabelText('Cap')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));

    expect(screen.queryByLabelText('Cap')).not.toBeInTheDocument();
    expect(screen.getByText('Flat amount per referral')).toBeInTheDocument();

    const bonus = screen.getByLabelText('Bonus');
    expect(bonus).toHaveValue('25.00');
    await user.clear(bonus);
    await user.type(bonus, '10');
    await user.click(screen.getByRole('button', { name: 'Save rewards' }));

    expect(patchReferralSettings).toHaveBeenCalledWith({
      is_enabled: true,
      referrer_bonus_type: 'fixed',
      referrer_bonus_fixed_amount: 10,
      referred_player_bonus_amount: 5,
    });
  });

  it('saves percentage and cap after switching back', async () => {
    const user = userEvent.setup();
    render(<ReferralSettingsPage />);

    await user.click(screen.getByRole('radio', { name: 'Fixed amount' }));
    await user.click(screen.getByRole('radio', { name: 'Percentage' }));
    await user.click(screen.getByRole('button', { name: 'Save rewards' }));

    expect(patchReferralSettings).toHaveBeenCalledWith({
      is_enabled: true,
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: 10,
      referrer_bonus_cap: 15,
      referred_player_bonus_amount: 5,
    });
    expect(screen.getByLabelText('Cap')).toHaveValue('15.00');
  });
});
