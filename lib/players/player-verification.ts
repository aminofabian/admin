import type { Player } from '@/types';

const PHONE_VERIFICATION_FLAGS = [
  'mobile_verified',
  'is_mobile_verified',
  'phone_verified',
  'is_phone_verified',
] as const;

const IDENTITY_VERIFICATION_FLAGS = [
  'is_identity_verified',
  'kyc_verified',
  'is_kyc_verified',
  'kyc_complete',
  'is_kyc_complete',
] as const;

const IDENTITY_VERIFIED_STATUSES = new Set(['verified', 'approved', 'complete', 'completed']);

function isTruthyFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'verified';
  }
  return false;
}

function isFalsyFlag(value: unknown): boolean {
  if (value === false || value === 0) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'unverified';
  }
  return false;
}

function readBooleanFlag(
  player: Player,
  flags: readonly (keyof Player)[]
): boolean | null {
  for (const flag of flags) {
    const value = player[flag];
    if (value === undefined || value === null) continue;
    if (isTruthyFlag(value)) return true;
    if (isFalsyFlag(value)) return false;
  }
  return null;
}

function readIdentityStatus(player: Player): string {
  return (
    player.identity_verification_status?.trim().toLowerCase() ||
    player.kyc_status?.identity_status?.trim().toLowerCase() ||
    ''
  );
}

/** Step 2 — phone OTP / mobile verified (admin toggle initial state). */
export function isPlayerPhoneVerified(player: Player | null | undefined): boolean {
  if (!player) return false;

  const flagState = readBooleanFlag(player, PHONE_VERIFICATION_FLAGS);
  if (flagState === true) return true;
  if (flagState === false) return false;
  if (player.kyc_status?.phone_complete === true) return true;

  return false;
}

/** Step 3 — identity / SSN verification fully approved (admin toggle initial state). */
export function isPlayerIdentityVerified(player: Player | null | undefined): boolean {
  if (!player) return false;

  const flagState = readBooleanFlag(player, IDENTITY_VERIFICATION_FLAGS);
  if (flagState === true) return true;
  if (flagState === false) return false;

  const status = readIdentityStatus(player);
  if (status && IDENTITY_VERIFIED_STATUSES.has(status)) return true;

  return false;
}

const IDENTITY_PENDING_STATUSES = new Set(['pending', 'submitted', 'review', 'in_review', 'processing']);
const IDENTITY_REJECTED_STATUSES = new Set(['rejected', 'failed', 'declined', 'denied']);
const IDENTITY_NOT_SUBMITTED_STATUSES = new Set(['not_submitted', 'none', 'unverified', '']);

function readExplicitBinpayStatus(player: Player): string {
  return (
    player.binpay_verification_status?.trim().toLowerCase() ||
    player.binpay_kyc_status?.trim().toLowerCase() ||
    player.binpay_status?.trim().toLowerCase() ||
    ''
  );
}

export type IdentitySubmissionCategory =
  | 'not_submitted'
  | 'pending'
  | 'rejected'
  | 'verified'
  | 'unknown';

/** Whether the player has submitted identity KYC or received a provider decision. */
export function getPlayerIdentitySubmissionCategory(
  player: Player | null | undefined
): IdentitySubmissionCategory {
  if (!player) return 'unknown';

  const explicit = readExplicitBinpayStatus(player);
  if (explicit) {
    if (IDENTITY_VERIFIED_STATUSES.has(explicit)) return 'verified';
    if (IDENTITY_PENDING_STATUSES.has(explicit)) return 'pending';
    if (IDENTITY_REJECTED_STATUSES.has(explicit)) return 'rejected';
    if (IDENTITY_NOT_SUBMITTED_STATUSES.has(explicit)) return 'not_submitted';
    return 'unknown';
  }

  const status = readIdentityStatus(player);
  if (status) {
    if (IDENTITY_VERIFIED_STATUSES.has(status)) return 'verified';
    if (IDENTITY_PENDING_STATUSES.has(status)) return 'pending';
    if (IDENTITY_REJECTED_STATUSES.has(status)) return 'rejected';
    if (IDENTITY_NOT_SUBMITTED_STATUSES.has(status)) return 'not_submitted';
    return 'unknown';
  }

  if (player.kyc_status?.identity_complete === true) return 'pending';
  if (isPlayerIdentityVerified(player)) return 'verified';

  return 'not_submitted';
}

/** Phone was verified by the player through OTP, not a manual admin override. */
export function isPlayerPhoneVerifiedViaUser(player: Player | null | undefined): boolean {
  if (!player || !isPlayerPhoneVerified(player)) return false;
  if (player.kyc_status?.phone_complete === true) return true;
  if (player.mobile_verified === true || player.is_mobile_verified === true) return true;
  if (player.phone_verified === true) return true;
  return false;
}

export function isPlayerPhoneManuallyMarked(player: Player | null | undefined): boolean {
  return isPlayerPhoneVerified(player) && !isPlayerPhoneVerifiedViaUser(player);
}

export function isPlayerIdentityManuallyMarked(player: Player | null | undefined): boolean {
  return isPlayerIdentityVerified(player) && !isPlayerIdentityVerifiedViaProvider(player);
}

export function canAdminMarkPhoneVerified(player: Player | null | undefined): boolean {
  return Boolean(player) && !isPlayerPhoneVerified(player);
}

export function canAdminUnmarkPhoneVerified(player: Player | null | undefined): boolean {
  return isPlayerPhoneManuallyMarked(player);
}

export function canAdminMarkIdentityVerified(player: Player | null | undefined): boolean {
  if (!player || isPlayerIdentityVerified(player)) return false;

  const category = getPlayerIdentitySubmissionCategory(player);
  return category === 'not_submitted' || category === 'rejected';
}

export function canAdminUnmarkIdentityVerified(player: Player | null | undefined): boolean {
  return isPlayerIdentityManuallyMarked(player);
}

export type AdminVerificationAction = 'mark' | 'unmark';

export function getAdminPhoneVerificationAction(
  player: Player | null | undefined
): AdminVerificationAction | null {
  if (canAdminMarkPhoneVerified(player)) return 'mark';
  if (canAdminUnmarkPhoneVerified(player)) return 'unmark';
  return null;
}

export function getAdminIdentityVerificationAction(
  player: Player | null | undefined
): AdminVerificationAction | null {
  if (canAdminMarkIdentityVerified(player)) return 'mark';
  if (canAdminUnmarkIdentityVerified(player)) return 'unmark';
  return null;
}

export function getAdminVerificationBlockReason(
  target: 'phone' | 'identity',
  player: Player | null | undefined
): string | null {
  if (!player) return 'Player not found.';

  if (target === 'phone') {
    if (isPlayerPhoneVerifiedViaUser(player)) {
      return 'Phone was verified by the player and cannot be changed manually.';
    }
    return null;
  }

  if (isPlayerIdentityVerifiedViaProvider(player)) {
    return 'Identity was verified through BinPay and cannot be changed manually.';
  }

  const category = getPlayerIdentitySubmissionCategory(player);
  if (category === 'pending') {
    return 'Identity verification is pending review and cannot be changed manually.';
  }
  if (category === 'verified' && !isPlayerIdentityManuallyMarked(player)) {
    return 'Identity was verified through the provider flow and cannot be changed manually.';
  }

  return null;
}

export function isPlayerIdentityVerifiedViaProvider(player: Player | null | undefined): boolean {
  if (!player) return false;

  const explicitBinpayStatus =
    player.binpay_verification_status?.trim().toLowerCase() ||
    player.binpay_kyc_status?.trim().toLowerCase() ||
    player.binpay_status?.trim().toLowerCase() ||
    '';
  if (explicitBinpayStatus) return IDENTITY_VERIFIED_STATUSES.has(explicitBinpayStatus);

  const provider =
    player.identity_verification_provider?.trim() ||
    player.kyc_status?.identity_provider?.trim() ||
    '';
  return Boolean(provider) && isPlayerIdentityVerified(player);
}

export function getPlayerIdentityStatusLabel(player: Player | null | undefined): string {
  if (!player) return 'Unknown';
  if (isPlayerIdentityVerified(player)) {
    return isPlayerIdentityVerifiedViaProvider(player) ? 'Verified' : 'Marked verified';
  }

  const status = readIdentityStatus(player);
  if (status === 'pending' || status === 'submitted' || status === 'review') return 'Pending review';
  if (status === 'not_submitted' || status === 'none') return 'Not submitted';
  if (status === 'rejected' || status === 'failed' || status === 'declined') {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  if (status) return status.charAt(0).toUpperCase() + status.slice(1);

  return 'Not verified';
}

/** Player has completed all required KYC steps — profile fields should be read-only. */
export function isPlayerKycComplete(player: Player | null | undefined): boolean {
  if (!player) return false;

  if (player.is_kyc_complete === true || player.kyc_status?.is_kyc_complete === true) {
    return true;
  }

  return isPlayerPhoneVerified(player) && isPlayerIdentityVerified(player);
}

export type PlayerVerificationPatch = {
  is_phone_verified?: boolean;
  is_identity_verified?: boolean;
  identity_verification_status?: 'approved' | 'not_submitted';
};

/** Matches PATCH /api/v1/players/{id}/ contract from backend. */
export function buildPlayerVerificationPatch(
  phoneVerified: boolean,
  identityVerified: boolean
): PlayerVerificationPatch {
  return {
    is_phone_verified: phoneVerified,
    is_identity_verified: identityVerified,
    identity_verification_status: identityVerified ? 'approved' : 'not_submitted',
  };
}

export function buildPhoneVerificationPatch(
  phoneVerified: boolean
): Pick<PlayerVerificationPatch, 'is_phone_verified'> {
  return { is_phone_verified: phoneVerified };
}

export function buildIdentityVerificationPatch(
  identityVerified: boolean
): Pick<PlayerVerificationPatch, 'is_identity_verified' | 'identity_verification_status'> {
  return {
    is_identity_verified: identityVerified,
    identity_verification_status: identityVerified ? 'approved' : 'not_submitted',
  };
}

export function isVerificationPersisted(
  player: Player,
  target: 'phone' | 'identity',
  expectedVerified: boolean
): boolean {
  return target === 'phone'
    ? isPlayerPhoneVerified(player) === expectedVerified
    : isPlayerIdentityVerified(player) === expectedVerified;
}
