import { API_ENDPOINTS } from '@/lib/constants/api';
import {
  extractPlayerArrayFromAdminChatResponse,
  mapAdminSearchRowToChatUser,
  pickWinningBalanceFromBackend,
} from '@/lib/chat/map-chat-api';
import { isIdentityVerifiedFromRecord } from '@/lib/players/player-verification';
import { pickChatroomIdFromRow } from '@/lib/chat/safe-chatroom-id';
import type { ChatUser } from '@/types';

type ResolveArgs = {
  userId: number;
  token: string | null | undefined;
};

async function searchChatUserByQuery(
  query: string,
  token: string | null | undefined,
  userId: number,
): Promise<ChatUser | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const response = await fetch(
    `/${API_ENDPOINTS.CHAT.SEARCH_PLAYERS}?query=${encodeURIComponent(trimmed)}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as Record<string, unknown>;
  const rows = extractPlayerArrayFromAdminChatResponse(data);
  const mapped = rows.map((row) => mapAdminSearchRowToChatUser(row));
  return (
    mapped.find((player) => player.user_id === userId && Boolean(player.id)) ??
    mapped.find((player) => player.user_id === userId) ??
    null
  );
}

/**
 * Resolve a chat directory user for deep-links (`?playerId=`).
 * Player-details alone usually has no chatroom_id — search the chat API for it.
 */
export async function resolveChatUserForPlayerIdDeepLink({
  userId,
  token,
}: ResolveArgs): Promise<ChatUser | null> {
  const detailsRes = await fetch(`/api/player-details/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!detailsRes.ok) {
    // Still try chat search by numeric id in case the directory knows the room.
    return searchChatUserByQuery(String(userId), token, userId);
  }

  const data = await detailsRes.json();
  const player = (data.player || data) as Record<string, unknown>;
  if (!player || !(player.id || player.user_id)) {
    return searchChatUserByQuery(String(userId), token, userId);
  }

  const resolvedUserId = Number(player.id || player.user_id || 0);
  if (!Number.isFinite(resolvedUserId) || resolvedUserId <= 0) {
    return null;
  }

  const identityVerified = isIdentityVerifiedFromRecord(player);
  const profileUser: ChatUser = {
    id: pickChatroomIdFromRow(player, resolvedUserId),
    user_id: resolvedUserId,
    username: String(player.username || player.full_name || 'Unknown'),
    fullName: player.full_name
      ? String(player.full_name)
      : player.name
        ? String(player.name)
        : undefined,
    email: String(player.email || ''),
    avatar:
      player.profile_pic || player.profile_image || player.avatar
        ? String(player.profile_pic || player.profile_image || player.avatar)
        : undefined,
    isOnline: Boolean(player.is_online),
    lastMessage: player.last_message
      ? String(player.last_message)
      : undefined,
    lastMessageTime: player.last_message_timestamp
      ? String(player.last_message_timestamp)
      : undefined,
    balance:
      player.balance !== undefined ? String(player.balance) : undefined,
    ...pickWinningBalanceFromBackend(player),
    cashoutLimit:
      player.cashout_limit !== undefined && player.cashout_limit !== null
        ? String(player.cashout_limit)
        : undefined,
    lockedBalance:
      player.locked_balance !== undefined && player.locked_balance !== null
        ? String(player.locked_balance)
        : undefined,
    gamesPlayed:
      (player.games_played as number | undefined) ||
      (player.gems as number | undefined) ||
      undefined,
    winRate: (player.win_rate as number | undefined) || undefined,
    phone:
      player.phone_number || player.mobile_number
        ? String(player.phone_number || player.mobile_number)
        : undefined,
    unreadCount: Number(player.unread_messages_count ?? 0),
    notes: player.notes ? String(player.notes) : undefined,
    ...(identityVerified === undefined
      ? {}
      : { isIdentityVerified: identityVerified }),
  };

  if (profileUser.id) {
    return profileUser;
  }

  const username = (profileUser.username || '').trim();
  const fromUsername =
    username && username.toLowerCase() !== 'unknown'
      ? await searchChatUserByQuery(username, token, resolvedUserId)
      : null;
  const fromUserId =
    fromUsername?.id
      ? null
      : await searchChatUserByQuery(String(resolvedUserId), token, resolvedUserId);

  const fromSearch = fromUsername?.id
    ? fromUsername
    : fromUserId?.id
      ? fromUserId
      : fromUsername || fromUserId;

  if (!fromSearch) {
    return profileUser;
  }

  return {
    ...profileUser,
    ...fromSearch,
    // Prefer profile ledger / identity when search row is thin
    user_id: resolvedUserId,
    username: profileUser.username || fromSearch.username,
    fullName: profileUser.fullName || fromSearch.fullName,
    email: profileUser.email || fromSearch.email,
    avatar: profileUser.avatar || fromSearch.avatar,
    balance: profileUser.balance ?? fromSearch.balance,
    winningBalance: profileUser.winningBalance ?? fromSearch.winningBalance,
    cashoutLimit: profileUser.cashoutLimit ?? fromSearch.cashoutLimit,
    lockedBalance: profileUser.lockedBalance ?? fromSearch.lockedBalance,
    phone: profileUser.phone || fromSearch.phone,
    notes: profileUser.notes || fromSearch.notes,
    isIdentityVerified:
      profileUser.isIdentityVerified ?? fromSearch.isIdentityVerified,
    id: fromSearch.id || profileUser.id,
  };
}
