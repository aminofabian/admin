import { afterEach, describe, expect, it, vi } from 'vitest';
import { getBrowserIanaTimezone, paramsWithClientTimezone } from '../browser-timezone';

describe('browser-timezone', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('paramsWithClientTimezone merges timezone from Intl', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      calendar: 'gregory',
      numberingSystem: 'latn',
      locale: 'en-US',
      timeZone: 'Africa/Nairobi',
    });

    expect(getBrowserIanaTimezone()).toBe('Africa/Nairobi');
    expect(paramsWithClientTimezone({ date_from: '2026-05-01', date_to: '2026-05-06' })).toEqual({
      date_from: '2026-05-01',
      date_to: '2026-05-06',
      timezone: 'Africa/Nairobi',
    });
  });

  it('paramsWithClientTimezone yields only timezone when params undefined', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      calendar: 'gregory',
      numberingSystem: 'latn',
      locale: 'en-US',
      timeZone: 'America/Los_Angeles',
    });

    expect(paramsWithClientTimezone(undefined)).toEqual({ timezone: 'America/Los_Angeles' });
  });

  it('paramsWithClientTimezone leaves params unchanged when timeZone missing', () => {
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      calendar: 'gregory',
      numberingSystem: 'latn',
      locale: 'en-US',
      timeZone: '',
    });

    expect(getBrowserIanaTimezone()).toBeUndefined();
    expect(paramsWithClientTimezone({ page: 1 })).toEqual({ page: 1 });
  });
});
