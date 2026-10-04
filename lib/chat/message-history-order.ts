/**
 * History page ordering contract (frontend ↔ Django `recent_messages`):
 *
 * - Page 1 is the **newest** window of messages.
 * - Higher pages are **older** (loaded via prepend when the agent scrolls up).
 * - Within a page the API typically returns newest-first; we reverse to
 *   chronological (oldest → newest) for chat UI rendering.
 *
 * If page 1 ever starts returning the oldest messages instead, reload will
 * show the beginning of the thread. Keep this module's tests green and
 * verify with a live page=1 vs page=2 `sent_time` compare when debugging.
 */

export type HistoryMergeMode = 'replace' | 'prepend';

export type TimedChatMessage = {
  id: string;
  timestamp: string;
};

/** Reverse API page order into chronological ascending for the transcript. */
export function chronologicalFromApiPage<T>(rawNewestFirst: T[]): T[] {
  return [...rawNewestFirst].reverse();
}

export function mergeMessageLists<T extends TimedChatMessage>(
  incoming: T[],
  existing: T[],
  mode: HistoryMergeMode,
): T[] {
  const combined = mode === 'prepend' ? [...incoming, ...existing] : incoming;
  const deduped = new Map<string, T>();

  for (const message of combined) {
    if (deduped.has(message.id)) continue;
    deduped.set(message.id, message);
  }

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    if (!Number.isFinite(leftTime) && !Number.isFinite(rightTime)) return 0;
    if (!Number.isFinite(leftTime)) return 1;
    if (!Number.isFinite(rightTime)) return -1;
    return leftTime - rightTime;
  });
}

/**
 * True when the newest timestamp on page A is still older than the newest on
 * page B — a sign that pagination may be inverted (page 1 = oldest).
 */
export function looksLikeOldestFirstPagination(
  page1Chronological: TimedChatMessage[],
  page2Chronological: TimedChatMessage[],
): boolean {
  if (page1Chronological.length === 0 || page2Chronological.length === 0) {
    return false;
  }
  const newestPage1 = new Date(
    page1Chronological[page1Chronological.length - 1].timestamp,
  ).getTime();
  const newestPage2 = new Date(
    page2Chronological[page2Chronological.length - 1].timestamp,
  ).getTime();
  if (!Number.isFinite(newestPage1) || !Number.isFinite(newestPage2)) {
    return false;
  }
  return newestPage1 < newestPage2;
}
