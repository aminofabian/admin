import { describe, expect, it } from 'vitest';
import {
  buildReferralPlayerOverridePatch,
  EMPTY_REFERRAL_OVERRIDE_FORM,
  referralOverrideFormFromRecord,
  type ReferralOverrideFormState,
} from '../referral-player-override-patch';

const PLAYER_ID = 67;

function form(overrides: Partial<ReferralOverrideFormState> = {}): ReferralOverrideFormState {
  return { ...EMPTY_REFERRAL_OVERRIDE_FORM, ...overrides };
}

describe('referralOverrideFormFromRecord', () => {
  it('loads the percentage override from the player response', () => {
    expect(
      referralOverrideFormFromRecord({
        referrer_bonus_type: 'percentage',
        referrer_bonus_percentage: '5.00',
        referrer_bonus_fixed_amount: '0.00',
        referred_player_bonus_amount: '2.00',
      }),
    ).toEqual({
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: '5.00',
      referrer_bonus_fixed_amount: '0.00',
      referred_player_bonus_amount: '2.00',
    });
  });

  it('defaults a missing type to percentage', () => {
    expect(
      referralOverrideFormFromRecord({
        referrer_bonus_percentage: '5.00',
        referred_player_bonus_amount: '2.00',
      }).referrer_bonus_type,
    ).toBe('percentage');
  });
});

describe('buildReferralPlayerOverridePatch', () => {
  it('sends the percentage and leaves the fixed amount off the body', () => {
    expect(
      buildReferralPlayerOverridePatch(
        PLAYER_ID,
        form({
          referrer_bonus_type: 'percentage',
          referrer_bonus_percentage: '5.00',
          referrer_bonus_fixed_amount: '10.00',
          referred_player_bonus_amount: '2.00',
        }),
      ),
    ).toEqual({
      ok: true,
      body: {
        player: PLAYER_ID,
        referrer_bonus_type: 'percentage',
        referrer_bonus_percentage: 5,
        referred_player_bonus_amount: 2,
      },
    });
  });

  it('sends the fixed amount and leaves the percentage off the body', () => {
    expect(
      buildReferralPlayerOverridePatch(
        PLAYER_ID,
        form({
          referrer_bonus_type: 'fixed',
          referrer_bonus_percentage: '5.00',
          referrer_bonus_fixed_amount: '10.00',
          referred_player_bonus_amount: '2.00',
        }),
      ),
    ).toEqual({
      ok: true,
      body: {
        player: PLAYER_ID,
        referrer_bonus_type: 'fixed',
        referrer_bonus_fixed_amount: 10,
        referred_player_bonus_amount: 2,
      },
    });
  });

  it('rejects a blank amount instead of saving it as zero', () => {
    expect(
      buildReferralPlayerOverridePatch(
        PLAYER_ID,
        form({ referrer_bonus_type: 'fixed', referrer_bonus_fixed_amount: '' }),
      ),
    ).toEqual({ ok: false, title: 'Amounts must be 0 or greater' });
  });

  it('rejects a percentage outside 0 to 100 and a negative fixed amount', () => {
    expect(
      buildReferralPlayerOverridePatch(PLAYER_ID, form({ referrer_bonus_percentage: '101' })),
    ).toEqual({
      ok: false,
      title: 'Referrer bonus percentage must be between 0 and 100',
    });

    expect(
      buildReferralPlayerOverridePatch(
        PLAYER_ID,
        form({ referrer_bonus_type: 'fixed', referrer_bonus_fixed_amount: '-1' }),
      ),
    ).toEqual({ ok: false, title: 'Amounts must be 0 or greater' });
  });
});
