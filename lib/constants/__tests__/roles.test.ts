import { describe, expect, it } from 'vitest';
import {
  USER_ROLES,
  canEditPlayerCashoutLimit,
  canEditPlayerRouletteAllowance,
  canEditPlayerVerification,
  canEditRouletteRewards,
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
