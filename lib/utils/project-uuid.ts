import { PROJECT_UUID_KEY } from '@/lib/constants/api';
import { USER_ROLES, type UserRole } from '@/lib/constants/roles';
import { storage } from '@/lib/utils/storage';

const PROJECT_UUID_HOST_KEY = 'whitelabel_admin_uuid_host';
const PROJECT_UUID_EXPIRES_AT_KEY = 'whitelabel_admin_uuid_expires_at';

/** Domain-derived UUIDs are re-resolved after this window. */
export const PROJECT_UUID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Manually entered UUIDs (e.g. on a superadmin domain) live longer. */
export const PROJECT_UUID_MANUAL_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProjectUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

function getCurrentHostname(): string | null {
  if (typeof window === 'undefined') return null;
  return window.location.hostname.toLowerCase();
}

/** Extract a project UUID from a loosely-typed company / settings payload. */
export function extractProjectUuid(source: unknown): string | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as Record<string, unknown>;
  const candidates = [
    record.whitelabel_admin_uuid,
    record.project_uuid,
    record.uuid,
  ];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Persist the project UUID with host + expiry metadata. */
export function writeCachedProjectUuid(
  uuid: string,
  options?: { ttlMs?: number }
): void {
  if (!isValidProjectUuid(uuid)) return;

  const hostname = getCurrentHostname();
  if (!hostname) return;

  const ttlMs = options?.ttlMs ?? PROJECT_UUID_CACHE_TTL_MS;
  storage.set(PROJECT_UUID_KEY, uuid.trim());
  storage.set(PROJECT_UUID_HOST_KEY, hostname);
  storage.set(PROJECT_UUID_EXPIRES_AT_KEY, String(Date.now() + ttlMs));
}

/**
 * Read the cached UUID only when it is well-formed, was cached for the current
 * host, and has not expired. Legacy entries without host/expiry metadata are
 * deliberately rejected so they get replaced by a domain-scoped lookup.
 */
export function readCachedProjectUuid(): string | null {
  const uuid = storage.get(PROJECT_UUID_KEY);
  if (!isValidProjectUuid(uuid)) return null;

  const hostname = getCurrentHostname();
  if (!hostname) return null;
  if (storage.get(PROJECT_UUID_HOST_KEY) !== hostname) return null;

  const expiresAt = Number(storage.get(PROJECT_UUID_EXPIRES_AT_KEY));
  if (!Number.isFinite(expiresAt) || Date.now() >= expiresAt) return null;

  return uuid.trim();
}

export function clearCachedProjectUuid(): void {
  storage.remove(PROJECT_UUID_KEY);
  storage.remove(PROJECT_UUID_HOST_KEY);
  storage.remove(PROJECT_UUID_EXPIRES_AT_KEY);
}

/** Stored UUID from login (company / staff sessions). */
export function getStoredProjectUuid(): string | undefined {
  return readCachedProjectUuid() ?? undefined;
}

/**
 * Build query/body scoping for email APIs.
 * Superadmin must pass an explicit UUID; other roles rely on JWT scope
 * (and may still forward the stored UUID when present).
 */
export function resolveEmailScopeUuid(options: {
  role?: UserRole;
  explicitUuid?: string | null;
}): string | undefined {
  const explicit = options.explicitUuid?.trim();
  if (explicit) return explicit;

  if (options.role === USER_ROLES.SUPERADMIN) {
    return undefined;
  }

  return getStoredProjectUuid();
}
