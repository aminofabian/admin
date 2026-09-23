/**
 * Canonical reconnect backoff (Decision #4): 1s, 2s, 5s, 10s, 15s, 30s.
 * attempt is 1-based (first reconnect → index 0).
 */
export const WS_RECONNECT_BACKOFF_MS = [
  1000, 2000, 5000, 10000, 15000, 30000,
] as const;

export function wsReconnectDelayMs(
  attempt: number,
  options?: { immediate?: boolean; jitterRatio?: number },
): number {
  if (options?.immediate) return 0;

  const idx = Math.min(
    Math.max(attempt - 1, 0),
    WS_RECONNECT_BACKOFF_MS.length - 1,
  );
  const base = WS_RECONNECT_BACKOFF_MS[idx];
  const ratio = options?.jitterRatio ?? 0.25;
  const jitter = base * ratio * (Math.random() * 2 - 1);
  return Math.max(0, Math.round(base + jitter));
}
