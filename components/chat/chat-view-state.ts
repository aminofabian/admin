/**
 * Remembers the chat console's last sidebar view across a page reload.
 *
 * Selecting a player writes `?playerId=` into the URL. On reload the component
 * has no in-memory record of how that URL was produced, so the deep-link
 * resolver used to assume an external link and force the All Players tab. The
 * stored view lets a reload restore the tab the agent was actually using,
 * while a URL naming a different player still counts as a real deep link.
 *
 * `sessionStorage` (not `localStorage`) keeps this per browser tab: sharing a
 * conversation link in a new tab must still behave like a deep link.
 */

export type ChatTab = 'online' | 'all-chats' | 'unreplied';

export interface ChatViewSnapshot {
  tab: ChatTab;
  /** Player the stored URL described when the view was saved. */
  playerId: number | null;
}

const STORAGE_KEY = 'chat:lastView';

const isChatTab = (value: unknown): value is ChatTab =>
  value === 'online' || value === 'all-chats' || value === 'unreplied';

export function readLastChatView(): ChatViewSnapshot | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<ChatViewSnapshot> | null;
    if (!parsed || !isChatTab(parsed.tab)) return null;

    const playerId = Number(parsed.playerId);
    return {
      tab: parsed.tab,
      playerId: Number.isFinite(playerId) && playerId > 0 ? playerId : null,
    };
  } catch {
    // Private mode / corrupted entry: treat as "nothing stored".
    return null;
  }
}

export function writeLastChatView(view: ChatViewSnapshot): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(view));
  } catch {
    // Storage can be unavailable (quota/private mode); the view is a nicety.
  }
}

/**
 * Pick the sidebar tab to show on first paint.
 *
 * Reloading the open conversation should land on the tab the agent was using.
 * A URL that names a *different* player (or any player with no stored view) is
 * treated as an external deep link and opens under All Players.
 */
export function resolveInitialChatTab(
  view: ChatViewSnapshot | null,
  urlPlayerId: number | null,
): ChatTab {
  if (urlPlayerId !== null && (!view || view.playerId !== urlPlayerId)) {
    return 'all-chats';
  }
  return view?.tab ?? 'online';
}

/**
 * Keep a deep-linked / off-page player visible on **All Players** only.
 *
 * Do not use this on Online or Unreplied: injecting the open conversation into
 * those filtered tabs made replied chats linger in Unreplied (count dropped,
 * row stayed) and offline/replied chats leak into Online on tab switch.
 */
export function ensureSelectedPlayerVisible<T extends { user_id: number }>(
  players: T[],
  selected: T | null | undefined,
): T[] {
  if (!selected?.user_id) return players;
  if (players.some((player) => player.user_id === selected.user_id)) {
    return players;
  }
  return [selected, ...players];
}

/**
 * Unreplied badge.
 *
 * A full socket census (`listLive`) owns the number, including 0 after the
 * last reply. Until that census arrives, the REST `unreplied_players_count`
 * stays put. The connect payload is often a recent-chat window with no
 * `is_unreplied` flag, so one partial row must not replace a count of 9
 * with 1, and an empty window must not replace it with 0.
 */
export function resolveUnrepliedBadgeCount(options: {
  unrepliedChatsLength: number;
  listLive: boolean;
  restCount: number | null;
  apiCount: number | null;
}): number | null {
  const { unrepliedChatsLength, listLive, restCount, apiCount } = options;
  if (listLive) {
    return unrepliedChatsLength;
  }
  const provisional = restCount ?? apiCount;
  if (provisional != null) {
    return provisional;
  }
  // No census and no REST total yet. A length of 0 here is "still loading",
  // not "nobody is waiting".
  return null;
}
