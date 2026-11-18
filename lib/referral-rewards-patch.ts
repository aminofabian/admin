import type { BonusType } from '@/types/bonus';
import type { UpdateReferralSettingsRequest } from '@/types/settings';

const DEFAULT_AMOUNT = '0';
const MIN_REFERRAL_AMOUNT = 0;
const MAX_REFERRER_BONUS_PERCENTAGE = 100;
const PERCENTAGE_RANGE_ERROR = 'Referrer bonus must be between 0 and 100%';
const AMOUNT_ERROR = 'Amounts must be 0 or greater';

export interface ReferralRewardsFormState {
  is_enabled: boolean;
  referrer_bonus_type: BonusType;
  referrer_bonus_percentage: string;
  referrer_bonus_fixed_amount: string;
  referrer_bonus_cap: string;
  referred_player_bonus_amount: string;
}

export const EMPTY_REFERRAL_REWARDS_FORM: ReferralRewardsFormState = {
  is_enabled: false,
  referrer_bonus_type: 'percentage',
  referrer_bonus_percentage: DEFAULT_AMOUNT,
  referrer_bonus_fixed_amount: DEFAULT_AMOUNT,
  referrer_bonus_cap: DEFAULT_AMOUNT,
  referred_player_bonus_amount: DEFAULT_AMOUNT,
};

type ReferralRewardsSource = {
  is_enabled?: boolean;
  referrer_bonus_type?: string | null;
  referrer_bonus_percentage?: string | null;
  referrer_bonus_fixed_amount?: string | null;
  referrer_bonus_cap?: string | null;
  referred_player_bonus_amount?: string | null;
};

export type ReferralRewardsPatchResult =
  | { ok: true; body: UpdateReferralSettingsRequest }
  | { ok: false; title: string };

function amountOrDefault(value: string | null | undefined): string {
  if (value == null || value.trim() === '') return DEFAULT_AMOUNT;
  return value;
}

function parseAmount(value: string): number {
  if (value === '' || value === '.') return MIN_REFERRAL_AMOUNT;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? MIN_REFERRAL_AMOUNT : parsed;
}

function isBelowMinimum(value: number): boolean {
  return value < MIN_REFERRAL_AMOUNT;
}

export function referralRewardsFormFromSettings(
  settings: ReferralRewardsSource,
): ReferralRewardsFormState {
  return {
    is_enabled: Boolean(settings.is_enabled),
    referrer_bonus_type: settings.referrer_bonus_type === 'fixed' ? 'fixed' : 'percentage',
    referrer_bonus_percentage: amountOrDefault(settings.referrer_bonus_percentage),
    referrer_bonus_fixed_amount: amountOrDefault(settings.referrer_bonus_fixed_amount),
    referrer_bonus_cap: amountOrDefault(settings.referrer_bonus_cap),
    referred_player_bonus_amount: amountOrDefault(settings.referred_player_bonus_amount),
  };
}

function percentagePatch(
  form: ReferralRewardsFormState,
  referredPlayerBonusAmount: number,
): ReferralRewardsPatchResult {
  const percentage = parseAmount(form.referrer_bonus_percentage);
  const cap = parseAmount(form.referrer_bonus_cap);

  if (percentage < MIN_REFERRAL_AMOUNT || percentage > MAX_REFERRER_BONUS_PERCENTAGE) {
    return { ok: false, title: PERCENTAGE_RANGE_ERROR };
  }
  if (isBelowMinimum(cap) || isBelowMinimum(referredPlayerBonusAmount)) {
    return { ok: false, title: AMOUNT_ERROR };
  }

  return {
    ok: true,
    body: {
      is_enabled: form.is_enabled,
      referrer_bonus_type: 'percentage',
      referrer_bonus_percentage: percentage,
      referrer_bonus_cap: cap,
      referred_player_bonus_amount: referredPlayerBonusAmount,
    },
  };
}

function fixedPatch(
  form: ReferralRewardsFormState,
  referredPlayerBonusAmount: number,
): ReferralRewardsPatchResult {
  const fixedAmount = parseAmount(form.referrer_bonus_fixed_amount);
  if (isBelowMinimum(fixedAmount) || isBelowMinimum(referredPlayerBonusAmount)) {
    return { ok: false, title: AMOUNT_ERROR };
  }

  return {
    ok: true,
    body: {
      is_enabled: form.is_enabled,
      referrer_bonus_type: 'fixed',
      referrer_bonus_fixed_amount: fixedAmount,
      referred_player_bonus_amount: referredPlayerBonusAmount,
    },
  };
}

export function buildReferralRewardsPatch(
  form: ReferralRewardsFormState,
): ReferralRewardsPatchResult {
  const referredPlayerBonusAmount = parseAmount(form.referred_player_bonus_amount);
  if (form.referrer_bonus_type === 'fixed') {
    return fixedPatch(form, referredPlayerBonusAmount);
  }
  return percentagePatch(form, referredPlayerBonusAmount);
}
