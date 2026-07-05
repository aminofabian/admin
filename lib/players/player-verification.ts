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

export function getPlayerIdentityStatusLabel(player: Player | null | undefined): string {
  if (!player) return 'Unknown';
  if (isPlayerIdentityVerified(player)) return 'Verified';

  const status = readIdentityStatus(player);
  if (status === 'pending' || status === 'submitted' || status === 'review') return 'Pending review';
  if (status === 'unverified' || status === 'rejected' || status === 'failed') {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  if (status) return status.charAt(0).toUpperCase() + status.slice(1);

  return 'Not verified';
}

export type PlayerVerificationPatch = {
  mobile_verified: boolean;
  identity_verification_status: 'verified' | 'unverified';
};

export function buildPlayerVerificationPatch(
  phoneVerified: boolean,
  identityVerified: boolean
): PlayerVerificationPatch {
  return {
    mobile_verified: phoneVerified,
    identity_verification_status: identityVerified ? 'verified' : 'unverified',
  };
}
