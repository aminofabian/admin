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
