import { isValidTimestamp } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';

/** Totals from admin chat list / online endpoints (`counts` on JSON). */
export type ChatListServerCounts = {
  allPlayersCount: number | null;
  onlinePlayersCount: number | null;
};

function readNonNegativeInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0) {
      return n;
    }
  }
  return null;
}

/**
 * Read `counts.all_players_count` / `counts.online_players_count` when the backend sends them.
 */
export function extractChatListServerCounts(data: Record<string, unknown>): ChatListServerCounts {
  const raw = data.counts;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { allPlayersCount: null, onlinePlayersCount: null };
  }
  const c = raw as Record<string, unknown>;
  return {
    allPlayersCount: readNonNegativeInt(c.all_players_count),
    onlinePlayersCount: readNonNegativeInt(c.online_players_count),
  };
}

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

/** Backend booleans may be 0/1 or string flags. */
function coercedBooleanOnline(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  if (typeof value === 'string') {
    const s = value.toLowerCase().trim();
    return s === '1' || s === 'true' || s === 'yes';
  }
  return false;
}

/**
 * Admin chat payloads sometimes nest profile under `player` or mix chat + user fields.
 */
export function flattenAdminChatPlayerRow(raw: Record<string, unknown>): Record<string, unknown> {
  const nested = raw.player;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return { ...(nested as Record<string, unknown>), ...raw };
  }
  return raw;
}

/**
 * Normalize API value to player rows (array of objects, or a single player/chat object).
 */
function coercePlayerRowsFromValue(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    const rows = value.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object');
    return rows.length > 0 ? rows : null;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if (playerLikeRowScore(row) >= 1) {
      return [row];
    }
  }
  return null;
}

/**
 * Player rows from admin chat JSON (`all_players`, `search_players`, etc.).
 * Different endpoints use different array keys; some return a single `player` object.
 */
export function extractPlayerArrayFromAdminChatResponse(
  data: Record<string, unknown>,
  depth = 0,
): Record<string, unknown>[] {
  if (depth > 8) {
    return [];
  }

  const keys = [
    'player',
    'results',
    'players',
    'chats',
    'items',
    'rows',
    'list',
    'users',
    'records',
    'data',
    'search_results',
    'searchResults',
  ] as const;

  for (const k of keys) {
    const v = data[k];
    const rows = coercePlayerRowsFromValue(v);
    if (rows && rows.length > 0) {
      return rows;
    }
    if (k === 'data' && v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const inner = extractPlayerArrayFromAdminChatResponse(v as Record<string, unknown>, depth + 1);
      if (inner.length > 0) {
        return inner;
      }
    }
  }

  const deep = extractPlayerLikeArraysDeep(data, 0, 6, new WeakSet());
  if (deep.length === 0) {
    return [];
  }
  const viable = deep.filter((a) => a.length > 0 && scorePlayerLikeArray(a) >= 1);
  if (viable.length === 0) {
    return [];
  }
  viable.sort((a, b) => scorePlayerLikeArray(b) - scorePlayerLikeArray(a));
  return viable[0] ?? [];
}

function playerLikeRowScore(row: Record<string, unknown>): number {
  let n = 0;
  if (typeof row.username === 'string' && row.username.trim()) {
    n += 2;
  }
  if (typeof row.player_username === 'string' && row.player_username.trim()) {
    n += 2;
  }
  const uid = Number(row.user_id ?? row.player_id ?? 0);
  if (Number.isFinite(uid) && uid > 0) {
    n += 3;
  }
  const idNum = Number(row.id);
  if (Number.isFinite(idNum) && idNum > 0) {
    n += 1;
  }
  if (row.chatroom_id != null || row.chat_id != null) {
    n += 1;
  }
  return n;
}

function scorePlayerLikeArray(rows: Record<string, unknown>[]): number {
  if (rows.length === 0) {
    return 0;
  }
  const sample = Math.min(rows.length, 5);
  let s = 0;
  for (let i = 0; i < sample; i += 1) {
    s += playerLikeRowScore(rows[i]);
  }
  return s + rows.length * 0.01;
}

function extractPlayerLikeArraysDeep(
  node: unknown,
  depth: number,
  maxDepth: number,
  seen: WeakSet<object>,
): Record<string, unknown>[][] {
  if (depth > maxDepth || node === null || node === undefined) {
    return [];
  }

  if (Array.isArray(node)) {
    if (node.length === 0) {
      return [];
    }
    const first = node[0];
    if (first !== null && typeof first === 'object' && !Array.isArray(first)) {
      return [node as Record<string, unknown>[]];
    }
    return [];
  }

  if (typeof node !== 'object') {
    return [];
  }

  const obj = node as Record<string, unknown>;
  if (seen.has(obj)) {
    return [];
  }
  seen.add(obj);

  const out: Record<string, unknown>[][] = [];
  for (const v of Object.values(obj)) {
    out.push(...extractPlayerLikeArraysDeep(v, depth + 1, maxDepth, seen));
  }
  return out;
}

/**
 * Map one admin search / list row to ChatUser — supports `player[]` and flat `chats[]` shapes.
 */
export function mapAdminSearchRowToChatUser(row: Record<string, unknown>): ChatUser {
  const usernameStr = typeof row.username === 'string' ? row.username.trim() : '';
  const looksLikeFlatChatRow =
    row.player_username != null ||
    (row.player_id != null && usernameStr.length === 0);

  if (looksLikeFlatChatRow) {
    return transformChatToUser(row);
  }
  return transformPlayerToUser(row);
}

/** Parsed non-zero ledger string, or null when empty / zero / invalid (single-balance deployments often send 0). */
function ledgerWinningString(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const s = String(value).trim();
  if (s === '' || s === 'undefined' || s === 'null') {
    return null;
  }
  const n = Number.parseFloat(s.replace(/,/g, ''));
  if (!Number.isFinite(n) || n === 0) {
    return null;
  }
  return s;
}

/**
 * Only attach winningBalance when the payload includes a non-zero bucket amount.
 * Zero / missing is treated as “no separate winnings” so the admin UI does not show an empty WINNINGS tile.
 */
export function pickWinningBalanceFromBackend(
  raw: Record<string, unknown>,
): Pick<ChatUser, 'winningBalance'> | Record<string, never> {
  for (const key of ['winning_balance', 'winningBalance', 'player_winning_balance'] as const) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      continue;
    }
    const sig = ledgerWinningString(raw[key]);
    if (sig === null) {
      continue;
    }
    return { winningBalance: sig };
  }
  return {};
}

/**
 * Realtime (WebSocket) updates often include winning_balance: 0 even when the product only uses one bucket.
 * Non-finite / zero clears the field; missing raw preserves previous.
 */
export function normalizeWinningBalanceFromRealtime(
  raw: unknown,
  previous: string | undefined,
): string | undefined {
  if (raw === undefined || raw === null) {
    return previous;
  }
  const sig = ledgerWinningString(raw);
  if (sig === null) {
    return undefined;
  }
  return sig;
}

/** Used by chat and player profile UIs to gate the “Winnings” tile (omit when zero / missing). */
export function hasMeaningfulWinningBalance(value: unknown): boolean {
  return ledgerWinningString(value) !== null;
}

const WINNING_PARTIAL_KEYS = [
  'winning_balance',
  'player_winning_bal',
  'player_winning_balance',
  'winningBalance',
] as const;

/**
 * Chat-list partial WS payloads often update only `balance`. If no winning* key is present,
 * clear winnings (do not preserve stale state). If keys exist, apply non-zero normalization.
 */
export function mergeWinningBalanceFromPartialPayload(
  payload: Record<string, unknown>,
  nestedPlayer: Record<string, unknown> | undefined,
  previous: string | undefined,
): string | undefined {
  let raw: unknown;
  let found = false;

  for (const k of WINNING_PARTIAL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      found = true;
      raw = payload[k];
      break;
    }
  }
  if (!found && nestedPlayer) {
    for (const k of WINNING_PARTIAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(nestedPlayer, k)) {
        found = true;
        raw = nestedPlayer[k];
        break;
      }
    }
  }

  if (!found) {
    return undefined;
  }
  if (raw === undefined || raw === null) {
    return undefined;
  }
  return normalizeWinningBalanceFromRealtime(raw, previous);
}

export function payloadIncludesWinningBalanceFields(
  payload: Record<string, unknown>,
  nestedPlayer?: Record<string, unknown>,
): boolean {
  for (const k of WINNING_PARTIAL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      return true;
    }
  }
  if (nestedPlayer) {
    for (const k of WINNING_PARTIAL_KEYS) {
      if (Object.prototype.hasOwnProperty.call(nestedPlayer, k)) {
        return true;
      }
    }
  }
  return false;
}

/** First non-empty string among API/WS variants (cashout_limit, player_cashout_limit, etc.). */
export function ledgerStringOrUndefined(...candidates: unknown[]): string | undefined {
  for (const v of candidates) {
    if (v === undefined || v === null) continue;
    const s = String(v).trim();
    if (s !== '' && s !== 'undefined' && s !== 'null') {
      return s;
    }
  }
  return undefined;
}

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
  cashout_limit?: number | string;
  player_cashout_limit?: number | string;
  locked_balance?: number | string;
  player_locked_balance?: number | string;
  balance?: number | string;
  player_bal?: number | string;
};

/**
 * Transform backend chat data to frontend ChatUser format
 * WebSocket format: chat object with nested player data OR re_arrange format
 * REST `chats[]`: flat rows with player_id, player_username, last_message_timestamp
 */
export function transformChatToUser(raw: Record<string, unknown>): ChatUser {
  const chat = raw as unknown as BackendChatPayload;
  const player = chat.player || {};
  const ledgerRow = { ...raw, ...(player as Record<string, unknown>) };

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
    balance: ledgerStringOrUndefined(player.balance, chat.balance, chat.player_bal),
    ...pickWinningBalanceFromBackend(ledgerRow),
    cashoutLimit: ledgerStringOrUndefined(
      player.cashout_limit,
      chat.cashout_limit,
      chat.player_cashout_limit,
    ),
    lockedBalance: ledgerStringOrUndefined(
      player.locked_balance,
      chat.locked_balance,
      chat.player_locked_balance,
    ),
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
  const row = flattenAdminChatPlayerRow(player);

  const rawTimestamp = row.last_message_timestamp as string | undefined;
  const validTimestamp = isValidTimestamp(rawTimestamp) ? rawTimestamp : undefined;

  const rawLastSeen = row.last_seen_at as string | undefined;
  const validLastSeen = isValidTimestamp(rawLastSeen) ? rawLastSeen : undefined;

  const resolvedUserId = Number(
    row.user_id ?? row.player_id ?? row.player_user_id ?? row.uid ?? row.id ?? 0,
  );

  const directoryId =
    row.chatroom_id ??
    row.chat_id ??
    row.chatroomId ??
    row.id ??
    (resolvedUserId > 0 ? resolvedUserId : '');

  return {
    id: String(directoryId !== '' && directoryId !== undefined && directoryId !== null ? directoryId : ''),
    user_id: resolvedUserId,
    username: (row.username as string | undefined) || (row.full_name as string | undefined) || 'Unknown',
    fullName: (row.full_name as string | undefined) || (row.name as string | undefined) || undefined,
    email: (row.email as string | undefined) || '',
    avatar:
      (row.profile_pic as string | undefined) ||
      (row.profile_image as string | undefined) ||
      (row.avatar as string | undefined) ||
      undefined,
    isOnline: coercedBooleanOnline(row.is_online) || coercedBooleanOnline(row.isOnline),
    lastMessage: (row.last_message as string | undefined) || undefined,
    lastMessageTime: validTimestamp,
    playerLastSeenAt: validLastSeen,
    balance: row.balance !== undefined ? String(row.balance) : undefined,
    ...pickWinningBalanceFromBackend(row),
    cashoutLimit:
      row.cashout_limit !== undefined && row.cashout_limit !== null
        ? String(row.cashout_limit as string | number)
        : undefined,
    lockedBalance:
      row.locked_balance !== undefined && row.locked_balance !== null
        ? String(row.locked_balance as string | number)
        : undefined,
    gamesPlayed: (row.games_played as number | undefined) || (row.gems as number | undefined) || undefined,
    winRate: (row.win_rate as number | undefined) || undefined,
    phone: (row.phone_number as string | undefined) || (row.mobile_number as string | undefined) || undefined,
    unreadCount: extractUnreadCount(row) || 0,
    notes: (row.notes as string | undefined) || undefined,
  };
}
