import { describe, expect, it } from 'vitest';
import { isSlotHouseHostname } from './slothouse';

describe('isSlotHouseHostname', () => {
  it('matches slothouse admin and player hosts', () => {
    expect(isSlotHouseHostname('admin.slothouse.io')).toBe(true);
    expect(isSlotHouseHostname('admin.slothouse.cc')).toBe(true);
    expect(isSlotHouseHostname('slothouse.io')).toBe(true);
    expect(isSlotHouseHostname('www.slothouse.cc')).toBe(true);
    expect(isSlotHouseHostname('staging.slothouse.io:3000')).toBe(true);
    expect(isSlotHouseHostname('slothouse.bruii.com')).toBe(true);
  });

  it('rejects other brands', () => {
    expect(isSlotHouseHostname('admin.bitslot.cc')).toBe(false);
    expect(isSlotHouseHostname('admin.spincash.cc')).toBe(false);
    expect(isSlotHouseHostname('playltc.com')).toBe(false);
    expect(isSlotHouseHostname('localhost')).toBe(false);
  });
});
