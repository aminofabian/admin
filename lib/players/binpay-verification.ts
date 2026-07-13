import type { Player } from '@/types';
import {
  isPlayerIdentityVerified,
  isPlayerIdentityVerifiedViaProvider,
} from '@/lib/players/player-verification';

export type BinpayVerificationStatus =
  | 'verified'
  | 'pending'
  | 'not_submitted'
  | 'rejected'
  | 'unknown';

const VERIFIED_STATUSES = new Set([
  'verified',
  'approved',
  'manually_approved',
  'complete',
  'completed',
]);
const PENDING_STATUSES = new Set(['pending', 'submitted', 'review', 'in_review', 'processing']);
const NOT_SUBMITTED_STATUSES = new Set(['not_submitted', 'none', 'unverified', '']);
const REJECTED_STATUSES = new Set(['rejected', 'failed', 'declined', 'denied']);

function normalizeStatus(raw: string | null | undefined): BinpayVerificationStatus {
  const status = raw?.trim().toLowerCase() ?? '';
  if (!status) return 'not_submitted';
  if (VERIFIED_STATUSES.has(status)) return 'verified';
  if (PENDING_STATUSES.has(status)) return 'pending';
  if (REJECTED_STATUSES.has(status)) return 'rejected';
  if (NOT_SUBMITTED_STATUSES.has(status)) return 'not_submitted';
  return 'unknown';
}

function readExplicitBinpayStatus(player: Player): string | null {
  const candidates = [
    player.binpay_verification_status,
    player.binpay_kyc_status,
    player.binpay_status,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function readIdentityStatus(player: Player): string | null {
  return (
    player.identity_verification_status?.trim() ||
    player.kyc_status?.identity_status?.trim() ||
    player.kyc_manual_status?.trim() ||
    null
  );
}

/** Resolved BinPay / cashout identity verification status for a player. */
export function getPlayerBinpayVerificationStatus(
  player: Player | null | undefined
): BinpayVerificationStatus {
  if (!player) return 'unknown';

  const explicit = readExplicitBinpayStatus(player);
  if (explicit) {
    return normalizeStatus(explicit);
  }

  if (isPlayerIdentityVerified(player)) {
    return 'verified';
  }

  const identityStatus = readIdentityStatus(player);
  if (identityStatus) {
    return normalizeStatus(identityStatus);
  }

  if (player.kyc_status?.identity_complete === true) {
    return 'pending';
  }

  return 'not_submitted';
}

export function getPlayerBinpayVerificationLabel(
  player: Player | null | undefined
): string {
  switch (getPlayerBinpayVerificationStatus(player)) {
    case 'verified':
      // Distinguish real provider verification from a manual admin override.
      return isPlayerIdentityVerifiedViaProvider(player) ? 'Verified' : 'Marked verified';
    case 'pending':
      return 'Pending';
    case 'not_submitted':
      return 'Not submitted';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

export function getPlayerBinpayVerificationBadgeVariant(
  player: Player | null | undefined
): 'success' | 'warning' | 'danger' | 'default' {
  switch (getPlayerBinpayVerificationStatus(player)) {
    case 'verified':
      return 'success';
    case 'pending':
      return 'warning';
    case 'rejected':
      return 'danger';
    default:
      return 'default';
  }
}

export function getPlayerBinpayVerificationProvider(
  player: Player | null | undefined
): string | null {
  if (!player) return null;
  const provider =
    player.identity_verification_provider?.trim() ||
    player.kyc_status?.identity_provider?.trim() ||
    null;
  if (!provider) return 'BinPay';
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}
