import { describe, it, expect } from 'vitest';
import {
  WS_RECONNECT_BACKOFF_MS,
  wsReconnectDelayMs,
} from '../reconnect-backoff';

describe('wsReconnectDelayMs', () => {
  it('uses the canonical 1/2/5/10/15/30 table', () => {
    expect([...WS_RECONNECT_BACKOFF_MS]).toEqual([
      1000, 2000, 5000, 10000, 15000, 30000,
    ]);
  });

  it('returns 0 when immediate', () => {
    expect(wsReconnectDelayMs(1, { immediate: true })).toBe(0);
  });

  it('stays within ±25% of the table entry for each attempt', () => {
    for (let attempt = 1; attempt <= 8; attempt++) {
      const idx = Math.min(attempt - 1, WS_RECONNECT_BACKOFF_MS.length - 1);
      const base = WS_RECONNECT_BACKOFF_MS[idx];
      const delay = wsReconnectDelayMs(attempt, { jitterRatio: 0.25 });
      expect(delay).toBeGreaterThanOrEqual(Math.floor(base * 0.75));
      expect(delay).toBeLessThanOrEqual(Math.ceil(base * 1.25));
    }
  });

  it('caps at the last table entry for high attempt counts', () => {
    const delay = wsReconnectDelayMs(99, { jitterRatio: 0 });
    expect(delay).toBe(30000);
  });
});
