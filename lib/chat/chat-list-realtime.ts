import { isValidTimestamp } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';

/**
 * Pure list operations for the chat-list WebSocket (`/ws/chatlist/`).
 *
 * The Unreplied tab is driven entirely by the server's `is_unreplied` flag.
 * These helpers only move rows between the Online / Unreplied / All Players
 * lists; they never derive reply state from the last message sender, because
 * system/auto messages would make that guess wrong.
 */

export interface RealtimeChatFlags {
  /** `is_online` from the socket when the payload carried it. */
  isOnline?: boolean;
  /** `is_unreplied` from the socket when the payload carried it. */
  isUnreplied?: boolean;
}

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/** A row with no chatroom id and no player id cannot be rendered. */
export function isChatRowUsable(row: ChatUser): boolean {
  return (Number.isFinite(row.user_id) && row.user_id > 0) || row.id.length > 0;
}

export function chatRecencyMs(time: string | undefined): number {
  if (!isValidTimestamp(time)) return 0;
  const ms = Date.parse(time as string);
  return Number.isFinite(ms) ? ms : 0;
}

/** Keep the preview that belongs to the later timestamp. */
export function pickNewerPreview<T extends { lastMessage?: string; lastMessageTime?: string }>(
  current: T,
  incoming: { lastMessage?: string; lastMessageTime?: string },
): { lastMessage?: string; lastMessageTime?: string } {
  const currentMs = chatRecencyMs(current.lastMessageTime);
  const incomingMs = chatRecencyMs(incoming.lastMessageTime);
  if (incomingMs > currentMs) {
    return {
      lastMessage: incoming.lastMessage || current.lastMessage,
      lastMessageTime: incoming.lastMessageTime,
    };
  }
  return {
    lastMessage: current.lastMessage || incoming.lastMessage,
    lastMessageTime: current.lastMessageTime || incoming.lastMessageTime,
  };
}

/** Newest activity first. Rows with no timestamp stay at the bottom. */
export function sortChatsByRecency<
  T extends { lastMessageTime?: string; listOrderTime?: string },
>(rows: T[]): T[] {
  if (rows.length < 2) return rows;
  const orderMs = (row: T) => chatRecencyMs(row.listOrderTime || row.lastMessageTime);
  return [...rows].sort((a, b) => orderMs(b) - orderMs(a));
}

export function chatRowMatches(a: ChatUser, b: ChatUser): boolean {
  if (a.user_id > 0 && b.user_id > 0) {
    return a.user_id === b.user_id;
  }
  return a.id !== '' && a.id === b.id;
}

function withFlags(
  existing: ChatUser | undefined,
  row: ChatUser,
  flags: RealtimeChatFlags,
): ChatUser {
  return {
    ...row,
    isOnline: flags.isOnline ?? existing?.isOnline ?? row.isOnline,
    isUnreplied: flags.isUnreplied ?? existing?.isUnreplied ?? row.isUnreplied,
  };
}

/**
 * Merge a partial realtime row onto the row already in state.
 *
 * WebSocket payloads are partial: absent fields must not erase what the list
 * already knows (notably notes and the separate winnings bucket).
 */
export function mergeChatRow(existing: ChatUser, incoming: ChatUser): ChatUser {
  const nextTime = isValidTimestamp(incoming.lastMessageTime)
    ? incoming.lastMessageTime
    : existing.lastMessageTime;

  return {
    ...existing,
    ...incoming,
    id: incoming.id || existing.id,
    username:
      incoming.username && incoming.username !== 'Unknown'
        ? incoming.username
        : existing.username,
    lastMessage: incoming.lastMessage || existing.lastMessage,
    lastMessageTime: nextTime,
    // Opening a thread may correct the visible clock. That must not become
    // the sort key unless a list event (new activity) sets it.
    listOrderTime: existing.listOrderTime,
    unreadCount: incoming.unreadCount ?? existing.unreadCount,
    notes: incoming.notes || existing.notes,
    balance: incoming.balance ?? existing.balance,
    winningBalance: hasOwn(incoming, 'winningBalance')
      ? incoming.winningBalance
      : existing.winningBalance,
    cashoutLimit: incoming.cashoutLimit ?? existing.cashoutLimit,
    lockedBalance: incoming.lockedBalance ?? existing.lockedBalance,
    isUnreplied: incoming.isUnreplied ?? existing.isUnreplied,
    lastHumanMessageSenderId:
      incoming.lastHumanMessageSenderId ?? existing.lastHumanMessageSenderId,
  };
}

/**
 * Apply a realtime row, moving it to the top only for genuinely new activity.
 *
 * `re_arrange` also fires for read receipts and presence changes. Since a read
 * receipt can echo the last message (sometimes with a fresh timestamp), order
 * is decided by content and unread deltas alone — never by time. Rows that are
 * not already listed are only added when they carry new inbound activity.
 */
export function upsertChatRowByLatestMessage(
  list: ChatUser[],
  row: ChatUser,
  flags: RealtimeChatFlags = {},
): ChatUser[] {
  if (!isChatRowUsable(row)) return list;

  const index = list.findIndex((chat) => chatRowMatches(chat, row));

  // A row the list does not hold can only be a genuinely new chat. Anything
  // else (a read receipt for a chat we never listed) must not be pushed in at
  // the top.
  if (index === -1) {
    const isNewInbound =
      row.isUnreplied === true || (row.unreadCount ?? 0) > 0;
    if (!isNewInbound) return list;
    return [withFlags(undefined, row, flags), ...list];
  }

  const existing = list[index];
  const merged = mergeChatRow(existing, withFlags(existing, row, flags));

  // Order is decided by *new activity only*: new message content, or a rising
  // unread count. Timestamps are deliberately ignored — a read receipt can
  // echo the same message with a fresh stamp, and treating that as new
  // activity is what made the row jump the moment an agent opened it.
  const hasMessageText =
    typeof row.lastMessage === 'string' && row.lastMessage.length > 0;
  const textChanged =
    hasMessageText && row.lastMessage !== existing.lastMessage;
  const unreadIncreased =
    typeof row.unreadCount === 'number' &&
    typeof existing.unreadCount === 'number' &&
    row.unreadCount > existing.unreadCount;
  const stillUnread = (row.unreadCount ?? 0) > 0;

  // A content change only counts while the chat still carries unread
  // messages. A read receipt reports 0, so even a reformatted echo cannot
  // reorder the list.
  if (!unreadIncreased && !(textChanged && stillUnread)) {
    const next = [...list];
    // Keep the message's original time too: a read echo must not rewrite the
    // row's "last message" clock.
    next[index] = {
      ...merged,
      lastMessageTime: existing.lastMessageTime,
      lastMessage: existing.lastMessage,
    };
    return next;
  }

  return [
    { ...merged, listOrderTime: merged.lastMessageTime ?? existing.listOrderTime },
    ...list.filter((_, i) => i !== index),
  ];
}

/**
 * Apply a full snapshot without letting the server's ordering move rows the
 * agent is already looking at.
 *
 * Snapshots decide membership (a player who went offline leaves Online, a
 * replied chat leaves Unreplied) and carry fresh data, but the visible order
 * stays client-owned: rows keep their positions and genuinely new rows are
 * prepended. Without this, any snapshot the backend decides to reorder — for
 * example after a read — would reshuffle the list under the cursor.
 */
export function reconcileChatSnapshot(
  previous: ChatUser[],
  snapshot: ChatUser[],
): ChatUser[] {
  if (previous.length === 0) return snapshot;

  const keyOf = (chat: ChatUser) =>
    chat.user_id > 0 ? `u:${chat.user_id}` : `c:${chat.id}`;

  const remaining = new Map<string, ChatUser>();
  for (const row of snapshot) {
    if (!isChatRowUsable(row)) continue;
    remaining.set(keyOf(row), row);
  }

  const next: ChatUser[] = [];
  for (const row of previous) {
    const key = keyOf(row);
    const fresh = remaining.get(key);
    if (!fresh) continue;
    remaining.delete(key);
    next.push(mergeChatRow(row, fresh));
  }

  const added = Array.from(remaining.values());
  return added.length > 0 ? [...added, ...next] : next;
}

/** Patch an existing row without adding one the list does not contain. */
export function patchChatRow(
  list: ChatUser[],
  row: ChatUser,
  flags: RealtimeChatFlags = {},
): ChatUser[] {
  const index = list.findIndex((chat) => chatRowMatches(chat, row));
  if (index === -1) return list;

  const existing = list[index];
  const merged = mergeChatRow(existing, withFlags(existing, row, flags));
  const next = [...list];
  next[index] = merged;
  return next;
}

export function removeChatRow(list: ChatUser[], row: ChatUser): ChatUser[] {
  const next = list.filter((chat) => !chatRowMatches(chat, row));
  return next.length === list.length ? list : next;
}

/** Remove by the ids carried on `remove_chat_from_list` (either may be absent). */
export function removeChatRowByRef(
  list: ChatUser[],
  ref: { chatId?: string | number | null; userId?: string | number | null },
): ChatUser[] {
  const chatId =
    ref.chatId === undefined || ref.chatId === null || ref.chatId === ''
      ? ''
      : String(ref.chatId);
  const parsedUserId = Number(ref.userId);
  const userId =
    Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

  if (!chatId && userId === null) return list;

  const next = list.filter(
    (chat) =>
      !(
        (chatId !== '' && chat.id === chatId) ||
        (userId !== null && chat.user_id === userId)
      ),
  );
  return next.length === list.length ? list : next;
}

/**
 * Zero the unread badge on the row(s) a read receipt refers to.
 *
 * Receipts arrive on the chat-list socket, but they only patched the legacy
 * active-chats list, so the dot in Online/Unreplied stayed lit after the admin
 * had already opened the conversation. Membership is deliberately untouched:
 * a read chat remains Unreplied until staff actually reply.
 */
export function clearUnreadChatRow(
  list: ChatUser[],
  ref: { chatId?: string | number | null; userId?: string | number | null },
): ChatUser[] {
  const chatId =
    ref.chatId === undefined || ref.chatId === null || ref.chatId === ''
      ? ''
      : String(ref.chatId);
  const parsedUserId = Number(ref.userId);
  const userId =
    Number.isFinite(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;

  if (!chatId && userId === null) return list;

  let hasChanges = false;
  const next = list.map((chat) => {
    const isMatch =
      (chatId !== '' && chat.id === chatId) ||
      (userId !== null && chat.user_id === userId);
    if (!isMatch || !chat.unreadCount || chat.unreadCount <= 0) {
      return chat;
    }
    hasChanges = true;
    return { ...chat, unreadCount: 0 };
  });

  return hasChanges ? next : list;
}
