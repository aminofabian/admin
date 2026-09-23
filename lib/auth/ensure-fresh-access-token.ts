import { TOKEN_KEY, REFRESH_TOKEN_KEY } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { isJwtNearExpiry } from '@/lib/auth/jwt-exp';
import { recordWsAuthMetric } from '@/lib/ws/ws-auth-metrics';

/** Refresh when fewer than 3 minutes remain on the access JWT. */
export const WS_TOKEN_REFRESH_THRESHOLD_MS = 3 * 60 * 1000;

let refreshInFlight: Promise<string | null> | null = null;

export function readAccessToken(): string | null {
  return storage.get(TOKEN_KEY);
}

export async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (refreshInFlight) {
    recordWsAuthMetric('refresh_deduped');
    return refreshInFlight;
  }

  recordWsAuthMetric('refresh_attempted');
  refreshInFlight = (async () => {
    try {
      const refresh = storage.get(REFRESH_TOKEN_KEY);
      if (!refresh) {
        recordWsAuthMetric('refresh_failed', { reason: 'no_refresh_token' });
        return null;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh }),
      });

      if (!response.ok) {
        recordWsAuthMetric('refresh_failed', { status: response.status });
        return null;
      }

      const data = (await response.json().catch(() => null)) as {
        access?: string;
        refresh?: string;
        token?: string;
      } | null;

      const access = data?.access || data?.token || null;
      if (!access) {
        recordWsAuthMetric('refresh_failed', { reason: 'missing_token' });
        return null;
      }

      storage.set(TOKEN_KEY, access);
      if (data?.refresh) {
        storage.set(REFRESH_TOKEN_KEY, data.refresh);
      }
      return access;
    } catch {
      recordWsAuthMetric('refresh_failed', { reason: 'network' });
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

/**
 * Ensure the access token used for WS `?token=` is valid.
 * Refreshes when near expiry (or when `force` is set).
 */
export async function ensureFreshAccessToken(options?: {
  force?: boolean;
  thresholdMs?: number;
}): Promise<string | null> {
  const current = readAccessToken();
  if (!current) return null;

  const threshold = options?.thresholdMs ?? WS_TOKEN_REFRESH_THRESHOLD_MS;
  const needsRefresh =
    options?.force === true || isJwtNearExpiry(current, threshold);

  if (!needsRefresh) {
    return current;
  }

  const refreshed = await refreshAccessToken();
  return refreshed || (options?.force ? null : current);
}

/** Clear tokens and send the operator to login (WS auth failure). */
export function redirectToLoginAfterAuthFailure(): void {
  if (typeof window === 'undefined') return;
  try {
    storage.clear();
  } catch {
    // ignore
  }
  window.location.replace('/login');
}
