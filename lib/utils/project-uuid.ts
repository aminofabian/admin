import { PROJECT_UUID_KEY } from '@/lib/constants/api';
import { USER_ROLES, type UserRole } from '@/lib/constants/roles';
import { storage } from '@/lib/utils/storage';

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

/** Stored UUID from login (company / staff sessions). */
export function getStoredProjectUuid(): string | undefined {
  const value = storage.get(PROJECT_UUID_KEY);
  return value && value.trim() ? value.trim() : undefined;
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
