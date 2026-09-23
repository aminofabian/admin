type Metric =
  | 'refresh_attempted'
  | 'refresh_failed'
  | 'refresh_deduped'
  | 'auth_close_login'
  | 'handshake_1006_refresh'
  | 'reconnect_scheduled';

const counts: Record<Metric, number> = {
  refresh_attempted: 0,
  refresh_failed: 0,
  refresh_deduped: 0,
  auth_close_login: 0,
  handshake_1006_refresh: 0,
  reconnect_scheduled: 0,
};

/** Lightweight WS auth observability (console + in-memory counters). */
export function recordWsAuthMetric(
  metric: Metric,
  detail?: Record<string, unknown>,
): void {
  counts[metric] += 1;
  if (typeof console !== 'undefined') {
    console.info(`[WS Auth] ${metric}`, {
      count: counts[metric],
      app: 'admin',
      ...detail,
    });
  }
}

export function getWsAuthMetricCounts(): Readonly<Record<Metric, number>> {
  return { ...counts };
}
