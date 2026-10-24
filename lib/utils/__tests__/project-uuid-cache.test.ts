import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_UUID_KEY } from '@/lib/constants/api';
import {
  PROJECT_UUID_CACHE_TTL_MS,
  PROJECT_UUID_MANUAL_TTL_MS,
  clearCachedProjectUuid,
  getStoredProjectUuid,
  isValidProjectUuid,
  readCachedProjectUuid,
  writeCachedProjectUuid,
} from '@/lib/utils/project-uuid';

const UUID = 'c0945d59-d796-402d-8bb5-d1b2029b9eea';
const HOST_KEY = 'whitelabel_admin_uuid_host';
const EXPIRES_AT_KEY = 'whitelabel_admin_uuid_expires_at';

describe('project UUID cache', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('validates canonical UUIDs', () => {
    expect(isValidProjectUuid(UUID)).toBe(true);
    expect(isValidProjectUuid(` ${UUID} `)).toBe(true);
    expect(isValidProjectUuid('not-a-uuid')).toBe(false);
    expect(isValidProjectUuid(undefined)).toBe(false);
  });

  it('returns a cached UUID for the same host before expiry', () => {
    writeCachedProjectUuid(UUID);

    expect(readCachedProjectUuid()).toBe(UUID);
    expect(getStoredProjectUuid()).toBe(UUID);
  });

  it('rejects a cached UUID from another host', () => {
    writeCachedProjectUuid(UUID);
    localStorage.setItem(HOST_KEY, 'other.example.com');

    expect(readCachedProjectUuid()).toBeNull();
  });

  it('rejects a legacy entry without host/expiry metadata', () => {
    localStorage.setItem(PROJECT_UUID_KEY, UUID);

    expect(readCachedProjectUuid()).toBeNull();
  });

  it('expires domain-derived UUIDs after the cache TTL', () => {
    writeCachedProjectUuid(UUID);

    vi.setSystemTime(Date.now() + PROJECT_UUID_CACHE_TTL_MS - 1);
    expect(readCachedProjectUuid()).toBe(UUID);

    vi.setSystemTime(Date.now() + 2);
    expect(readCachedProjectUuid()).toBeNull();
  });

  it('keeps manually entered UUIDs for the longer manual TTL', () => {
    writeCachedProjectUuid(UUID, { ttlMs: PROJECT_UUID_MANUAL_TTL_MS });

    vi.setSystemTime(Date.now() + PROJECT_UUID_CACHE_TTL_MS + 1);
    expect(readCachedProjectUuid()).toBe(UUID);

    vi.setSystemTime(Date.now() + PROJECT_UUID_MANUAL_TTL_MS);
    expect(readCachedProjectUuid()).toBeNull();
  });

  it('does not cache malformed UUIDs', () => {
    writeCachedProjectUuid('not-a-uuid');

    expect(localStorage.getItem(PROJECT_UUID_KEY)).toBeNull();
    expect(readCachedProjectUuid()).toBeNull();
  });

  it('clears all cache metadata', () => {
    writeCachedProjectUuid(UUID);
    clearCachedProjectUuid();

    expect(localStorage.getItem(PROJECT_UUID_KEY)).toBeNull();
    expect(localStorage.getItem(HOST_KEY)).toBeNull();
    expect(localStorage.getItem(EXPIRES_AT_KEY)).toBeNull();
  });
});
