import { describe, expect, it } from 'vitest';
import {
  canAdminMarkIdentityVerified,
  canAdminMarkPhoneVerified,
  canAdminUnmarkIdentityVerified,
  canAdminUnmarkPhoneVerified,
  getAdminIdentityVerificationAction,
  getAdminPhoneVerificationAction,
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

describe('admin verification override rules', () => {
  it('blocks unmarking phone verified by the player', () => {
    const player = {
      ...basePlayer,
      is_phone_verified: true,
      mobile_verified: true,
      kyc_status: { phone_complete: true },
    };
    expect(canAdminUnmarkPhoneVerified(player)).toBe(false);
    expect(getAdminPhoneVerificationAction(player)).toBeNull();
  });

  it('allows unmarking a manually marked phone', () => {
    const player = {
      ...basePlayer,
      is_phone_verified: true,
    };
    expect(canAdminUnmarkPhoneVerified(player)).toBe(true);
    expect(getAdminPhoneVerificationAction(player)).toBe('unmark');
  });

  it('allows marking an unverified phone', () => {
    const player = {
      ...basePlayer,
      is_phone_verified: false,
    };
    expect(canAdminMarkPhoneVerified(player)).toBe(true);
    expect(getAdminPhoneVerificationAction(player)).toBe('mark');
  });

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
