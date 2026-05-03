import { describe, it, expect } from 'vitest';
import {
  buildAnalyticsFiltersWithDatePreset,
  describeAnalyticsFilterRange,
  formatLocalCalendarDate,
} from '@/app/dashboard/analytics/analytics-utils';

describe('formatLocalCalendarDate', () => {
  it('formats the local calendar date as YYYY-MM-DD', () => {
    const local = new Date(2026, 4, 3, 15, 30, 0);
    expect(formatLocalCalendarDate(local)).toBe('2026-05-03');
  });
});

describe('buildAnalyticsFiltersWithDatePreset', () => {
  const base = {
    startDate: '2026-05-01',
    endDate: '2026-05-07',
    timezone: 'America/New_York',
  };

  it('uses preset today without start_date or end_date', () => {
    const f = buildAnalyticsFiltersWithDatePreset({ ...base, datePreset: 'today' });
    expect(f.preset).toBe('today');
    expect(f.timezone).toBe('America/New_York');
    expect(f.start_date).toBeUndefined();
    expect(f.end_date).toBeUndefined();
  });

  it('uses preset yesterday without start_date or end_date', () => {
    const f = buildAnalyticsFiltersWithDatePreset({ ...base, datePreset: 'yesterday' });
    expect(f.preset).toBe('yesterday');
    expect(f.start_date).toBeUndefined();
    expect(f.end_date).toBeUndefined();
  });

  it('uses start_date and end_date for this_month with timezone', () => {
    const f = buildAnalyticsFiltersWithDatePreset({ ...base, datePreset: 'this_month' });
    expect(f.preset).toBeUndefined();
    expect(f.start_date).toBe('2026-05-01');
    expect(f.end_date).toBe('2026-05-07');
    expect(f.timezone).toBe('America/New_York');
  });

  it('omits gender when empty and trims username', () => {
    const f = buildAnalyticsFiltersWithDatePreset({
      ...base,
      datePreset: 'today',
      username: '  alice  ',
      gender: '',
    });
    expect(f.username).toBe('alice');
    expect(f.gender).toBeUndefined();
  });
});

describe('describeAnalyticsFilterRange', () => {
  const tz = 'America/New_York';

  it('describes preset today', () => {
    const s = describeAnalyticsFilterRange('today', '2026-05-03', '2026-05-03', tz);
    expect(s.startsWith('Range: Today')).toBe(true);
    expect(s).toContain(tz);
    expect(s).toContain('→ now');
  });

  it('describes preset yesterday', () => {
    const s = describeAnalyticsFilterRange('yesterday', '2026-05-02', '2026-05-02', tz);
    expect(s).toContain('Yesterday');
    expect(s).toContain(tz);
  });

  it('describes an inclusive multi-day span', () => {
    const s = describeAnalyticsFilterRange('custom', '2026-05-01', '2026-05-07', tz);
    expect(s).toContain('inclusive days');
    expect(s).toContain('→');
  });
});
