import { describe, expect, it } from 'vitest';
import { getUsStateLabel, normalizeUsStateCode } from '@/lib/utils/us-states';

describe('normalizeUsStateCode', () => {
  it('returns two-letter codes unchanged', () => {
    expect(normalizeUsStateCode('WI')).toBe('WI');
    expect(normalizeUsStateCode('wi')).toBe('WI');
  });

  it('maps full state names to codes', () => {
    expect(normalizeUsStateCode('Wisconsin')).toBe('WI');
    expect(normalizeUsStateCode('north carolina')).toBe('NC');
    expect(normalizeUsStateCode('New York')).toBe('NY');
  });

  it('handles legacy player-app variants', () => {
    expect(normalizeUsStateCode('NewYork')).toBe('NY');
  });

  it('returns empty string for missing values', () => {
    expect(normalizeUsStateCode('')).toBe('');
    expect(normalizeUsStateCode(null)).toBe('');
    expect(normalizeUsStateCode(undefined)).toBe('');
  });
});

describe('getUsStateLabel', () => {
  it('returns the display label for a state code', () => {
    expect(getUsStateLabel('WI')).toBe('Wisconsin');
  });
});
