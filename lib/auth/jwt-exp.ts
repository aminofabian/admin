/**
 * Decode JWT `exp` without verifying signature (client-side freshness check only).
 */
export function getJwtExpiryMs(token: string | null | undefined): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { exp?: number };
    if (typeof payload.exp !== 'number' || !Number.isFinite(payload.exp)) {
      return null;
    }
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

export function getJwtTimeRemainingMs(token: string | null | undefined): number | null {
  const expMs = getJwtExpiryMs(token);
  if (expMs == null) return null;
  return expMs - Date.now();
}

export function isJwtNearExpiry(
  token: string | null | undefined,
  thresholdMs: number,
): boolean {
  const remaining = getJwtTimeRemainingMs(token);
  if (remaining == null) return false;
  return remaining < thresholdMs;
}
