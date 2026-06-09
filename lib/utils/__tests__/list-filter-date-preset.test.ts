import { describe, expect, it } from 'vitest';
import { inferListDatePreset } from '../list-filter-date-preset';
import { getDateRange } from '../calendar-date-range';

describe('inferListDatePreset', () => {
  it('returns empty when no dates', () => {
    expect(inferListDatePreset('', '')).toBe('');
  });

  it('returns custom when only one boundary set', () => {
    expect(inferListDatePreset('2026-05-01', '')).toBe('custom');
    expect(inferListDatePreset('', '2026-05-06')).toBe('custom');
  });

  it('matches today preset range', () => {
    const { start, end } = getDateRange('today');
    expect(inferListDatePreset(start, end)).toBe('today');
  });

  it('returns custom for arbitrary range', () => {
    expect(inferListDatePreset('2020-01-01', '2020-12-31')).toBe('custom');
  });
});
