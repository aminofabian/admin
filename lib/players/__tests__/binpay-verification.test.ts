import { describe, expect, it } from 'vitest';
import {
  canRefreshBinpayKyc,
  getPlayerBinpayVerificationLabel,
  getPlayerBinpayVerificationStatus,
} from '@/lib/players/binpay-verification';
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

describe('binpay verification helpers', () => {
  it('reads explicit binpay_verification_status when present', () => {
    const player = {
      ...basePlayer,
      binpay_verification_status: 'verified',
    };
    expect(getPlayerBinpayVerificationStatus(player)).toBe('verified');
    expect(getPlayerBinpayVerificationLabel(player)).toBe('Verified');
  });

  it('falls back to identity_verification_status', () => {
    const player = {
      ...basePlayer,
      identity_verification_status: 'pending',
    };
    expect(getPlayerBinpayVerificationStatus(player)).toBe('pending');
    expect(getPlayerBinpayVerificationLabel(player)).toBe('Pending');
  });

  it('returns not submitted when no verification data exists', () => {
    expect(getPlayerBinpayVerificationStatus(basePlayer)).toBe('not_submitted');
    expect(getPlayerBinpayVerificationLabel(basePlayer)).toBe('Not submitted');
  });
});

describe('canRefreshBinpayKyc', () => {
  it('returns true for any player status including not submitted', () => {
    expect(canRefreshBinpayKyc(basePlayer)).toBe(true);
    expect(
      canRefreshBinpayKyc({ ...basePlayer, identity_verification_status: 'pending' }),
    ).toBe(true);
    expect(
      canRefreshBinpayKyc({ ...basePlayer, binpay_verification_status: 'verified' }),
    ).toBe(true);
    expect(
      canRefreshBinpayKyc({ ...basePlayer, binpay_verification_status: 'rejected' }),
    ).toBe(true);
  });

  it('returns false for null/undefined player', () => {
    expect(canRefreshBinpayKyc(null)).toBe(false);
    expect(canRefreshBinpayKyc(undefined)).toBe(false);
  });
});
