/**
 * Shared fetch helper for the chat proxy routes.
 *
 * Every proxy route talks to the same Django backend. Without a timeout, a
 * request that the backend accepts and then never answers (slow ORM query,
 * exhausted worker) leaves the Next.js handler pending forever: the client's
 * loading state sticks, and — because the chat list polls every 10s with no
 * in-flight guard — these accumulate one per poll per stuck admin until the
 * server's request slots are exhausted, taking down unrelated routes with them.
 *
 * This centralises the timeout, and keeps two conditions distinct:
 *
 *  - the **caller** disconnected (browser aborted, user typed another character)
 *    → nothing to answer, and the upstream request is already cancelled;
 *  - the **upstream** exceeded its budget → a real 504 the UI can show.
 */

export const DEFAULT_PROXY_TIMEOUT_MS = 30_000;

/** Error thrown when the upstream did not respond within the timeout budget. */
export class ProxyTimeoutError extends Error {
  readonly status = 504;
  readonly requestId: string;

  constructor(timeoutMs: number, requestId: string) {
    super(`Upstream did not respond within ${timeoutMs}ms`);
    this.name = 'ProxyTimeoutError';
    this.requestId = requestId;
  }
}

/** Error thrown when the upstream could not be reached at all. */
export class ProxyNetworkError extends Error {
  readonly status = 502;
  readonly requestId: string;

  constructor(message: string, requestId: string) {
    super(message);
    this.name = 'ProxyNetworkError';
    this.requestId = requestId;
  }
}

export type ProxyFetchOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
  timeoutMs?: number;
  /** Aborted when the browser hangs up, so the upstream call is cancelled too. */
  callerSignal?: AbortSignal;
  /** Prefix used in logs, e.g. `chat-messages`. */
  label: string;
};

/**
 * Fetch an upstream endpoint with a bounded budget.
 *
 * @throws {ProxyTimeoutError} when the upstream exceeds `timeoutMs`
 * @throws {ProxyNetworkError} when the upstream is unreachable
 */
export async function proxyFetch(
  url: string,
  {
    method = 'GET',
    headers,
    body,
    timeoutMs = DEFAULT_PROXY_TIMEOUT_MS,
    callerSignal,
    label,
  }: ProxyFetchOptions,
): Promise<Response> {
  const controller = new AbortController();
  const requestId = `px_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  // If the caller disconnects, stop waiting on the upstream as well.
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    return await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
      // Proxy responses are per-operator and short-lived; never let an
      // intermediate cache serve a stale or shared copy.
      cache: 'no-store',
    });
  } catch (error) {
    if (timedOut) {
      console.error(`[${label} ${requestId}] upstream timeout after ${timeoutMs}ms`);
      throw new ProxyTimeoutError(timeoutMs, requestId);
    }
    // A caller-initiated abort is not an upstream failure.
    if (callerSignal?.aborted) {
      throw error;
    }
    console.error(`[${label} ${requestId}] upstream unreachable:`, error);
    throw new ProxyNetworkError(
      error instanceof Error ? error.message : 'Unknown network error',
      requestId,
    );
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}

/** True when a rejection is a cancellation rather than a failure. */
export function isProxyAbort(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'AbortError' || code === 'ABORT_ERR';
}
