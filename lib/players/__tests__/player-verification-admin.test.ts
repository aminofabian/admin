import { describe, expect, it } from 'vitest';
import {
  canAdminMarkIdentityVerified,
  canAdminUnmarkIdentityVerified,
  getAdminIdentityVerificationAction,
  isIdentityVerifiedFromRecord,
} from '@/lib/players/player-verification';
import type { Player } from '@/types';

const basePlayer = {
  id: 1,
  username: 'tester',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'player',
  balance: '0.00',
  winning_balance: '0.00',
  is_active: true,
  project_id: 1,
  created: '2026-01-01T00:00:00Z',
  modified: '2026-01-01T00:00:00Z',
} satisfies Player;

describe('isIdentityVerifiedFromRecord', () => {
  it('returns undefined when no identity fields are present', () => {
    expect(isIdentityVerifiedFromRecord({ id: 1, username: 'a' })).toBeUndefined();
  });

  it('returns true for verified flags and approved statuses', () => {
    expect(isIdentityVerifiedFromRecord({ is_identity_verified: true })).toBe(true);
    expect(isIdentityVerifiedFromRecord({ identity_verification_status: 'approved' })).toBe(true);
  });

  it('returns false for pending or explicitly unverified', () => {
    expect(
      isIdentityVerifiedFromRecord({ identity_verification_status: 'pending' }),
    ).toBe(false);
    expect(isIdentityVerifiedFromRecord({ is_identity_verified: false })).toBe(false);
  });
});

describe('admin verification override rules', () => {
  it('blocks identity overrides while pending review', () => {
    const player = {
      ...basePlayer,
      identity_verification_status: 'pending',
      kyc_status: { identity_complete: true, identity_status: 'pending' },
    };
    expect(canAdminMarkIdentityVerified(player)).toBe(false);
    expect(canAdminUnmarkIdentityVerified(player)).toBe(false);
    expect(getAdminIdentityVerificationAction(player)).toBeNull();
  });

  it('allows marking identity when not submitted', () => {
    const player = {
      ...basePlayer,
      identity_verification_status: 'not_submitted',
    };
    expect(canAdminMarkIdentityVerified(player)).toBe(true);
    expect(getAdminIdentityVerificationAction(player)).toBe('mark');
  });

  it('allows marking identity when rejected by provider', () => {
    const player = {
      ...basePlayer,
      binpay_verification_status: 'rejected',
      identity_verification_status: 'rejected',
    };
    expect(canAdminMarkIdentityVerified(player)).toBe(true);
    expect(getAdminIdentityVerificationAction(player)).toBe('mark');
  });

  it('blocks identity overrides when verified through BinPay', () => {
    const player = {
      ...basePlayer,
      is_identity_verified: true,
      binpay_verification_status: 'verified',
      identity_verification_provider: 'binpay',
    };
    expect(canAdminUnmarkIdentityVerified(player)).toBe(false);
    expect(getAdminIdentityVerificationAction(player)).toBeNull();
  });

  it('allows unmarking a manually marked identity', () => {
    const player = {
      ...basePlayer,
      is_identity_verified: true,
      identity_verification_status: 'approved',
    };
    expect(canAdminUnmarkIdentityVerified(player)).toBe(true);
    expect(getAdminIdentityVerificationAction(player)).toBe('unmark');
  });
});
