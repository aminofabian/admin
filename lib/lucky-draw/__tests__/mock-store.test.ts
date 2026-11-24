import { beforeEach, describe, expect, it } from 'vitest';
import { luckyDrawMock } from '../mock-store';

describe('luckyDrawMock manual draw', () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & { __luckyDrawMockStoreV2?: unknown };
    delete g.__luckyDrawMockStoreV2;
  });

  it('allows weekly manual draw when thresholds are met and resets schedule', () => {
    const before = luckyDrawMock.getStatus();
    expect(before.weekly.manual_draw.eligible).toBe(true);
    const weeklyId = before.weekly.cycle!.id;

    const result = luckyDrawMock.runDraw('weekly');
    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.cycle.draw_method).toBe('manual');
    expect(result.next_cycle?.ticket_count).toBe(0);
    expect(result.next_cycle?.id).not.toBe(weeklyId);

    const after = luckyDrawMock.getStatus();
    expect(after.weekly.cycle?.id).toBe(result.next_cycle?.id);
    expect(Date.parse(after.weekly.cycle!.scheduled_draw_at)).toBeGreaterThan(Date.now());
  });

  it('blocks monthly manual draw when under threshold with 409 code', () => {
    const before = luckyDrawMock.getStatus();
    expect(before.monthly.manual_draw.eligible).toBe(false);
    const result = luckyDrawMock.runDraw('monthly');
    expect(result).toMatchObject({ status: 409, code: 'manual_thresholds_not_met' });
  });

  it('hides eligibility when early_draw_enabled is false', () => {
    luckyDrawMock.patchGlobalSettings({ early_draw_enabled: false });
    const status = luckyDrawMock.getStatus();
    expect(status.weekly.manual_draw.eligible).toBe(false);
    expect(status.weekly.manual_draw.early_draw_globally_enabled).toBe(false);
    expect(status.weekly.manual_draw.block_reasons).toContain('early_draw_disabled');
  });

  it('credits pending winners', () => {
    luckyDrawMock.patchSettings({ prize_auto_credit: false });
    const run = luckyDrawMock.runDraw('weekly');
    expect('error' in run).toBe(false);
    if ('error' in run) return;

    const pending = run.cycle.winners[0];
    expect(pending.prize_status).toBe('pending');
    const credited = luckyDrawMock.creditWinner(pending.id);
    expect(credited).toMatchObject({ prize_status: 'credited' });
  });
});
