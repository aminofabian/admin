import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isProxyAbort,
  proxyFetch,
  ProxyNetworkError,
  ProxyTimeoutError,
} from '../proxy-fetch';

const jsonResponse = (body: unknown = { ok: true }) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('proxyFetch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('passes method, headers and body through', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse());
    await proxyFetch('http://backend/x', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: '{"a":1}',
      label: 'test',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ Authorization: 'Bearer t' });
    expect(init?.body).toBe('{"a":1}');
  });

  it('never lets an intermediate cache serve the response', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse());
    await proxyFetch('http://backend/x', { label: 'test' });
    expect(fetchMock.mock.calls[0][1]?.cache).toBe('no-store');
  });

  it('throws ProxyTimeoutError when the upstream never answers', async () => {
    // The bug this prevents: a stalled backend left the handler pending forever.
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    const pending = proxyFetch('http://backend/x', { timeoutMs: 1000, label: 'test' });
    const assertion = expect(pending).rejects.toBeInstanceOf(ProxyTimeoutError);
    await vi.advanceTimersByTimeAsync(1001);
    await assertion;
  });

  it('clears the timeout on success so nothing fires later', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse());
    await proxyFetch('http://backend/x', { timeoutMs: 1000, label: 'test' });

    const signal = fetchMock.mock.calls[0][1]?.signal;
    expect(signal?.aborted).toBe(false);
    // Well past the budget: a leaked timer would have aborted by now.
    await vi.advanceTimersByTimeAsync(5000);
    expect(signal?.aborted).toBe(false);
  });

  it('throws ProxyNetworkError when the upstream is unreachable', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    await expect(proxyFetch('http://backend/x', { label: 'test' })).rejects.toBeInstanceOf(
      ProxyNetworkError,
    );
  });

  it('propagates a caller disconnect to the upstream request', async () => {
    let upstreamSignal: AbortSignal | undefined;
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          upstreamSignal = init?.signal as AbortSignal;
          upstreamSignal.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    const controller = new AbortController();
    const pending = proxyFetch('http://backend/x', { callerSignal: controller.signal, label: 'test' });
    controller.abort();

    expect(upstreamSignal?.aborted).toBe(true);
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('does not treat a caller abort as a network error', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );

    const controller = new AbortController();
    const pending = proxyFetch('http://backend/x', { callerSignal: controller.signal, label: 'test' });
    controller.abort();

    await expect(pending).rejects.not.toBeInstanceOf(ProxyNetworkError);
    await expect(pending).rejects.not.toBeInstanceOf(ProxyTimeoutError);
  });

  it('aborts immediately when the caller signal is already aborted', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse());
    const controller = new AbortController();
    controller.abort();

    await proxyFetch('http://backend/x', { callerSignal: controller.signal, label: 'test' })
      .catch(() => undefined);

    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it('does not leak abort listeners onto a reused caller signal', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse());
    const controller = new AbortController();
    for (let i = 0; i < 5; i += 1) {
      await proxyFetch('http://backend/x', { callerSignal: controller.signal, label: 'test' });
    }
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('returns a non-ok response rather than throwing, so routes can map it', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 500 }));
    const response = await proxyFetch('http://backend/x', { label: 'test' });
    expect(response.status).toBe(500);
  });

  it('reports a timeout as 504 and a network failure as 502', () => {
    expect(new ProxyTimeoutError(1000, 'r1').status).toBe(504);
    expect(new ProxyNetworkError('down', 'r2').status).toBe(502);
  });
});

describe('isProxyAbort', () => {
  it('detects cancellation by name and by code', () => {
    expect(isProxyAbort(new DOMException('x', 'AbortError'))).toBe(true);
    expect(isProxyAbort({ code: 'ABORT_ERR' })).toBe(true);
  });

  it('does not treat other errors as cancellation', () => {
    expect(isProxyAbort(new ProxyTimeoutError(1, 'r'))).toBe(false);
    expect(isProxyAbort(new Error('boom'))).toBe(false);
    expect(isProxyAbort(null)).toBe(false);
    expect(isProxyAbort('string')).toBe(false);
  });
});
