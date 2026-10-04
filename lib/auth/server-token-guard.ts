import { NextResponse } from 'next/server';
import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/constants/roles';

/**
 * Server-side bearer token gate for Next.js route handlers that do NOT proxy to
 * the Django backend (which validates the token itself).
 *
 * ## What this does and does not prove
 *
 * This checks that the caller presented a structurally well-formed, unexpired
 * JWT. It does **not** verify the signature, because this codebase has no
 * signing key or JWKS available to the Next.js layer — the Django backend
 * issues and signs the tokens, and every other proxy route simply forwards the
 * header and lets the backend decide.
 *
 * That means a caller who can mint an arbitrary well-formed, unexpired JWT
 * would still pass this gate. It reliably stops the realistic abuse case for an
 * unauthenticated endpoint — `curl -H 'Authorization: x'` with a junk or absent
 * token, and replay of expired sessions — and it makes the requirement explicit
 * rather than implicit.
 *
 * Closing the remaining gap (real signature verification) needs the backend's
 * signing secret or a JWKS endpoint. Until that exists, treat any route relying
 * on this guard as "authenticated by convention", not "authenticated".
 */

export type TokenGuardResult =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; response: NextResponse };

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json =
      typeof atob === 'function'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * Roles permitted to perform operator-level actions (e.g. chat image upload).
 * Must match `USER_ROLES` issued by login — brand CSRs use `company`, not `admin`.
 * `admin` is kept only as a legacy alias if any old tokens still use it.
 */
const OPERATOR_ROLES = new Set<string>([
  ...ADMIN_ROLES,
  ...STAFF_ROLES,
  'admin',
]);

/** Prefer `role`; fall back to common JWT claim aliases used by some backends. */
function extractRole(payload: Record<string, unknown>): string {
  const candidates = [payload.role, payload.user_role, payload.user_type];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().toLowerCase();
    }
  }
  return '';
}

/**
 * Validate the Authorization header of a route-handler request.
 *
 * `requireRole: false` (default) accepts any signed-in principal; pass `true`
 * for endpoints that should be restricted to operator accounts.
 */
export function guardBearerToken(
  authHeader: string | null | undefined,
  { requireRole = false }: { requireRole?: boolean } = {},
): TokenGuardResult {
  if (!authHeader || !authHeader.trim()) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Authentication required' },
        { status: 401 },
      ),
    };
  }

  const [scheme, token] = authHeader.split(' ');
  if (!/^Bearer$/i.test(scheme ?? '') || !token) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Malformed Authorization header' },
        { status: 401 },
      ),
    };
  }

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Malformed token' },
        { status: 401 },
      ),
    };
  }

  const payload = decodeSegment(parts[1]);
  if (!payload) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Malformed token' },
        { status: 401 },
      ),
    };
  }

  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Token missing expiry' },
        { status: 401 },
      ),
    };
  }
  if (exp * 1000 <= Date.now()) {
    return {
      ok: false,
      response: NextResponse.json(
        { status: 'error', message: 'Session expired. Please re-login.' },
        { status: 401 },
      ),
    };
  }

  if (requireRole) {
    const role = extractRole(payload);
    if (!OPERATOR_ROLES.has(role)) {
      return {
        ok: false,
        response: NextResponse.json(
          { status: 'error', message: 'Insufficient permissions' },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, payload };
}
