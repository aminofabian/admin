import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { clearPlayerSearchCache, usePlayerSearch } from '../use-player-search';
import { PLAYER_SEARCH_DEBOUNCE_MS } from '@/lib/chat/player-search';

/** Advance past the debounce and let the resulting promise settle. */
async function flushDebounce(ms = 200) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe('usePlayerSearch', () => {
  beforeEach(() => {
    clearPlayerSearchCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const setup = (fetcher: (q: string, signal: AbortSignal) => Promise<string[]>) =>
    renderHook(
      ({ query }: { query: string }) =>
        usePlayerSearch<string>({ query, fetcher, debounceMs: 100 }),
      { initialProps: { query: '' } },
    );

  it('does not search below the minimum length', async () => {
    const fetcher = vi.fn(async () => ['row']);
    const { result, rerender } = setup(fetcher);

    rerender({ query: 'a' });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.status).toBe('too-short');
    expect(result.current.charactersRemaining).toBe(1);
  });

  it('debounces a burst of keystrokes into a single request', async () => {
    const fetcher = vi.fn(async () => ['row']);
    const { result, rerender } = setup(fetcher);

    for (const query of ['s', 'sa', 'sam']) {
      rerender({ query });
      await act(async () => {
        vi.advanceTimersByTime(50);
      });
    }

    await flushDebounce();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith('sam', expect.any(AbortSignal));
    expect(result.current.results).toEqual(['row']);
    expect(result.current.status).toBe('ready');
  });

  it('aborts the superseded request when the query changes mid-flight', async () => {
    const signals: AbortSignal[] = [];
    const fetcher = vi.fn((_query: string, signal: AbortSignal) => {
      signals.push(signal);
      return new Promise<string[]>(() => {});
    });

    const { rerender } = setup(fetcher);

    rerender({ query: 'sam' });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(signals).toHaveLength(1);

    rerender({ query: 'sammy' });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(signals).toHaveLength(2);
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });

  it('reuses a cached result when the same query is typed again', async () => {
    const fetcher = vi.fn(async () => ['row']);
    const { result, rerender } = setup(fetcher);

    rerender({ query: 'sam' });
    await flushDebounce();
    expect(result.current.results).toEqual(['row']);

    // Different casing normalizes to the same query.
    rerender({ query: '' });
    await flushDebounce();
    rerender({ query: 'SAM' });
    await flushDebounce();

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual(['row']);
  });

  it('keeps previous rows visible and flags them stale while loading', async () => {
    let releaseSecond!: (rows: string[]) => void;
    let call = 0;
    const fetcher = vi.fn(() => {
      call += 1;
      if (call === 1) return Promise.resolve(['first']);
      return new Promise<string[]>((resolve) => {
        releaseSecond = resolve;
      });
    });

    const { result, rerender } = setup(fetcher);

    rerender({ query: 'sam' });
    await flushDebounce();
    expect(result.current.results).toEqual(['first']);

    rerender({ query: 'sammy' });
    await flushDebounce();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isStale).toBe(true);
    // Rows are not blanked while the new query is in flight.
    expect(result.current.results).toEqual(['first']);

    await act(async () => {
      releaseSecond(['second']);
    });
    expect(result.current.results).toEqual(['second']);
    expect(result.current.isStale).toBe(false);
  });

  it('reports a failure once and exposes it', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn(async () => {
      throw new Error('backend exploded');
    });

    const { result } = renderHook(
      ({ query }: { query: string }) =>
        usePlayerSearch<string>({
          query,
          fetcher,
          debounceMs: 100,
          onError,
        }),
      { initialProps: { query: 'boom' } },
    );

    await flushDebounce();

    expect(result.current.status).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe('backend exploded');
  });

  it('does not report an aborted search as an error', async () => {
    const onError = vi.fn();
    const fetcher = vi.fn((_query: string, signal: AbortSignal) => {
      return new Promise<string[]>((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('aborted', 'AbortError')),
        );
      });
    });

    const { rerender } = renderHook(
      ({ query }: { query: string }) =>
        usePlayerSearch<string>({ query, fetcher, debounceMs: 100, onError }),
      { initialProps: { query: 'sam' } },
    );

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    rerender({ query: 'sammy' });
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('clears results when the query is emptied', async () => {
    const fetcher = vi.fn(async () => ['row']);
    const { result, rerender } = setup(fetcher);

    rerender({ query: 'sam' });
    await flushDebounce();
    expect(result.current.results).toEqual(['row']);

    rerender({ query: '' });
    await flushDebounce();

    expect(result.current.results).toEqual([]);
    expect(result.current.status).toBe('idle');
  });

  it('exposes a sensible default debounce', () => {
    expect(PLAYER_SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
  });
});
