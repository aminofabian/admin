import { isValidTimestamp } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';
import { firstSafeChatroomId } from './safe-chatroom-id';

/**
 * Build the rows rendered by the Online tab.
 *
 * Online membership reaches the client from three places: the chat-list
 * socket's live rows, the REST online-players fetch, and the `isOnline` flags
 * merged into the chat list. The socket is authoritative for the rows it
 * carries, but it is not a complete directory — a single `re_arrange` (for
 * example the read receipt emitted when an agent opens a conversation) can
 * populate it with one row. Unioning the sources keeps that partial traffic
 * from hiding the rest of the online players; replacing the list made the
 * "3 ONLINE" count (server total) render a single row.
 */
export function mergeOnlinePlayerRows({
  socketRows,
  restRows,
  chatListRows,
  excludeUserIds,
}: {
  /** Rows from the chat-list socket (`online` seed / `re_arrange`). */
  socketRows: ChatUser[];
  /** Rows from the REST online-players fetch. */
  restRows: ChatUser[];
  /** Rows from the merged chat list; only `isOnline` ones are considered. */
  chatListRows: ChatUser[];
  /** Players the socket has since marked offline. A stale REST row must not bring them back. */
  excludeUserIds?: ReadonlySet<number>;
}): ChatUser[] {
  const restById = new Map<number, ChatUser>();
  for (const row of restRows) {
    if (row.user_id > 0 && row.isOnline !== false) restById.set(row.user_id, row);
  }

  const seen = new Map<number, ChatUser>();
  const order: number[] = [];

  /** Add once; `detail` (REST) supplies fields the realtime row omitted. */
  const add = (player: ChatUser, detail?: ChatUser) => {
    if (!(player.user_id > 0) || seen.has(player.user_id)) return;
    if (player.isOnline === false) return;
    if (excludeUserIds?.has(player.user_id)) return;

    seen.set(
      player.user_id,
      detail
        ? {
            ...detail,
            ...player,
            id:
              firstSafeChatroomId(player.user_id, player.id, detail.id) ??
              detail.id,
            lastMessage: player.lastMessage || detail.lastMessage,
            lastMessageTime: isValidTimestamp(player.lastMessageTime)
              ? player.lastMessageTime
              : detail.lastMessageTime,
            unreadCount: player.unreadCount ?? detail.unreadCount ?? 0,
            isOnline: true,
            notes: player.notes || detail.notes,
          }
        : player,
    );
    order.push(player.user_id);
  };

  // Socket rows lead: they carry presence and the server's ordering.
  for (const player of socketRows) {
    add(player, restById.get(player.user_id));
  }

  // REST rows the socket has not reported yet. Explicitly offline rows are skipped.
  for (const player of restRows) {
    if (player.isOnline === false) continue;
    add(player);
  }

  // Last resort: online flags merged into the chat list.
  for (const player of chatListRows) {
    if (player.isOnline) add(player);
  }

  return order.map((userId) => seen.get(userId)!);
}

/** How long a "just came online" mark blocks a lagging snapshot from dropping that player. */
export const ONLINE_PRESENCE_PROTECT_MS = 8000;

/** Player ids marked online within the protection window. */
export function recentOnlineUserIds(
  markedAt: Iterable<[number, number]>,
  now: number,
  protectMs = ONLINE_PRESENCE_PROTECT_MS,
): number[] {
  const ids: number[] = [];
  for (const [id, at] of markedAt) {
    if (Number.isFinite(id) && id > 0 && now - at <= protectMs) ids.push(id);
  }
  return ids;
}

/**
 * Ids to keep after a REST online snapshot.
 *
 * Null means the snapshot is not the census yet: its own
 * `online_players_count` disagrees with the socket, the ids do not cover
 * that count, or a player who just came online is missing. Applying it
 * would drop that player and put back whoever left.
 */
export function trustedOnlineSnapshotIds({
  snapshotIds,
  snapshotCount,
  socketCount,
  protectedIds,
}: {
  snapshotIds: readonly number[];
  snapshotCount: number | null;
  socketCount: number;
  protectedIds: readonly number[];
}): number[] | null {
  if (snapshotCount == null || snapshotCount !== socketCount) return null;
  const keep = new Set<number>();
  for (const id of snapshotIds) {
    if (Number.isFinite(id) && id > 0) keep.add(id);
  }
  if (keep.size !== socketCount) return null;
  for (const id of protectedIds) {
    if (Number.isFinite(id) && id > 0 && !keep.has(id)) return null;
  }
  return [...keep];
}
