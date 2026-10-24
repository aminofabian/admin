import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '@/lib/api/auth';

const UUID = 'c0945d59-d796-402d-8bb5-d1b2029b9eea';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Internal Server Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('authApi.fetchProjectUuid', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the dashboard payload for a registered project', async () => {
    const payload = {
      data: { project_name: 'BitSlot', whitelabel_admin_uuid: UUID },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    await expect(authApi.fetchProjectUuid()).resolves.toEqual(payload);
  });

  it('rejects the ProjectX default project', async () => {
    const payload = {
      data: { project_name: 'ProjectX', whitelabel_admin_uuid: UUID },
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(payload));

    await expect(authApi.fetchProjectUuid()).rejects.toThrow(/No project found/);
  });

  it('rejects a non-OK response', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'nope' }, false, 500));

    await expect(authApi.fetchProjectUuid()).rejects.toThrow(
      /Failed to fetch project UUID/
    );
  });
});
