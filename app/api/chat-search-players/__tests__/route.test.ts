import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from '@/app/api/chat-search-players/route';

/**
 * Minimal stand-in for NextRequest. The route only reads `nextUrl.searchParams`,
 * the Authorization header and `signal` for cancellation, so constructing a real
 * NextRequest (whose static `from` helper is unavailable here) is unnecessary.
 */
function buildRequest(query: string, token?: string, signal?: AbortSignal) {
  return {
    nextUrl: { searchParams: new URLSearchParams(query ? { query } : {}) },
    headers: {
      get: (name: string) =>
        name === 'Authorization' && token ? `Bearer ${token}` : null,
    },
    signal,
  } as unknown as Parameters<typeof GET>[0];
}

describe('GET /api/chat-search-players', () => {
  const backendUrl = 'http://backend.local';

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = backendUrl;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects an unauthenticated request without calling the backend', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');

    const response = await GET(buildRequest('sam'));

    expect(response.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers a one-character query locally instead of spending a backend request', async () => {
    const fetchMock = vi.spyOn(global, 'fetch');

    const response = await GET(buildRequest('s', 'token-1'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({ count: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards a search query and returns the backend payload', async () => {
    const payload = { status: 'ok', results: [{ username: 'sam' }] };
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    const response = await GET(buildRequest('sam', 'token-forward'));
    const data = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      `${backendUrl}/api/v1/admin/chat/?request_type=search_players&query=sam`,
    );
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer token-forward' });
    expect(init?.cache).toBe('no-store');
    expect(data).toEqual(payload);
  });

  it('serves a repeated query from cache without a second backend request', async () => {
    const payload = { status: 'ok', results: [{ username: 'sam' }] };
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));

    // Same token, same query (differing only in case and padding).
    await GET(buildRequest('sam', 'token-cache'));
    await GET(buildRequest('  SAM ', 'token-cache'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not share cached rows between different operators', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      // A fresh Response per call: a body can only be read once.
      .mockImplementation(async () =>
        new Response(JSON.stringify({ status: 'ok', results: [] }), { status: 200 }),
      );

    await GET(buildRequest('sam', 'token-operator-a'));
    await GET(buildRequest('sam', 'token-operator-b'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('collapses concurrent identical queries into one backend request', async () => {
    let release!: (value: Response) => void;
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve;
        }),
    );

    const inFlight = [
      GET(buildRequest('bivera', 'token-concurrent')),
      GET(buildRequest('bivera', 'token-concurrent')),
      GET(buildRequest('bivera', 'token-concurrent')),
    ];

    release(
      new Response(JSON.stringify({ status: 'ok', results: [] }), { status: 200 }),
    );
    await Promise.all(inFlight);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('aborts the upstream request when the caller disconnects', async () => {
    let upstreamSignal: AbortSignal | undefined;
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal as AbortSignal;
          upstreamSignal = signal;
          // Real fetch rejects with AbortError when the signal fires.
          signal.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    const controller = new AbortController();
    const pending = GET(buildRequest('ghost', 'token-abort', controller.signal));

    // Let the route reach the fetch call before disconnecting.
    await vi.waitFor(() => expect(upstreamSignal).toBeDefined());
    controller.abort();

    const response = await pending;

    expect(upstreamSignal?.aborted).toBe(true);
    expect(response.status).toBe(499);
  });

  it('maps a backend 401 to a re-login prompt', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('', { status: 401 }));

    const response = await GET(buildRequest('sam', 'token-expired'));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toMatchObject({
      status: 'error',
      message: 'Authentication required. Please re-login.',
    });
  });

  it('does not cache a failed lookup', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 500 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'ok', results: [] }), { status: 200 }),
      );

    const failed = await GET(buildRequest('retryable', 'token-retry'));
    expect(failed.status).toBe(500);

    const retried = await GET(buildRequest('retryable', 'token-retry'));
    expect(retried.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
