import { describe, it, expect } from 'vitest';
import { guardBearerToken } from '../server-token-guard';

/** Build a well-formed JWT with the given payload (signature is not checked). */
function makeToken(payload: Record<string, unknown>): string {
  const encode = (obj: unknown) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 3600;

describe('guardBearerToken', () => {
  it('rejects a missing header', () => {
    expect(guardBearerToken(null).ok).toBe(false);
  });

  it('rejects a junk value that merely exists', () => {
    // Presence-only checking is exactly the flaw this guard replaces.
    for (const junk of ['x', 'Bearer', 'Bearer ', 'Basic abc', 'Bearer notajwt']) {
      expect(guardBearerToken(junk).ok).toBe(false);
    }
  });

  it('rejects a non-Bearer scheme', () => {
    const token = makeToken({ exp: future() });
    expect(guardBearerToken(`Basic ${token}`).ok).toBe(false);
  });

  it('rejects an expired token', () => {
    const result = guardBearerToken(`Bearer ${makeToken({ exp: past(), role: 'admin' })}`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(401);
  });

  it('rejects a token with no exp claim', () => {
    expect(guardBearerToken(`Bearer ${makeToken({ role: 'admin' })}`).ok).toBe(false);
  });

  it('rejects malformed tokens', () => {
    expect(guardBearerToken('Bearer aaa.!!!.ccc').ok).toBe(false);
    expect(guardBearerToken('Bearer onlyonepart').ok).toBe(false);
    expect(guardBearerToken('Bearer a..c').ok).toBe(false);
  });

  it('accepts a valid unexpired token', () => {
    const result = guardBearerToken(`Bearer ${makeToken({ exp: future(), user_id: 7, role: 'admin' })}`);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.user_id).toBe(7);
  });

  it('enforces a role only when asked', () => {
    const playerToken = makeToken({ exp: future(), role: 'player' });
    expect(guardBearerToken(`Bearer ${playerToken}`).ok).toBe(true);

    const strict = guardBearerToken(`Bearer ${playerToken}`, { requireRole: true });
    expect(strict.ok).toBe(false);
    if (!strict.ok) expect(strict.response.status).toBe(403);
  });

  it('accepts the operator roles the dashboard actually issues', () => {
    // `company` is the brand CSR role on bitslot/playltc/etc. — omitting it
    // was the prod "Insufficient permissions" chat-upload failure.
    for (const role of ['company', 'superadmin', 'agent', 'staff', 'manager', 'admin']) {
      expect(guardBearerToken(`Bearer ${makeToken({ exp: future(), role })}`, { requireRole: true }).ok).toBe(true);
    }
  });

  it('is case-insensitive on the role and the scheme', () => {
    const token = makeToken({ exp: future(), role: 'COMPANY' });
    expect(guardBearerToken(`bearer ${token}`, { requireRole: true }).ok).toBe(true);
  });

  it('accepts role from alternate JWT claim names', () => {
    expect(
      guardBearerToken(`Bearer ${makeToken({ exp: future(), user_role: 'company' })}`, {
        requireRole: true,
      }).ok,
    ).toBe(true);
    expect(
      guardBearerToken(`Bearer ${makeToken({ exp: future(), user_type: 'manager' })}`, {
        requireRole: true,
      }).ok,
    ).toBe(true);
  });

  it('allows requireRole when the JWT has no role claim (SimpleJWT default)', () => {
    // Prod tokens are often { user_id, exp, token_type, jti } only.
    expect(
      guardBearerToken(`Bearer ${makeToken({ exp: future(), user_id: 42 })}`, {
        requireRole: true,
      }).ok,
    ).toBe(true);
  });
});
