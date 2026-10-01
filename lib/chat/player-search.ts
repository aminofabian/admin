import type { ChatUser } from '@/types';

/**
 * Pure helpers for admin chat player search.
 *
 * Kept free of React and network concerns so the debounce gate, the client-side
 * pre-filter and the match highlighting all agree on what "the same query" means.
 */

/** Below this length a query matches too many players to be worth a backend round trip. */
export const PLAYER_SEARCH_MIN_LENGTH = 2;

/** Matches for a query older than this are re-fetched rather than served from memory. */
export const PLAYER_SEARCH_CACHE_TTL_MS = 60_000;

/** Upper bound on remembered queries, so a long session cannot grow without limit. */
export const PLAYER_SEARCH_CACHE_MAX_ENTRIES = 40;

/** Idle time after the last keystroke before a search is sent. */
export const PLAYER_SEARCH_DEBOUNCE_MS = 320;

/**
 * Canonical form of a search query. Two inputs that normalize to the same string
 * are the same search, which is what lets the cache and in-flight dedupe collapse
 * "Sam", "sam " and "  SAM" into a single request.
 */
export function normalizePlayerSearchQuery(
  raw: string | null | undefined,
): string {
  return (raw ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** A query is searchable once it is long enough to be selective. */
export function isSearchablePlayerQuery(
  normalizedQuery: string,
  minLength: number = PLAYER_SEARCH_MIN_LENGTH,
): boolean {
  return normalizedQuery.length >= minLength;
}

/**
 * True when the user has typed something, but not enough to search yet. Drives the
 * "type 1 more character" hint instead of firing a broad query.
 */
export function isPlayerSearchQueryTooShort(
  normalizedQuery: string,
  minLength: number = PLAYER_SEARCH_MIN_LENGTH,
): boolean {
  return normalizedQuery.length > 0 && normalizedQuery.length < minLength;
}

/**
 * Client-side match against an already-loaded player, so the list can respond on
 * the keystroke instead of after the network round trip.
 */
export function playerMatchesSearchQuery(
  player: ChatUser,
  normalizedQuery: string,
): boolean {
  if (!normalizedQuery) return true;

  const needle = normalizedQuery;

  if (player.username?.toLowerCase().includes(needle)) return true;
  if (player.fullName?.toLowerCase().includes(needle)) return true;
  if (player.email?.toLowerCase().includes(needle)) return true;
  if (player.phone?.includes(needle)) return true;

  // Numeric queries are ids: exact match first, then prefix so "364" finds 3648.
  if (/^\d+$/.test(needle)) {
    const id = String(player.user_id);
    if (id === needle || id.startsWith(needle)) return true;
  }

  return false;
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

/** Split `text` so the matched run can be emphasised in the result row. */
export function highlightSearchMatch(
  text: string,
  normalizedQuery: string,
): HighlightSegment[] {
  if (!text) return [];

  if (!normalizedQuery) return [{ text, matched: false }];

  const index = text.toLowerCase().indexOf(normalizedQuery);
  if (index === -1) return [{ text, matched: false }];

  return [
    { text: text.slice(0, index), matched: false },
    { text: text.slice(index, index + normalizedQuery.length), matched: true },
    { text: text.slice(index + normalizedQuery.length), matched: false },
  ].filter((segment) => segment.text.length > 0);
}

/** Matches a stable, short fingerprint of an auth token. Only used to partition
 * the search cache per admin so one operator never sees another's cached rows; it
 * is not a security boundary and never leaves the process. */
export function fingerprintSearchToken(token: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/**
 * True when a rejection is a cancellation rather than a failure.
 *
 * `AbortController` rejects with a `DOMException`, which is not an `Error`
 * instance in every runtime, so this goes by name instead of by prototype.
 */
export function isSearchAbortError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { name, code } = error as { name?: unknown; code?: unknown };
  return name === 'AbortError' || code === 'ABORT_ERR';
}

export function createSearchAbortError(): Error {
  return new DOMException('Player search aborted', 'AbortError');
}
