import type { BonusType } from '@/types/bonus';
import type { SaveReferralPlayerOverrideRequest } from '@/types/settings';

const DEFAULT_AMOUNT = '0';
const MIN_REFERRAL_AMOUNT = 0;
const MAX_REFERRER_BONUS_PERCENTAGE = 100;
const PERCENTAGE_RANGE_ERROR = 'Referrer bonus percentage must be between 0 and 100';
const AMOUNT_ERROR = 'Amounts must be 0 or greater';

export interface ReferralOverrideFormState {
  referrer_bonus_type: BonusType;
  referrer_bonus_percentage: string;
  referrer_bonus_fixed_amount: string;
  referred_player_bonus_amount: string;
}

export const EMPTY_REFERRAL_OVERRIDE_FORM: ReferralOverrideFormState = {
  referrer_bonus_type: 'percentage',
  referrer_bonus_percentage: DEFAULT_AMOUNT,
  referrer_bonus_fixed_amount: DEFAULT_AMOUNT,
  referred_player_bonus_amount: DEFAULT_AMOUNT,
};

type ReferralOverrideSource = {
  referrer_bonus_type?: string | null;
  referrer_bonus_percentage?: string | null;
  referrer_bonus_fixed_amount?: string | null;
  referred_player_bonus_amount?: string | null;
};

export type ReferralOverridePatchResult =
  | { ok: true; body: SaveReferralPlayerOverrideRequest }
  | { ok: false; title: string };

function amountOrDefault(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return DEFAULT_AMOUNT;
  return value;
}

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '.') return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

export function referralOverrideFormFromRecord(
  source: ReferralOverrideSource,
): ReferralOverrideFormState {
  return {
    referrer_bonus_type:
      source.referrer_bonus_type?.trim().toLowerCase() === 'fixed' ? 'fixed' : 'percentage',
    referrer_bonus_percentage: amountOrDefault(source.referrer_bonus_percentage),
    referrer_bonus_fixed_amount: amountOrDefault(source.referrer_bonus_fixed_amount),
    referred_player_bonus_amount: amountOrDefault(source.referred_player_bonus_amount),
  };
}

function percentageOverride(
  playerId: number,
  form: ReferralOverrideFormState,
  referredPlayerBonusAmount: number,
): ReferralOverridePatchResult {
  const percentage = parseAmount(form.referrer_bonus_percentage);
  if (
    percentage == null ||
    percentage < MIN_REFERRAL_AMOUNT ||
    percentage > MAX_REFERRER_BONUS_PERCENTAGE
  ) {
    return { ok: false, title: PERCENTAGE_RANGE_ERROR };
  }
  if (referredPlayerBonusAmount < MIN_REFERRAL_AMOUNT) {
    return { ok: false, title: AMOUNT_ERROR };
  }

  return {
    ok: true,
    body: {
      player: playerId,
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: percentage,
      referred_player_bonus_amount: referredPlayerBonusAmount,
    },
  };
}

function fixedOverride(
  playerId: number,
  form: ReferralOverrideFormState,
  referredPlayerBonusAmount: number,
): ReferralOverridePatchResult {
  const fixedAmount = parseAmount(form.referrer_bonus_fixed_amount);
  if (fixedAmount == null || fixedAmount < MIN_REFERRAL_AMOUNT || referredPlayerBonusAmount < MIN_REFERRAL_AMOUNT) {
    return { ok: false, title: AMOUNT_ERROR };
  }

  return {
    ok: true,
    body: {
      player: playerId,
      referrer_bonus_type: 'fixed',
      referrer_bonus_fixed_amount: fixedAmount,
      referred_player_bonus_amount: referredPlayerBonusAmount,
    },
  };
}

export function buildReferralPlayerOverridePatch(
  playerId: number,
  form: ReferralOverrideFormState,
): ReferralOverridePatchResult {
  const referredPlayerBonusAmount = parseAmount(form.referred_player_bonus_amount);
  if (referredPlayerBonusAmount == null) {
    return { ok: false, title: AMOUNT_ERROR };
  }
  if (form.referrer_bonus_type === 'fixed') {
    return fixedOverride(playerId, form, referredPlayerBonusAmount);
  }
  return percentageOverride(playerId, form, referredPlayerBonusAmount);
}
