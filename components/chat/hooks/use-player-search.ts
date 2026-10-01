'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PLAYER_SEARCH_CACHE_MAX_ENTRIES,
  PLAYER_SEARCH_CACHE_TTL_MS,
  PLAYER_SEARCH_DEBOUNCE_MS,
  PLAYER_SEARCH_MIN_LENGTH,
  isPlayerSearchQueryTooShort,
  isSearchAbortError,
  isSearchablePlayerQuery,
  normalizePlayerSearchQuery,
} from '@/lib/chat/player-search';

export type PlayerSearchStatus = 'idle' | 'too-short' | 'loading' | 'ready' | 'error';

export interface UsePlayerSearchResult<T> {
  /** Rows for the most recently completed query. */
  results: T[];
  /** Normalized query `results` belong to; `''` before the first search. */
  resultsQuery: string;
  status: PlayerSearchStatus;
  /** True while a debounced request is in flight for the current query. */
  isLoading: boolean;
  /**
   * True when `results` are from an earlier query and a newer one is still
   * loading. Lets the UI keep rows on screen instead of flashing an empty list.
   */
  isStale: boolean;
  /** Normalized query currently typed. */
  normalizedQuery: string;
  /** Characters still needed before a search is sent. */
  charactersRemaining: number;
  error: string | null;
}

type CacheEntry<T> = { value: T[]; expiresAt: number };

/**
 * Session-scoped result cache, shared by every consumer of this hook. Repeat
 * queries (backspacing, re-opening a conversation) resolve without a request.
 */
const resultsCache = new Map<string, CacheEntry<unknown>>();

function readCache<T>(key: string): T[] | null {
  const hit = resultsCache.get(key) as CacheEntry<T> | undefined;
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    resultsCache.delete(key);
    return null;
  }
  // Refresh recency so the Map's insertion order approximates LRU.
  resultsCache.delete(key);
  resultsCache.set(key, hit as CacheEntry<unknown>);
  return hit.value;
}

function writeCache<T>(key: string, value: T[]) {
  resultsCache.delete(key);
  resultsCache.set(key, { value, expiresAt: Date.now() + PLAYER_SEARCH_CACHE_TTL_MS });
  while (resultsCache.size > PLAYER_SEARCH_CACHE_MAX_ENTRIES) {
    const oldest = resultsCache.keys().next();
    if (oldest.done) break;
    resultsCache.delete(oldest.value);
  }
}

/** Exposed for tests; also handy when a signed-in session should start clean. */
export function clearPlayerSearchCache() {
  resultsCache.clear();
}

export interface UsePlayerSearchOptions<T> {
  /** Raw text from the search input. */
  query: string;
  /** Performs the request. Receives an AbortSignal tied to the current query. */
  fetcher: (normalizedQuery: string, signal: AbortSignal) => Promise<T[]>;
  /** Extra key material so cached rows are not shared between identities. */
  cacheScope?: string;
  minLength?: number;
  debounceMs?: number;
  /** Called once per genuinely failed query (never for aborts or cache hits). */
  onError?: (message: string) => void;
}

/**
 * Debounced, cached, cancellable search state for the player list.
 *
 * Behaviour that matters for feel:
 *  - nothing is sent until the query is long enough to be selective,
 *  - an identical query within the TTL resolves from memory with no request,
 *  - superseded and abandoned requests are aborted, and
 *  - previously loaded rows stay visible (`isStale`) instead of the list
 *    collapsing to empty while the network catches up.
 */
export function usePlayerSearch<T>({
  query,
  fetcher,
  cacheScope = '',
  minLength = PLAYER_SEARCH_MIN_LENGTH,
  debounceMs = PLAYER_SEARCH_DEBOUNCE_MS,
  onError,
}: UsePlayerSearchOptions<T>): UsePlayerSearchResult<T> {
  const normalizedQuery = normalizePlayerSearchQuery(query);

  const [results, setResults] = useState<T[]>([]);
  const [resultsQuery, setResultsQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against a slow response for an old query overwriting a newer one.
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the latest callbacks without making them effect dependencies, so a
  // caller passing an inline arrow does not restart the debounce every render.
  const fetcherRef = useRef(fetcher);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    fetcherRef.current = fetcher;
    onErrorRef.current = onError;
  });

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const isCurrent = () => requestIdRef.current === requestId;

    if (!normalizedQuery) {
      cancel();
      setResults([]);
      setResultsQuery('');
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!isSearchablePlayerQuery(normalizedQuery, minLength)) {
      cancel();
      setResults([]);
      setResultsQuery('');
      setIsLoading(false);
      setError(null);
      return;
    }

    const cacheKey = `${cacheScope}:${normalizedQuery}`;
    const cached = readCache<T>(cacheKey);
    if (cached) {
      cancel();
      setResults(cached);
      setResultsQuery(normalizedQuery);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;

      void (async () => {
        try {
          const rows = await fetcherRef.current(normalizedQuery, controller.signal);

          if (controller.signal.aborted || !isCurrent()) return;

          writeCache(cacheKey, rows);
          setResults(rows);
          setResultsQuery(normalizedQuery);
          setIsLoading(false);
          setError(null);
        } catch (caught) {
          // Aborted means the user moved on; not a failure worth reporting.
          if (isSearchAbortError(caught) || !isCurrent()) return;

          setResults([]);
          setResultsQuery(normalizedQuery);
          setIsLoading(false);
          const message = caught instanceof Error ? caught.message : 'Search failed';
          setError(message);
          onErrorRef.current?.(message);
        }
      })();
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      cancel();
    };
  }, [normalizedQuery, cacheScope, minLength, debounceMs, cancel]);

  useEffect(() => cancel, [cancel]);

  const isStale = isLoading && resultsQuery !== '' && resultsQuery !== normalizedQuery;

  return {
    results,
    resultsQuery,
    status: !normalizedQuery
      ? 'idle'
      : isPlayerSearchQueryTooShort(normalizedQuery, minLength)
        ? 'too-short'
        : error && !isLoading
          ? 'error'
          : isLoading
            ? 'loading'
            : 'ready',
    isLoading,
    isStale,
    normalizedQuery,
    charactersRemaining: Math.max(0, minLength - normalizedQuery.length),
    error,
  };
}
