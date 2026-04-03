import { isValidTimestamp } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';

/**
 * Extract unread count from various field names consistently
 * Handles both unread_message_count and unread_messages_count fields
 */
export const extractUnreadCount = (data: Record<string, unknown>): number => {
  const count1 = data.unread_message_count as number | undefined;
  const count2 = data.unread_messages_count as number | undefined;

  const validCount1 = typeof count1 === 'number' && count1 >= 0 ? count1 : 0;
  const validCount2 = typeof count2 === 'number' && count2 >= 0 ? count2 : 0;

  return Math.max(validCount1, validCount2);
};

type BackendChatPayload = {
  player?: {
    id?: string | number;
    username?: string;
    full_name?: string;
    name?: string;
    email?: string;
    profile_pic?: string;
    profile_image?: string;
    avatar?: string;
    is_online?: boolean;
    isOnline?: boolean;
    balance?: number | string;
    winning_balance?: number | string;
    winningBalance?: number | string;
    cashout_limit?: number | string;
    locked_balance?: number | string;
    games_played?: number;
    gamesPlayed?: number;
    win_rate?: number;
    winRate?: number;
    phone_number?: string;
    mobile_number?: string;
    phone?: string;
    mobile?: string;
    notes?: string;
  };
  user_id?: number | string;
  /** Flat shape from GET admin chat list `chats[]` */
  player_id?: number | string;
  player_username?: string;
  username?: string;
  id?: number | string;
  chat_id?: number | string;
  unread_message_count?: number;
  unread_messages_count?: number;
  unreadCount?: number;
  updated_at?: string;
  last_message?: string;
  last_message_time?: string;
  /** ISO timestamp from REST `chats[]` / `player[]` */
  last_message_timestamp?: string;
};

/**
 * Transform backend chat data to frontend ChatUser format
 * WebSocket format: chat object with nested player data OR re_arrange format
 * REST `chats[]`: flat rows with player_id, player_username, last_message_timestamp
 */
export function transformChatToUser(raw: Record<string, unknown>): ChatUser {
  const chat = raw as unknown as BackendChatPayload;
  const player = chat.player || {};

  const userId = Number(chat.user_id ?? chat.player_id ?? player.id ?? 0);
  const username =
    chat.username ||
    chat.player_username ||
    player.username ||
    player.full_name ||
    'Unknown';

  const rawTimestamp = chat.last_message_time || chat.last_message_timestamp;
  const validTimestamp = isValidTimestamp(rawTimestamp) ? rawTimestamp : undefined;

  return {
    id: String(chat.chat_id ?? chat.id ?? player.id ?? ''),
    user_id: userId,
    username,
    fullName: player.full_name || player.name || undefined,
    email: player.email || '',
    avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
    isOnline: player.is_online || player.isOnline || false,
    lastMessage: chat.last_message || undefined,
    lastMessageTime: validTimestamp,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance:
      player.winning_balance || player.winningBalance
        ? String(player.winning_balance || player.winningBalance)
        : undefined,
    cashoutLimit:
      player.cashout_limit !== undefined && player.cashout_limit !== null
        ? String(player.cashout_limit)
        : undefined,
    lockedBalance:
      player.locked_balance !== undefined && player.locked_balance !== null
        ? String(player.locked_balance)
        : undefined,
    gamesPlayed: player.games_played || player.gamesPlayed || undefined,
    winRate: player.win_rate || player.winRate || undefined,
    phone: player.phone_number || player.mobile_number || player.phone || player.mobile || undefined,
    unreadCount: extractUnreadCount(raw) || chat.unreadCount || 0,
    notes: player.notes || undefined,
  };
}

/**
 * Transform REST API player data to frontend ChatUser format
 * REST: player objects from admin chat endpoints (chatroom context + profile)
 */
export function transformPlayerToUser(player: Record<string, unknown>): ChatUser {
  const rawTimestamp = player.last_message_timestamp as string | undefined;
  const validTimestamp = isValidTimestamp(rawTimestamp) ? rawTimestamp : undefined;

  const rawLastSeen = player.last_seen_at as string | undefined;
  const validLastSeen = isValidTimestamp(rawLastSeen) ? rawLastSeen : undefined;

  return {
    id: String(player.chatroom_id || player.id || ''),
    user_id: Number(player.id || 0),
    username: (player.username as string | undefined) || (player.full_name as string | undefined) || 'Unknown',
    fullName: (player.full_name as string | undefined) || (player.name as string | undefined) || undefined,
    email: (player.email as string | undefined) || '',
    avatar:
      (player.profile_pic as string | undefined) ||
      (player.profile_image as string | undefined) ||
      (player.avatar as string | undefined) ||
      undefined,
    isOnline: (player.is_online as boolean | undefined) || false,
    lastMessage: (player.last_message as string | undefined) || undefined,
    lastMessageTime: validTimestamp,
    playerLastSeenAt: validLastSeen,
    balance: player.balance !== undefined ? String(player.balance) : undefined,
    winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
    cashoutLimit:
      player.cashout_limit !== undefined && player.cashout_limit !== null
        ? String(player.cashout_limit as string | number)
        : undefined,
    lockedBalance:
      player.locked_balance !== undefined && player.locked_balance !== null
        ? String(player.locked_balance as string | number)
        : undefined,
    gamesPlayed: (player.games_played as number | undefined) || (player.gems as number | undefined) || undefined,
    winRate: (player.win_rate as number | undefined) || undefined,
    phone: (player.phone_number as string | undefined) || (player.mobile_number as string | undefined) || undefined,
    unreadCount: extractUnreadCount(player) || 0,
    notes: (player.notes as string | undefined) || undefined,
  };
}
