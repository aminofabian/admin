import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  PLAYER_SEARCH_MIN_LENGTH,
  fingerprintSearchToken,
  highlightSearchMatch,
  isPlayerSearchQueryTooShort,
  isSearchablePlayerQuery,
  normalizePlayerSearchQuery,
  playerMatchesSearchQuery,
} from '../player-search';
import { createPlayerSearchCache } from '../player-search-cache';
import type { ChatUser } from '@/types';

function makePlayer(overrides: Partial<ChatUser> = {}): ChatUser {
  return {
    id: '1',
    user_id: 3648,
    username: 'MattyG2108',
    email: 'matty@example.com',
    isOnline: true,
    ...overrides,
  };
}

describe('normalizePlayerSearchQuery', () => {
  it('treats casing, padding and inner whitespace as the same query', () => {
    expect(normalizePlayerSearchQuery('  Sam  ')).toBe('sam');
    expect(normalizePlayerSearchQuery('SAM')).toBe('sam');
    expect(normalizePlayerSearchQuery('bivera  smith')).toBe('bivera smith');
  });

  it('is safe with null and undefined', () => {
    expect(normalizePlayerSearchQuery(null)).toBe('');
    expect(normalizePlayerSearchQuery(undefined)).toBe('');
  });
});

describe('query length gate', () => {
  it('requires at least the minimum length before searching', () => {
    expect(isSearchablePlayerQuery('a')).toBe(false);
    expect(isSearchablePlayerQuery('ab')).toBe(true);
    expect(PLAYER_SEARCH_MIN_LENGTH).toBe(2);
  });

  it('flags a typed-but-too-short query so the UI can prompt instead of searching', () => {
    expect(isPlayerSearchQueryTooShort('a')).toBe(true);
    expect(isPlayerSearchQueryTooShort('')).toBe(false);
    expect(isPlayerSearchQueryTooShort('ab')).toBe(false);
  });
});

describe('playerMatchesSearchQuery', () => {
  it('matches username case-insensitively', () => {
    expect(playerMatchesSearchQuery(makePlayer(), 'matty')).toBe(true);
    expect(playerMatchesSearchQuery(makePlayer(), 'g2108')).toBe(true);
    expect(playerMatchesSearchQuery(makePlayer(), 'nope')).toBe(false);
  });

  it('matches on email, full name and phone', () => {
    expect(playerMatchesSearchQuery(makePlayer(), 'example.com')).toBe(true);
    expect(
      playerMatchesSearchQuery(makePlayer({ fullName: 'Bivera Smith' }), 'smith'),
    ).toBe(true);
    expect(
      playerMatchesSearchQuery(makePlayer({ phone: '+9779812345678' }), '98123'),
    ).toBe(true);
  });

  it('matches a numeric query against both the username and the player id', () => {
    expect(playerMatchesSearchQuery(makePlayer(), '3648')).toBe(true);
    expect(playerMatchesSearchQuery(makePlayer(), '364')).toBe(true);
    expect(playerMatchesSearchQuery(makePlayer(), '648')).toBe(false);
    // Digits inside a username are still a legitimate match.
    expect(playerMatchesSearchQuery(makePlayer({ username: 'player1234' }), '1234')).toBe(
      true,
    );
  });
});

describe('highlightSearchMatch', () => {
  it('splits out the matched run and omits empty segments', () => {
    expect(highlightSearchMatch('MattyG2108', 'matty')).toEqual([
      { text: 'Matty', matched: true },
      { text: 'G2108', matched: false },
    ]);
  });

  it('drops empty segments and handles no match', () => {
    expect(highlightSearchMatch('abc', 'zz')).toEqual([{ text: 'abc', matched: false }]);
    expect(highlightSearchMatch('Sam', 'sam')).toEqual([
      { text: 'Sam', matched: true },
    ]);
  });
});

describe('fingerprintSearchToken', () => {
  it('is stable and differs per token', () => {
    expect(fingerprintSearchToken('token-a')).toBe(fingerprintSearchToken('token-a'));
    expect(fingerprintSearchToken('token-a')).not.toBe(fingerprintSearchToken('token-b'));
  });
});

describe('createPlayerSearchCache', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('serves a repeat query from cache without a second backend call', async () => {
    const cache = createPlayerSearchCache<string[]>();
    const fetcher = vi.fn(async () => ['row']);

    await cache.resolve('k', fetcher);
    await cache.resolve('k', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.stats.backendCalls).toBe(1);
    expect(cache.stats.cacheHits).toBe(1);
  });

  it('collapses concurrent identical queries into one backend call', async () => {
    const cache = createPlayerSearchCache<string[]>();
    let release!: (value: string[]) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          release = resolve;
        }),
    );

    const first = cache.resolve('k', fetcher);
    const second = cache.resolve('k', fetcher);
    const third = cache.resolve('k', fetcher);

    release(['row']);

    expect(await first).toEqual(['row']);
    expect(await second).toEqual(['row']);
    expect(await third).toEqual(['row']);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cache.stats.coalescedHits).toBe(2);
    expect(cache.stats.backendCalls).toBe(1);
  });

  it('keeps upstream work alive while another caller is still waiting', async () => {
    const cache = createPlayerSearchCache<string[]>();
    let signal!: AbortSignal;
    let release!: (value: string[]) => void;
    const fetcher = vi.fn((s: AbortSignal) => {
      signal = s;
      return new Promise<string[]>((resolve) => {
        release = resolve;
      });
    });

    const leaving = new AbortController();
    void cache.resolve('k', fetcher, leaving.signal).catch(() => {});
    const staying = cache.resolve('k', fetcher);

    // One caller walking away must not cancel a request another caller awaits.
    leaving.abort();
    expect(signal.aborted).toBe(false);
    expect(cache.stats.abortedLookups).toBe(0);

    release(['row']);
    expect(await staying).toEqual(['row']);
  });

  it('aborts upstream once every caller has detached', async () => {
    const cache = createPlayerSearchCache<string[]>();
    let signal!: AbortSignal;
    const fetcher = vi.fn(
      (s: AbortSignal) =>
        new Promise<string[]>(() => {
          signal = s;
        }),
    );

    const controller = new AbortController();
    void cache.resolve('k', fetcher, controller.signal).catch(() => {});

    // The fetcher runs synchronously up to the pending promise.
    expect(signal.aborted).toBe(false);
    controller.abort();

    expect(signal.aborted).toBe(true);
    expect(cache.stats.abortedLookups).toBe(1);
  });

  it('does not cache a failed lookup', async () => {
    const cache = createPlayerSearchCache<string[]>();
    const fetcher = vi
      .fn<(signal: AbortSignal) => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(['row']);

    await expect(cache.resolve('k', fetcher)).rejects.toThrow('boom');
    expect(await cache.resolve('k', fetcher)).toEqual(['row']);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('re-fetches once the entry has expired', async () => {
    vi.useFakeTimers();
    const cache = createPlayerSearchCache<string[]>();
    const fetcher = vi.fn(async () => ['row']);

    await cache.resolve('k', fetcher);
    vi.advanceTimersByTime(61_000);
    await cache.resolve('k', fetcher);

    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
