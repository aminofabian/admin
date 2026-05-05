import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

const buildRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) => {
  return new NextRequest('http://localhost/api/admin/game-operations/redeem', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

describe('POST /api/admin/game-operations/[operation]', () => {
  const backendUrl = 'http://backend.local';

  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_API_URL = backendUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 400 for unknown operation', async () => {
    const { POST } = await import('@/app/api/admin/game-operations/[operation]/route');
    const request = buildRequest({ player_id: 1, game_id: '2' });
    const response = await POST(request, { params: Promise.resolve({ operation: 'invalid-op' }) });
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toMatchObject({ status: 'error' });
    expect(data.message).toContain('Invalid');
  });

  it('forwards redeem to backend with auth', async () => {
    const { POST } = await import('@/app/api/admin/game-operations/[operation]/route');
    const mockResponse = { status: 'success', message: 'queued', player_id: 25 };
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(mockResponse), { status: 200 }));

    const request = buildRequest({ player_id: 25, game_id: '107' }, { Authorization: 'Bearer t' });
    const response = await POST(request, { params: Promise.resolve({ operation: 'redeem' }) });
    const data = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${backendUrl}/api/v1/admin/game-operations/redeem/`);
    expect(init?.method).toBe('POST');
    expect(JSON.parse((init?.body as string) ?? '{}')).toEqual({ player_id: 25, game_id: '107' });
    expect(response.status).toBe(200);
    expect(data).toEqual(mockResponse);
  });
});
