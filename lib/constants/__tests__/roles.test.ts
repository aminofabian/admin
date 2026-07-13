import { describe, expect, it } from 'vitest';
import {
  USER_ROLES,
  canEditPlayerCashoutLimit,
  canEditPlayerRouletteAllowance,
  canEditPlayerVerification,
  canEditRouletteRewards,
  canSyncBinpayKycStatus,
} from '@/lib/constants/roles';

describe('canEditPlayerVerification', () => {
  it('allows company, superadmin, and manager', () => {
    expect(canEditPlayerVerification(USER_ROLES.COMPANY)).toBe(true);
    expect(canEditPlayerVerification(USER_ROLES.SUPERADMIN)).toBe(true);
    expect(canEditPlayerVerification(USER_ROLES.MANAGER)).toBe(true);
  });

  it('denies staff, agent, player, and missing role', () => {
    expect(canEditPlayerVerification(USER_ROLES.STAFF)).toBe(false);
    expect(canEditPlayerVerification(USER_ROLES.AGENT)).toBe(false);
    expect(canEditPlayerVerification(USER_ROLES.PLAYER)).toBe(false);
    expect(canEditPlayerVerification(undefined)).toBe(false);
  });
});

describe('canSyncBinpayKycStatus', () => {
  it('allows company, superadmin, manager, staff, and agent', () => {
    expect(canSyncBinpayKycStatus(USER_ROLES.COMPANY)).toBe(true);
    expect(canSyncBinpayKycStatus(USER_ROLES.SUPERADMIN)).toBe(true);
    expect(canSyncBinpayKycStatus(USER_ROLES.MANAGER)).toBe(true);
    expect(canSyncBinpayKycStatus(USER_ROLES.STAFF)).toBe(true);
    expect(canSyncBinpayKycStatus(USER_ROLES.AGENT)).toBe(true);
  });

  it('denies player and missing role', () => {
    expect(canSyncBinpayKycStatus(USER_ROLES.PLAYER)).toBe(false);
    expect(canSyncBinpayKycStatus(undefined)).toBe(false);
  });

  it('is broader than manual verification edit', () => {
    expect(canSyncBinpayKycStatus(USER_ROLES.STAFF)).toBe(true);
    expect(canEditPlayerVerification(USER_ROLES.STAFF)).toBe(false);
    expect(canSyncBinpayKycStatus(USER_ROLES.AGENT)).toBe(true);
    expect(canEditPlayerVerification(USER_ROLES.AGENT)).toBe(false);
  });
});

describe('related admin-only player edits', () => {
  it('keep the same admin/manager allow list as verification', () => {
    for (const role of [
      USER_ROLES.COMPANY,
      USER_ROLES.SUPERADMIN,
      USER_ROLES.MANAGER,
      USER_ROLES.STAFF,
      USER_ROLES.AGENT,
      undefined,
    ] as const) {
      expect(canEditPlayerCashoutLimit(role)).toBe(canEditPlayerVerification(role));
      expect(canEditPlayerRouletteAllowance(role)).toBe(canEditPlayerVerification(role));
      expect(canEditRouletteRewards(role)).toBe(canEditPlayerVerification(role));
    }
  });
});
