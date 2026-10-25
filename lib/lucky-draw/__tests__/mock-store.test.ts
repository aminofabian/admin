import { beforeEach, describe, expect, it } from 'vitest';
import { luckyDrawMock } from '../mock-store';

describe('luckyDrawMock manual draw', () => {
  beforeEach(() => {
    // Reset singleton between tests
    const g = globalThis as typeof globalThis & { __luckyDrawMockStore?: unknown };
    delete g.__luckyDrawMockStore;
  });

  it('allows weekly manual draw when thresholds are met and resets schedule', () => {
    const before = luckyDrawMock.getActiveCycles();
    expect(before.eligibility.weekly.allowed).toBe(true);
    const weeklyId = before.weekly!.id;

    const result = luckyDrawMock.runManual(weeklyId);
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.cycle.method).toBe('manual');
    expect(result.next_cycle.ticket_count).toBe(0);
    expect(result.next_cycle.id).not.toBe(weeklyId);

    const after = luckyDrawMock.getActiveCycles();
    expect(after.weekly?.id).toBe(result.next_cycle.id);
    expect(Date.parse(after.weekly!.scheduled_at)).toBeGreaterThan(Date.now());
  });

  it('blocks monthly manual draw when under threshold', () => {
    const before = luckyDrawMock.getActiveCycles();
    expect(before.eligibility.monthly.allowed).toBe(false);
    const result = luckyDrawMock.runManual(before.monthly!.id);
    expect(result).toMatchObject({ status: 400 });
  });

  it('blocks all manual draws when early_manual_enabled is false', () => {
    luckyDrawMock.patchThresholds({ early_manual_enabled: false });
    const active = luckyDrawMock.getActiveCycles();
    expect(active.eligibility.weekly.allowed).toBe(false);
    expect(active.eligibility.weekly.reasons[0]).toMatch(/disabled globally/i);
  });
});
