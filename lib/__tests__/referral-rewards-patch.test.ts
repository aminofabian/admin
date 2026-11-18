import { describe, expect, it } from 'vitest';
import {
  buildReferralRewardsPatch,
  EMPTY_REFERRAL_REWARDS_FORM,
  referralRewardsFormFromSettings,
  type ReferralRewardsFormState,
} from '../referral-rewards-patch';

function form(overrides: Partial<ReferralRewardsFormState> = {}): ReferralRewardsFormState {
  return { ...EMPTY_REFERRAL_REWARDS_FORM, is_enabled: true, ...overrides };
}

describe('referralRewardsFormFromSettings', () => {
  it('keeps a percentage response and defaults a missing type to percentage', () => {
    expect(
      referralRewardsFormFromSettings({
        is_enabled: true,
        referrer_bonus_percentage: '100.00',
        referrer_bonus_cap: '100.00',
        referred_player_bonus_amount: '10.00',
      }),
    ).toEqual({
      is_enabled: true,
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: '100.00',
      referrer_bonus_fixed_amount: '0',
      referrer_bonus_cap: '100.00',
      referred_player_bonus_amount: '10.00',
    });
  });

  it('loads a fixed-amount response without dropping the stored percentage', () => {
    expect(
      referralRewardsFormFromSettings({
        is_enabled: false,
        referrer_bonus_type: 'fixed',
        referrer_bonus_percentage: '10.00',
        referrer_bonus_fixed_amount: '25.00',
        referrer_bonus_cap: '15.00',
        referred_player_bonus_amount: '5.00',
      }).referrer_bonus_type,
    ).toBe('fixed');
  });
});

describe('buildReferralRewardsPatch', () => {
  it('sends percentage fields and leaves the fixed amount off the body', () => {
    const result = buildReferralRewardsPatch(
      form({
        referrer_bonus_type: 'percentage',
        referrer_bonus_percentage: '10.00',
        referrer_bonus_fixed_amount: '25.00',
        referrer_bonus_cap: '15.00',
        referred_player_bonus_amount: '5.00',
      }),
    );

    expect(result).toEqual({
      ok: true,
      body: {
        is_enabled: true,
        referrer_bonus_type: 'percentage',
        referrer_bonus_percentage: 10,
        referrer_bonus_cap: 15,
        referred_player_bonus_amount: 5,
      },
    });
  });

  it('sends the fixed amount and leaves percentage and cap off the body', () => {
    const result = buildReferralRewardsPatch(
      form({
        referrer_bonus_type: 'fixed',
        referrer_bonus_percentage: '10.00',
        referrer_bonus_fixed_amount: '10.00',
        referrer_bonus_cap: '15.00',
        referred_player_bonus_amount: '5.00',
      }),
    );

    expect(result).toEqual({
      ok: true,
      body: {
        is_enabled: true,
        referrer_bonus_type: 'fixed',
        referrer_bonus_fixed_amount: 10,
        referred_player_bonus_amount: 5,
      },
    });
  });

  it('rejects a percentage outside 0 to 100', () => {
    expect(
      buildReferralRewardsPatch(form({ referrer_bonus_percentage: '101' })),
    ).toEqual({
      ok: false,
      title: 'Referrer bonus must be between 0 and 100%',
    });
  });

  it('rejects a negative fixed amount or signup bonus', () => {
    expect(
      buildReferralRewardsPatch(
        form({ referrer_bonus_type: 'fixed', referrer_bonus_fixed_amount: '-1' }),
      ),
    ).toEqual({ ok: false, title: 'Amounts must be 0 or greater' });

    expect(
      buildReferralRewardsPatch(form({ referred_player_bonus_amount: '-1' })),
    ).toEqual({ ok: false, title: 'Amounts must be 0 or greater' });
  });
});
