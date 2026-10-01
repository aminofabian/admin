import {
  createSearchAbortError,
  PLAYER_SEARCH_CACHE_MAX_ENTRIES,
  PLAYER_SEARCH_CACHE_TTL_MS,
} from './player-search';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type InFlight<T> = {
  key: string;
  promise: Promise<T>;
  controller: AbortController;
  /** Callers still interested in this lookup. */
  waiters: number;
  settled: boolean;
};

export type PlayerSearchCacheStats = {
  /** Requests served from a warm cache entry; no backend call. */
  cacheHits: number;
  /** Requests that joined an identical in-flight lookup; no second backend call. */
  coalescedHits: number;
  /** Requests that actually reached the backend. */
  backendCalls: number;
  /** In-flight lookups cancelled upstream because every caller detached. */
  abortedLookups: number;
};

/**
 * Short-lived cache + in-flight coalescer for admin chat player search.
 *
 * The browser debounces keystrokes, but a proxy route still fans out to the
 * backend once per debounce window, and a burst of typing can produce several
 * near-identical lookups. This collapses:
 *
 *  - a repeated query inside the TTL into a single backend call,
 *  - concurrent identical queries into one shared promise, and
 *  - a lookup whose every caller has gone away into an aborted upstream request.
 *
 * Keys include the caller's token fingerprint, so rows are never shared across
 * operators.
 */
export function createPlayerSearchCache<T>() {
  const cache = new Map<string, CacheEntry<T>>();
  const inFlight = new Map<string, InFlight<T>>();
  const stats: PlayerSearchCacheStats = {
    cacheHits: 0,
    coalescedHits: 0,
    backendCalls: 0,
    abortedLookups: 0,
  };

  function remember(key: string, value: T, now: number) {
    // Re-insert so the Map's insertion order doubles as a cheap LRU.
    cache.delete(key);
    cache.set(key, { value, expiresAt: now + PLAYER_SEARCH_CACHE_TTL_MS });

    for (const [cachedKey, entry] of cache) {
      if (entry.expiresAt <= now) cache.delete(cachedKey);
    }

    while (cache.size > PLAYER_SEARCH_CACHE_MAX_ENTRIES) {
      const oldest = cache.keys().next();
      if (oldest.done) break;
      cache.delete(oldest.value);
    }
  }

  /**
   * Detach one caller. When the last waiter leaves before the lookup settles,
   * the upstream request is aborted so an abandoned search stops occupying a
   * backend worker instead of running to completion unobserved.
   */
  function release(entry: InFlight<T>) {
    if (entry.settled) return;
    entry.waiters -= 1;
    if (entry.waiters > 0) return;
    if (inFlight.get(entry.key) === entry) inFlight.delete(entry.key);
    entry.controller.abort();
    stats.abortedLookups += 1;
  }

  function start(key: string, fetcher: (signal: AbortSignal) => Promise<T>): InFlight<T> {
    const controller = new AbortController();
    const entry: InFlight<T> = {
      key,
      controller,
      waiters: 0,
      settled: false,
      promise: undefined as unknown as Promise<T>,
    };

    entry.promise = fetcher(controller.signal).then(
      (value) => {
        entry.settled = true;
        if (inFlight.get(key) === entry) inFlight.delete(key);
        remember(key, value, Date.now());
        return value;
      },
      (error) => {
        entry.settled = true;
        if (inFlight.get(key) === entry) inFlight.delete(key);
        throw error;
      },
    );

    // Every awaiting caller receives the rejection; this guard only stops Node
    // from reporting one if all of them detach before it settles.
    void entry.promise.catch(() => {});

    inFlight.set(key, entry);
    stats.backendCalls += 1;
    return entry;
  }

  /**
   * Resolve `key` via `fetcher`, reusing a warm entry or an identical in-flight
   * lookup when possible.
   *
   * `callerSignal` lets one caller walk away (browser abort, navigation). The
   * shared upstream request is only cancelled once every caller has.
   */
  function resolve(
    key: string,
    fetcher: (signal: AbortSignal) => Promise<T>,
    callerSignal?: AbortSignal,
  ): Promise<T> {
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      stats.cacheHits += 1;
      return Promise.resolve(cached.value);
    }

    let entry = inFlight.get(key);
    if (entry) {
      stats.coalescedHits += 1;
    } else {
      entry = start(key, fetcher);
    }

    entry.waiters += 1;

    let detached = false;
    const detach = () => {
      if (detached) return;
      detached = true;
      release(entry);
    };

    if (callerSignal) {
      if (callerSignal.aborted) {
        detach();
        return Promise.reject(createSearchAbortError());
      }
      callerSignal.addEventListener('abort', detach, { once: true });
    }

    return entry.promise.finally(detach);
  }

  function clear() {
    cache.clear();
    for (const entry of inFlight.values()) {
      entry.settled = true;
      entry.controller.abort();
    }
    inFlight.clear();
  }

  return { resolve, clear, stats, size: () => cache.size };
}

export type PlayerSearchCache<T> = ReturnType<typeof createPlayerSearchCache<T>>;
