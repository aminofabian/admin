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
