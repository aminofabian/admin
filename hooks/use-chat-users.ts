import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { WEBSOCKET_BASE_URL } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import { isValidTimestamp } from '@/lib/utils/formatters';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { websocketManager, createFreshAuthenticatedWebSocketUrl, type WebSocketListeners } from '@/lib/websocket-manager';
import { debounceByKey, type KeyedDebounce } from '@/lib/utils/debounce-by-key';
import type { ChatUser } from '@/types';
import {
  extractUnreadCount,
  extractChatListServerCounts,
  extractPlayerArrayFromAdminChatResponse,
  mapAdminSearchRowToChatUser,
  mergeWinningBalanceFromPartialPayload,
  payloadIncludesWinningBalanceFields,
  readOptionalBoolean,
  transformChatToUser,
} from '@/lib/chat/map-chat-api';
import {
  chatRowMatches,
  clearUnreadChatRow,
  mergeChatRow,
  patchChatRow,
  reconcileChatSnapshot,
  removeChatRow,
  removeChatRowByRef,
  upsertChatRowByLatestMessage,
} from '@/lib/chat/chat-list-realtime';
import { pickChatroomIdFromRow } from '@/lib/chat/safe-chatroom-id';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

function readChatListTotalCount(data: Record<string, unknown>): number | null {
  const pagination = data.pagination as Record<string, unknown> | undefined;
  const fromPagination = pagination?.total_count;
  if (typeof fromPagination === 'number' && Number.isFinite(fromPagination)) {
    return fromPagination;
  }
  if (typeof fromPagination === 'string' && fromPagination.trim() !== '') {
    const n = Number(fromPagination);
    if (Number.isFinite(n)) return n;
  }
  const count = data.count;
  if (typeof count === 'number' && Number.isFinite(count)) {
    return count;
  }
  if (typeof count === 'string' && count.trim() !== '') {
    const n = Number(count);
    if (Number.isFinite(n)) return n;
  }
  const counts = data.counts as Record<string, unknown> | undefined;
  const fromCounts = counts?.all_players_count;
  if (typeof fromCounts === 'number' && Number.isFinite(fromCounts)) {
    return fromCounts;
  }
  if (typeof fromCounts === 'string' && fromCounts.trim() !== '') {
    const n = Number(fromCounts);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Check if two chat objects have meaningful differences
 * Used to prevent unnecessary re-renders
 */
const hasSignificantChanges = (existing: ChatUser, incoming: ChatUser): boolean => {
  return (
    existing.lastMessage !== incoming.lastMessage ||
    existing.lastMessageTime !== incoming.lastMessageTime ||
    existing.unreadCount !== incoming.unreadCount ||
    existing.isOnline !== incoming.isOnline ||
    existing.isUnreplied !== incoming.isUnreplied ||
    existing.balance !== incoming.balance ||
    existing.winningBalance !== incoming.winningBalance ||
    existing.cashoutLimit !== incoming.cashoutLimit ||
    existing.lockedBalance !== incoming.lockedBalance
  );
};

interface UseChatUsersParams {
  adminId: number;
  enabled?: boolean;
}

interface UseChatUsersReturn {
  users: ChatUser[]; // Active chats (kept for sidebar unread badges)
  /** Online chats seeded by the chat-list socket's `online` array. */
  onlineChats: ChatUser[];
  /** Chats the server flags `is_unreplied` — the Unreplied tab. */
  unrepliedChats: ChatUser[];
  allPlayers: ChatUser[]; // All players from REST API
  onlineUsers: ChatUser[];
  isLoading: boolean;
  isLoadingAllPlayers: boolean; // Separate loading state for all players
  isLoadingMore: boolean; // Loading state for pagination
  error: string | null;
  isConnected: boolean; // WebSocket connection status
  refetch: () => Promise<void>;
  fetchAllPlayers: (options?: { force?: boolean }) => Promise<void>;
  loadMorePlayers: () => Promise<void>; // Load next page
  hasMorePlayers: boolean; // Whether there are more pages
  /** Total players with chats from list API pagination when the backend sends it. */
  playersWithChatsTotalCount: number | null;
  /** From last `/api/chat-all-players` response `counts.online_players_count` when present. */
  chatListOnlinePlayersCount: number | null;
  /** From last `/api/chat-all-players` response `counts.all_players_count` when present. */
  chatListAllPlayersCount: number | null;
  /** From last chat-list REST response `counts.unreplied_players_count` when present. */
  chatListUnrepliedPlayersCount: number | null;
  /**
   * True once the Unreplied list is driven by live socket membership (or a
   * reply/`re_arrange` has mutated it). The badge then follows list length.
   */
  unrepliedListLive: boolean;
  /** Players the chat-list socket has marked offline. Online must not resurrect them from a stale REST cache. */
  socketOfflineUserIds: number[];
  /** Drop a player from Unreplied the moment this agent sends a reply, before `re_arrange` arrives. */
  acknowledgeStaffReply: (userId: number) => void;
  refreshActiveChats: () => Promise<void>; // Refresh chat list from API
  /** Drop the cached all-players snapshot; call after any mutation. */
  invalidatePlayersCache: () => void;
  updateChatLastMessage: (userId: number, chatId: string, lastMessage: string, lastMessageTime: string) => void;
  markChatAsRead: (params: { chatId?: string; userId?: number }) => void;
  markChatAsReadDebounced: (params: { chatId?: string; userId?: number }) => void;
}

export function useChatUsers({ adminId, enabled = true }: UseChatUsersParams): UseChatUsersReturn {
  // Separate state for active chats (WebSocket) and all players (REST API)
  const [activeChats, setActiveChats] = useState<ChatUser[]>([]);
  const [onlineChats, setOnlineChats] = useState<ChatUser[]>([]);
  const [unrepliedChats, setUnrepliedChats] = useState<ChatUser[]>([]);
  const [allPlayers, setAllPlayers] = useState<ChatUser[]>([]);
  const [isLoading, setIsLoading] = useState(false); // For WebSocket connection
  const [isLoadingAllPlayers, setIsLoadingAllPlayers] = useState(false); // For REST API
  const [isLoadingMore, setIsLoadingMore] = useState(false); // For pagination
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const isAgent = user?.role === USER_ROLES.AGENT;
  const effectiveEnabled = enabled && !isAgent;

  // WebSocket management refs
  const wsUrlRef = useRef<string>('');
  const listenersRef = useRef<Set<WebSocketListeners>>(new Set());

  //  PERFORMANCE: Cache for fetchAllPlayers (5 min TTL)
  const playersCacheRef = useRef<{
    data: ChatUser[];
    timestamp: number;
    onlinePlayersCount: number | null;
    allPlayersCount: number | null;
    unrepliedPlayersCount: number | null;
  } | null>(null);
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  //  Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePlayers, setHasMorePlayers] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [playersWithChatsTotalCount, setPlayersWithChatsTotalCount] = useState<number | null>(null);
  const [chatListOnlinePlayersCount, setChatListOnlinePlayersCount] = useState<number | null>(null);
  const [chatListAllPlayersCount, setChatListAllPlayersCount] = useState<number | null>(null);
  const [chatListUnrepliedPlayersCount, setChatListUnrepliedPlayersCount] =
    useState<number | null>(null);
  /**
   * True once `/ws/chatlist/` has accepted an unreplied snapshot or a
   * `re_arrange` has changed membership. Until then REST may bridge the badge.
   */
  const unrepliedSocketSeededRef = useRef(false);
  const [unrepliedListLive, setUnrepliedListLive] = useState(false);
  const pageSize = 50;

  /** Keep the parallel count identical to list length whenever membership moves. */
  const commitUnrepliedList = useCallback((next: ChatUser[]) => {
    setChatListUnrepliedPlayersCount(next.length);
    return next;
  }, []);

  const markUnrepliedListLive = useCallback(() => {
    unrepliedSocketSeededRef.current = true;
    setUnrepliedListLive(true);
  }, []);

  const [socketOfflineUserIds, setSocketOfflineUserIds] = useState<number[]>([]);

  const noteSocketPresence = useCallback((userId: number, isOnline: boolean) => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    setSocketOfflineUserIds((prev) => {
      const has = prev.includes(userId);
      if (!isOnline && !has) return [...prev, userId];
      if (isOnline && has) return prev.filter((id) => id !== userId);
      return prev;
    });
  }, []);

  /**
   * Staff just replied. Unreplied membership and the badge move together,
   * without waiting for the socket — and a later `re_arrange` for the same
   * clear is a no-op remove, so the count does not drop twice.
   */
  const acknowledgeStaffReply = useCallback((userId: number) => {
    if (!Number.isFinite(userId) || userId <= 0) return;
    markUnrepliedListLive();
    setUnrepliedChats((prev) => {
      const next = prev.filter((chat) => chat.user_id !== userId);
      return commitUnrepliedList(next.length === prev.length ? prev : next);
    });
  }, [commitUnrepliedList, markUnrepliedListLive]);

  const applyChatListServerCounts = useCallback(
    (
      counts: ReturnType<typeof extractChatListServerCounts>,
      options?: { unreplied?: boolean },
    ) => {
      if (counts.onlinePlayersCount != null) {
        setChatListOnlinePlayersCount(counts.onlinePlayersCount);
      }
      if (counts.allPlayersCount != null) {
        setChatListAllPlayersCount(counts.allPlayersCount);
      }
      // Directory pagination must not rewrite the Unreplied badge. Only the
      // one-shot mount seed passes `unreplied: true`.
      if (
        options?.unreplied &&
        counts.unrepliedPlayersCount != null &&
        !unrepliedSocketSeededRef.current
      ) {
        setChatListUnrepliedPlayersCount(counts.unrepliedPlayersCount);
      }
    },
    [],
  );

  /** Merge REST `is_unreplied` rows into the Unreplied tab before the socket seeds it. */
  const seedUnrepliedFromRestRows = useCallback((rows: ChatUser[]) => {
    if (unrepliedSocketSeededRef.current) return;
    const unreplied = rows.filter((user) => user.isUnreplied === true);
    if (unreplied.length === 0) return;
    setUnrepliedChats((prev) => {
      if (prev.length === 0) return unreplied;
      let next = prev;
      for (const row of unreplied) {
        next = upsertChatRowByLatestMessage(next, row, { isUnreplied: true });
      }
      return next;
    });
  }, []);

  //  Track last update per chat to prevent rapid updates
  const chatLastUpdateRef = useRef<Map<string, number>>(new Map());
  const WS_UPDATE_COOLDOWN = 1000; // 1 second cooldown for WebSocket updates per chat

  // Store refreshActiveChats in a ref to avoid circular dependency
  const refreshActiveChatsRef = useRef<(() => Promise<void>) | undefined>(undefined);

  /**
   * Request hygiene for the explicit chat-list refresh.
   *
   * Live chat traffic no longer calls this (Online and Unreplied are driven by
   * `/ws/chatlist/`), but the helper is still exposed for manual/legacy callers.
   * Without sequencing a slow response could land after a newer one and
   * overwrite it, and without coalescing a burst spawned one fetch per call.
   */
  const refreshSeqRef = useRef(0);
  const refreshInFlightRef = useRef<Promise<void> | null>(null);
  const refreshQueuedRef = useRef(false);
  const refreshAbortRef = useRef<AbortController | null>(null);

  /**
   * Drop the cached all-players snapshot.
   *
   * The 5-minute cache was written on fetch and read on the fast path, but
   * nothing ever invalidated it: a manual balance adjustment patched local
   * state and left the cache holding the pre-adjustment figure, so switching to
   * the all-chats tab re-rendered a stale balance for up to five minutes. Every
   * mutation path calls this.
   */
  const invalidatePlayersCache = useCallback(() => {
    playersCacheRef.current = null;
  }, []);

  /** Handle to the read-receipt debouncer, used for unmount cleanup. */
  const markChatAsReadDebouncedRef = useRef<KeyedDebounce<
    [{ chatId?: string; userId?: number }]
  > | null>(null);

  // Coalesce rapid WebSocket updates per conversation.
  //
  // This used to be a single shared `debounce`, whose one timer meant a message
  // for player B cancelled player A's pending update — A's last-message stayed
  // stale until the next poll. Debouncing per chat id keeps the coalescing
  // benefit for one busy conversation without ever dropping another's update.
  const debouncedChatUpdateRef = useRef(
    debounceByKey((_chatKey: string, updateData: Record<string, unknown>) => {
      const userId = Number(updateData.user_id ?? updateData.player_id ?? 0);
      const chatId = pickChatroomIdFromRow(updateData, userId);
      const now = Date.now();
      const lastUpdate = chatLastUpdateRef.current.get(chatId) || 0;

      if (now - lastUpdate < WS_UPDATE_COOLDOWN) {
        return;
      }

      chatLastUpdateRef.current.set(chatId, now);

      setActiveChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat.id === chatId);

        if (chatIndex === -1) {
          const newChat = transformChatToUser(updateData);
          // Only a new inbound message may add a row. A read echo for a chat
          // this list does not hold must not appear at the top.
          const isNewInbound =
            newChat.isUnreplied === true || (newChat.unreadCount ?? 0) > 0;
          return isNewInbound ? [newChat, ...prevChats] : prevChats;
        }

        const updatedChats = [...prevChats];
        const existingChat = updatedChats[chatIndex];
        const playerData = (updateData.player as Record<string, unknown>) || undefined;
        const newBalance =
          updateData.balance ??
          (playerData ? playerData.balance : undefined) ??
          updateData.player_bal;
        const newCashoutLimit =
          updateData.cashout_limit ?? playerData?.cashout_limit ?? updateData.player_cashout_limit;
        const newLockedBalance =
          updateData.locked_balance ?? playerData?.locked_balance ?? updateData.player_locked_balance;

        const extractedUnreadCount = extractUnreadCount(updateData);
        const newUnreadCount = extractedUnreadCount !== undefined && extractedUnreadCount !== null
          ? extractedUnreadCount
          : existingChat.unreadCount;

        // Read receipts arrive as `update_chat` with the last message echoed
        // back at an unchanged time. Only a genuinely newer message may move
        // the row; otherwise the list reordered under the agent's cursor.
        const incomingTime =
          (updateData.last_message_time as string | undefined) ||
          (updateData.last_message_timestamp as string | undefined);
        const incomingText =
          typeof updateData.last_message === 'string' && updateData.last_message.length > 0
            ? updateData.last_message
            : null;
        const unreadIncreased =
          (newUnreadCount ?? 0) > (existingChat.unreadCount ?? 0);
        // Content and unread delta decide the order; a read receipt can reuse
        // the text with a fresh stamp and must not move the row.
        const textChanged =
          incomingText !== null && incomingText !== existingChat.lastMessage;
        const incomingUnread =
          newUnreadCount ?? existingChat.unreadCount ?? 0;
        const moveToTop =
          unreadIncreased || (textChanged && incomingUnread > 0);

        const updatedChat = {
          ...existingChat,
          lastMessage: (updateData.last_message as string | undefined) || existingChat.lastMessage,
          lastMessageTime:
            moveToTop && isValidTimestamp(incomingTime)
              ? incomingTime
              : existingChat.lastMessageTime,
          unreadCount: newUnreadCount,
          balance: newBalance !== undefined ? String(newBalance) : existingChat.balance,
          winningBalance: mergeWinningBalanceFromPartialPayload(
            updateData as Record<string, unknown>,
            playerData,
            existingChat.winningBalance,
          ),
          cashoutLimit:
            newCashoutLimit !== undefined && newCashoutLimit !== null
              ? String(newCashoutLimit)
              : existingChat.cashoutLimit,
          lockedBalance:
            newLockedBalance !== undefined && newLockedBalance !== null
              ? String(newLockedBalance)
              : existingChat.lockedBalance,
        };

        if (!moveToTop) {
          updatedChats[chatIndex] = updatedChat;
          return updatedChats;
        }

        updatedChats.splice(chatIndex, 1);
        return [updatedChat, ...updatedChats];
      });
    }, WS_UPDATE_COOLDOWN)
  );

  const connect = useCallback(() => {
    if (!effectiveEnabled || !adminId) return;

    void (async () => {
    try {
      // Build WebSocket URL for chat list
      const wsUrl = await createFreshAuthenticatedWebSocketUrl(WEBSOCKET_BASE_URL, '/ws/chatlist/', { user_id: adminId });
      wsUrlRef.current = wsUrl;

      if (!IS_PROD) console.log('🔌 [Chat Users] Connecting to managed WebSocket:', wsUrl);
      setIsLoading(true);

      // Create listeners for this hook
      const listeners: WebSocketListeners = {
        onOpen: () => {
          if (!IS_PROD) console.log('✅ [Chat Users] WebSocket connected');
          setError(null);
          setIsLoading(false);
          setIsConnected(true);
        },
        onMessage: (data) => {
          // Type assertion for WebSocket message data (consistent with handleWebSocketMessage)
          const messageData = data as {
            type?: string;
            message?: { type?: string; chats?: unknown[]; chat_id?: string };
            chats?: unknown[];
            chat_id?: string;
          };
          if (!IS_PROD) console.log('📨 [Chat Users] Received message:', {
            type: messageData.type || messageData.message?.type,
            hasChats: !!messageData.chats || !!messageData.message?.chats,
            chatId: messageData.chat_id || messageData.message?.chat_id,
          });

          handleWebSocketMessage(messageData);
        },
        onError: (error) => {
          console.error('❌ [Chat Users] WebSocket error:', error);
          setIsLoading(false);
          setIsConnected(false);
          setError('Connection lost, reconnecting...');
        },
        onClose: (event) => {
          if (!IS_PROD) console.log('🔌 [Chat Users] WebSocket closed:', event.code, event.reason);
          setIsConnected(false);
          setIsLoading(false);
          if (
            event.code === 4001 ||
            /auth|token|forbidden|expired/i.test(event.reason || '')
          ) {
            setError('Session expired, please log in again');
          } else if (!event.wasClean) {
            setError('Connection lost, reconnecting...');
          }
        },
        onAuthFailure: () => {
          setIsConnected(false);
          setIsLoading(false);
          setError('Session expired, please log in again');
        },
      };

      listenersRef.current.add(listeners);

      // Connect through manager
      websocketManager.connect({
        url: wsUrl,
        maxReconnectAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        connectionTimeout: 10000,
      }, listeners);

    } catch (error) {
      console.error('❌ [Chat Users] Failed to connect WebSocket:', error);
      setIsLoading(false);
      setError('Failed to connect to WebSocket');
    }
    })();
  }, [adminId, effectiveEnabled]);

  // Move the function definition after all dependencies are available
  const handleWebSocketMessage = useCallback((data: Record<string, unknown>) => {
    try {
      if (!IS_PROD) console.log('📨 [Chat Users] Full message data:', data);

      // IGNORE typing events - they should not update the chat list
      const messageWrapper = data.message as Record<string, unknown> | undefined;
      const messageType = (data.type as string | undefined) || messageWrapper?.type;
      if (messageType === 'typing') {
        if (!IS_PROD) console.log('⌨️ [Chat Users] Typing event received - ignoring for chat list');
        return;
      }

      // Edits and deletes are applied on the open conversation socket.
      // They must not be treated as new chats or new message bubbles.
      if (messageType === 'message_edited' || messageType === 'message_deleted') {
        return;
      }

      // Handle "message" type from chat list WebSocket.
      // Some "message"-typed events also embed ledger updates under a nested `payload`
      // (e.g. game_redeem, game_recharge). We fall through to the ledger branch in that case.
      const messageHasEmbeddedLedger = (() => {
        const pl = (data as Record<string, unknown>).payload as Record<string, unknown> | undefined;
        if (!pl) return false;
        return (
          pl.credits_balance !== undefined ||
          pl.balance !== undefined ||
          pl.cashout_limit !== undefined ||
          pl.locked_balance !== undefined
        );
      })();
      if (
        messageType === 'message' &&
        (data.player_id || (messageWrapper as Record<string, unknown>)?.player_id) &&
        !messageHasEmbeddedLedger
      ) {
        const msg = (messageWrapper || data) as Record<string, unknown>;
        const playerId = data.player_id ?? msg.player_id;
        const messageText = typeof data.message === 'string' ? data.message.substring(0, 30) : String(data.message ?? msg.message ?? '').substring(0, 30);
        const isPlayerSender = data.is_player_sender ?? msg.is_player_sender;
        if (!IS_PROD) console.log('💬 [Chat Users] Message event received:', {
          playerId,
          message: messageText,
          isPlayerSender,
        });

        // The re_arrange event that follows carries the server's `is_unreplied`
        // flag and last message. Do not refetch the list from REST here.
        return;
      }

      // The two chat-list event types are resolved before the ledger heuristic
      // below, because that heuristic can otherwise swallow them: a `re_arrange`
      // routinely carries the player's balance, and treating it as a
      // balance-only event left Online/Unreplied frozen.
      const addNewChatsPayload =
        messageWrapper?.type === 'add_new_chats'
          ? messageWrapper
          : data.type === 'add_new_chats'
            ? data
            : null;
      const reArrangePayload =
        messageWrapper?.type === 're_arrange'
          ? messageWrapper
          : data.type === 're_arrange'
            ? data
            : null;
      const isChatListEvent =
        addNewChatsPayload !== null || reArrangePayload !== null;

      // Handle "balanceUpdated" / "balance_updated" OR any message that carries ledger
      // data in a nested `payload` (game_redeem, game_recharge, recharge, cashout_completed, ...).
      const dataRecord = data as Record<string, unknown>;
      const nestedPayload = (dataRecord.payload as Record<string, unknown>) || undefined;
      const hasLedgerInPayload = !!(
        nestedPayload &&
        (nestedPayload.credits_balance !== undefined ||
          nestedPayload.balance !== undefined ||
          nestedPayload.cashout_limit !== undefined ||
          nestedPayload.locked_balance !== undefined)
      );
      const hasTopLevelLedger =
        data.balance !== undefined ||
        data.player_bal !== undefined ||
        (dataRecord.credits_balance as unknown) !== undefined ||
        data.cashout_limit !== undefined ||
        data.locked_balance !== undefined;
      if (
        !isChatListEvent &&
        (messageType === 'balanceUpdated' ||
          messageType === 'balance_updated' ||
          hasLedgerInPayload ||
          hasTopLevelLedger)
      ) {
        const playerId = data.player_id || data.user_id;
        const nestedPlayer = (dataRecord.player as Record<string, unknown>) || undefined;
        const balance =
          data.balance ??
          data.player_bal ??
          (dataRecord.credits_balance as unknown) ??
          nestedPayload?.credits_balance ??
          nestedPayload?.balance ??
          nestedPayload?.user_balance ??
          nestedPayload?.player_bal;
        const cashoutLimit =
          data.cashout_limit ??
          data.player_cashout_limit ??
          dataRecord.cashoutLimit ??
          nestedPayload?.cashout_limit ??
          nestedPlayer?.cashout_limit ??
          nestedPlayer?.player_cashout_limit ??
          nestedPlayer?.cashoutLimit;
        const lockedBalance =
          data.locked_balance ??
          data.player_locked_balance ??
          dataRecord.lockedBalance ??
          nestedPayload?.locked_balance ??
          nestedPlayer?.locked_balance ??
          nestedPlayer?.player_locked_balance ??
          nestedPlayer?.lockedBalance;

        if (!IS_PROD) console.log('💰 [Chat Users] Balance updated notification received:', {
          playerId,
          balance,
          cashoutLimit,
          lockedBalance,
          hasWinningFields: payloadIncludesWinningBalanceFields(dataRecord, nestedPlayer),
        });

        if (
          playerId &&
          (balance !== undefined ||
            payloadIncludesWinningBalanceFields(dataRecord, nestedPlayer) ||
            cashoutLimit !== undefined ||
            lockedBalance !== undefined)
        ) {
          const pid = Number(playerId);
          const patch = (chat: ChatUser) => ({
            ...chat,
            balance: balance !== undefined ? String(balance) : chat.balance,
            winningBalance: mergeWinningBalanceFromPartialPayload(
              dataRecord,
              nestedPlayer,
              chat.winningBalance,
            ),
            cashoutLimit:
              cashoutLimit !== undefined && cashoutLimit !== null
                ? String(cashoutLimit)
                : chat.cashoutLimit,
            lockedBalance:
              lockedBalance !== undefined && lockedBalance !== null
                ? String(lockedBalance)
                : chat.lockedBalance,
          });

          setActiveChats((prevChats) => {
            return prevChats.map((chat) => {
              if (chat.user_id === pid) {
                if (!IS_PROD) console.log(`💰 [Chat Users] Updating balance for player ${playerId}`);
                return patch(chat);
              }
              return chat;
            });
          });

          setAllPlayers((prev) =>
            prev.map((player) => (player.user_id === pid ? patch(player) : player)),
          );

          // The cached snapshot still holds the pre-event figures, so a later
          // cache hit would resurrect them.
          invalidatePlayersCache();
        }
        return;
      }

      // Handle "add_new_chats" — the connect snapshot for Online + Unreplied.
      if (addNewChatsPayload) {
        const asRows = (value: unknown): Record<string, unknown>[] =>
          Array.isArray(value)
            ? value.filter(
                (row): row is Record<string, unknown> =>
                  !!row && typeof row === 'object' && !Array.isArray(row),
              )
            : [];

        const onlineRows = asRows(addNewChatsPayload.online);
        const unrepliedRows = asRows(addNewChatsPayload.unreplied);
        const legacyRows = asRows(addNewChatsPayload.chats);

        // Rows in the `online` array are online by definition; their payload may
        // omit the nested `player.is_online` flag.
        const onlineUsers = onlineRows.map((row) => ({
          ...transformChatToUser(row),
          isOnline: true,
        }));
        const unrepliedUsers = unrepliedRows.map((row) => ({
          ...transformChatToUser(row),
          isUnreplied: true,
        }));

        // The connect payload is the authoritative seed for the socket tabs.
        // `activeChats` feeds the sidebar unread badge: prefer the legacy list,
        // otherwise union of the two socket lists (dedupe by player id).
        const snapshotRows =
          legacyRows.length > 0
            ? legacyRows.map((row) => transformChatToUser(row))
            : [...onlineUsers, ...unrepliedUsers].filter((user, index, all) => {
                const first = all.findIndex(
                  (candidate) =>
                    candidate.user_id === user.user_id && candidate.id === user.id,
                );
                return first === index;
              });

        if (Array.isArray(addNewChatsPayload.online)) {
          setOnlineChats((prev) => reconcileChatSnapshot(prev, onlineUsers));
        } else if (Array.isArray(addNewChatsPayload.chats)) {
          // Legacy payload: derive the online subset from the chat rows.
          setOnlineChats(snapshotRows.filter((user) => user.isOnline));
        }

        if (Array.isArray(addNewChatsPayload.unreplied)) {
          setUnrepliedChats((prev) => {
            // An empty unreplied array before we have accepted a socket seed
            // would wipe a valid REST seed and flash the badge to 0 (8→0→6).
            if (
              unrepliedUsers.length === 0 &&
              prev.length > 0 &&
              !unrepliedSocketSeededRef.current
            ) {
              return prev;
            }
            markUnrepliedListLive();
            return commitUnrepliedList(
              reconcileChatSnapshot(prev, unrepliedUsers),
            );
          });
        } else if (Array.isArray(addNewChatsPayload.chats)) {
          const fromLegacy = snapshotRows.filter(
            (user) => user.isUnreplied === true,
          );
          markUnrepliedListLive();
          setUnrepliedChats(commitUnrepliedList(fromLegacy));
        }

        if (Array.isArray(addNewChatsPayload.chats) || snapshotRows.length > 0) {
          setActiveChats((prevChats) => {
            if (prevChats.length === 0) {
              return snapshotRows;
            }

            const incomingById = new Map<string, ChatUser>();
            for (const user of snapshotRows) {
              incomingById.set(user.id || `u:${user.user_id}`, user);
            }

            const updatedChats = prevChats.map((existingChat) => {
              const key = existingChat.id || `u:${existingChat.user_id}`;
              const incomingChat = incomingById.get(key);
              if (!incomingChat) return existingChat;

              incomingById.delete(key);
              if (!hasSignificantChanges(existingChat, incomingChat)) {
                return existingChat;
              }
              return mergeChatRow(existingChat, incomingChat);
            });

            const newChats = Array.from(incomingById.values());
            return newChats.length > 0 ? [...newChats, ...updatedChats] : updatedChats;
          });
        }

        setIsLoading(false);

        // The connect payload is the authoritative seed for both socket tabs.
        // Returning here stops the generic `chats` fallback below from
        // re-deriving Unreplied/Online from the optional legacy recent list,
        // which wiped the seed whenever the server sent one.
        return;
      }

      if ((messageWrapper && (messageWrapper.type === 'update_chat' || messageWrapper.type === 'new_message')) ||
        (data.type === 'update_chat' || data.type === 'new_message')) {
        const updateData = (messageWrapper || data) as Record<string, unknown>;
        if (updateData.last_message || updateData.message) {
          // Keyed by chatroom id so a message for one player cannot cancel
          // another player's pending update.
          const updateUserId = Number(updateData.user_id ?? updateData.player_id ?? 0);
          const updateChatId = pickChatroomIdFromRow(updateData, updateUserId) || `u:${updateUserId}`;
          debouncedChatUpdateRef.current(updateChatId, updateData);
        }
      }

      // Handle chat removal
      if ((messageWrapper && messageWrapper.type === 'remove_chat_from_list') || data.type === 'remove_chat_from_list') {
        const removePayload = (messageWrapper || data) as Record<string, unknown>;
        const chatIdToRemove = removePayload.chat_id ?? data.chat_id;
        const userIdToRemove =
          removePayload.user_id ??
          removePayload.player_id ??
          data.user_id ??
          data.player_id;
        if (!IS_PROD) console.log(`🗑️ [Chat Users] Removing chat:`, { chatIdToRemove, userIdToRemove });

        const removeRow = (list: ChatUser[]) =>
          removeChatRowByRef(list, { chatId: chatIdToRemove as string | number | null, userId: userIdToRemove as string | number | null });

        setActiveChats(removeRow);
        setOnlineChats(removeRow);
        setUnrepliedChats((prev) => commitUnrepliedList(removeRow(prev)));
        setAllPlayers(removeRow);
      }

      // Handle mark_message_as_read - update unread count when messages are marked as read
      if (messageType === 'mark_message_as_read' || messageType === 'read') {
        const chatId = data.chat_id || messageWrapper?.chat_id;
        const userId = data.user_id || data.player_id || messageWrapper?.user_id || messageWrapper?.player_id;

        if (chatId || userId) {
          if (!IS_PROD) console.log('✅ [Chat Users] Messages marked as read, updating unread count:', { chatId, userId });

          // Every list that renders an unread badge must be patched, not just
          // the legacy active-chats one: Online and Unreplied read their own
          // arrays, so they kept the dot after the admin opened the chat.
          const receipt = {
            chatId: chatId as string | number | null | undefined,
            userId: userId as string | number | null | undefined,
          };
          const clearReceipt = (list: ChatUser[]) => clearUnreadChatRow(list, receipt);

          setActiveChats(clearReceipt);
          setOnlineChats(clearReceipt);
          setUnrepliedChats(clearReceipt);
          setAllPlayers(clearReceipt);
        }
        return;
      }

      // Handle update_chat with unread_count = 0 (when messages are marked as read)
      if ((messageWrapper && messageWrapper.type === 'update_chat') || data.type === 'update_chat') {
        const updateData = messageWrapper || data;
        const userId = Number(updateData.user_id ?? updateData.player_id ?? 0);
        const chatId = pickChatroomIdFromRow(updateData, userId);
        const unreadCount = extractUnreadCount(updateData);

        // If unread count is explicitly 0, update immediately (messages marked as read)
        if (unreadCount === 0 && chatId) {
          if (!IS_PROD) console.log('✅ [Chat Users] Unread count updated to 0 via WebSocket:', chatId);

          const clearReceipt = (list: ChatUser[]) =>
            clearUnreadChatRow(list, { chatId, userId });

          setActiveChats(clearReceipt);
          setOnlineChats(clearReceipt);
          setUnrepliedChats(clearReceipt);
          setAllPlayers(clearReceipt);
        }
      }

      // Handle re_arrange — the live chat-list update.
      //
      // `is_unreplied` is the server's verdict (system/auto messages never flip
      // it on their own), so membership in the Unreplied tab is decided from
      // that field alone, not from the last message sender.
      if (reArrangePayload) {
        const row = transformChatToUser(reArrangePayload);
        const nestedPlayer =
          reArrangePayload.player && typeof reArrangePayload.player === 'object'
            ? (reArrangePayload.player as Record<string, unknown>)
            : undefined;
        const isUnreplied =
          readOptionalBoolean(reArrangePayload, 'is_unreplied') ??
          readOptionalBoolean(nestedPlayer, 'is_unreplied');
        const isOnline =
          readOptionalBoolean(reArrangePayload, 'is_online') ??
          readOptionalBoolean(nestedPlayer, 'is_online') ??
          readOptionalBoolean(nestedPlayer, 'isOnline');
        const flags = { isOnline, isUnreplied };

        if (!IS_PROD) {
          console.log('🔀 [Chat Users] re_arrange:', {
            chatId: row.id,
            userId: row.user_id,
            isUnreplied,
            isOnline,
          });
        }

        if (isUnreplied === true) {
          markUnrepliedListLive();
          setUnrepliedChats((prev) =>
            commitUnrepliedList(
              upsertChatRowByLatestMessage(prev, row, flags),
            ),
          );
        } else if (isUnreplied === false) {
          markUnrepliedListLive();
          setUnrepliedChats((prev) =>
            commitUnrepliedList(removeChatRow(prev, row)),
          );
        } else {
          setUnrepliedChats((prev) => patchChatRow(prev, row, flags));
        }

        if (isOnline === true) {
          noteSocketPresence(row.user_id, true);
          setOnlineChats((prev) => upsertChatRowByLatestMessage(prev, row, flags));
        } else if (isOnline === false) {
          noteSocketPresence(row.user_id, false);
          setOnlineChats((prev) => removeChatRow(prev, row));
        } else {
          setOnlineChats((prev) => patchChatRow(prev, row, flags));
        }

        // Keep the sidebar unread badges in sync without a REST refetch.
        // An absent row is only added when it represents new inbound activity;
        // otherwise a read receipt for a chat we never listed would land at
        // the top of the merged All Players order.
        setActiveChats((prev) => {
          const exists = prev.some((chat) => chatRowMatches(chat, row));
          const isNewInbound =
            row.isUnreplied === true || (row.unreadCount ?? 0) > 0;
          if (!exists && !isNewInbound) return prev;
          return upsertChatRowByLatestMessage(prev, row, flags);
        });

        // All Players is REST-owned: patch the row in place when it is already
        // loaded, but never insert or refetch on socket traffic.
        setAllPlayers((prev) => patchChatRow(prev, row, flags));
        return;
      }

      // Fallback for other formats
      if (data.chats && Array.isArray(data.chats)) {
        const transformedUsers = data.chats.map((c) => transformChatToUser(c as Record<string, unknown>));
        setActiveChats((prev) => reconcileChatSnapshot(prev, transformedUsers));
        setOnlineChats((prev) =>
          reconcileChatSnapshot(prev, transformedUsers.filter((user) => user.isOnline)),
        );
        setUnrepliedChats((prev) =>
          commitUnrepliedList(
            reconcileChatSnapshot(
              prev,
              transformedUsers.filter((user) => user.isUnreplied === true),
            ),
          ),
        );
        markUnrepliedListLive();
        setIsLoading(false);
      }

    } catch (error) {
      console.error('❌ [Chat Users] Failed to parse message:', error);
    }
  }, [invalidatePlayersCache, commitUnrepliedList, markUnrepliedListLive, noteSocketPresence]);

  const disconnect = useCallback(() => {
    if (wsUrlRef.current) {
      // Disconnect all listeners for this URL
      listenersRef.current.forEach(listeners => {
        websocketManager.disconnect(wsUrlRef.current, listeners);
      });
      listenersRef.current.clear();
    }

    setIsConnected(false);
    setError(null);
  }, []);


  const refetch = useCallback(async () => {
    disconnect();
    connect();
  }, [connect, disconnect]);

  /**
   * Refresh active chats from the admin chat endpoint.
   *
   * This is a REST fallback only. Socket traffic must not call it — Online and
   * Unreplied are kept current by `add_new_chats` + `re_arrange`.
   *
   * API Response Format:
   * {
   *   chats: [...],           // Chat objects with basic info
   *   player: [...],          // Player objects with FULL data including chat context
   *   pagination: {...}
   * }
   */
  const refreshActiveChats = useCallback(async () => {
    if (!IS_PROD) console.log('🔄 [refreshActiveChats] Fetching latest chat list from backend...');

    // Coalesce: a burst of callers collapses into a single trailing request
    // rather than one row fetch each.
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      if (!IS_PROD) console.log('⏳ [refreshActiveChats] already in flight; queuing one trailing refresh');
      return refreshInFlightRef.current;
    }

    // Sequence: a slow response must never overwrite a newer one. Each call
    // takes a ticket; only the newest ticket is allowed to commit.
    const ticket = ++refreshSeqRef.current;
    const isStale = () => ticket !== refreshSeqRef.current;

    const run = (async () => {
      const controller = new AbortController();
      refreshAbortRef.current = controller;

      try {
        const token = storage.get(TOKEN_KEY);
        //  Use the correct admin chat endpoint that returns chat context
        const response = await fetch('/api/chat-all-players?page=1&page_size=100', {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Match the WebSocket hook: an expired session should land on login
            // rather than retrying silently every 10 seconds.
            setError('Session expired, please log in again');
          } else if (!isStale()) {
            setError(`Could not refresh the chat list (${response.status})`);
          }
          console.error('❌ [refreshActiveChats] Failed to fetch:', response.status);
          return;
        }

        const data = await response.json();
        if (isStale()) {
          if (!IS_PROD) console.log('⏭️ [refreshActiveChats] discarding superseded response');
          return;
        }
      const listTotal = readChatListTotalCount(data as Record<string, unknown>);
      if (listTotal != null) {
        setPlayersWithChatsTotalCount(listTotal);
      }
      const counts = extractChatListServerCounts(data as Record<string, unknown>);
      applyChatListServerCounts(counts);
      if (!IS_PROD) console.log('🔄 [refreshActiveChats] Raw API response:', {
        hasPlayer: !!data.player,
        playerCount: data.player?.length,
        hasChats: !!data.chats,
        chatsCount: data.chats?.length,
        hasPagination: !!data.pagination,
      });

      const playerRows = extractPlayerArrayFromAdminChatResponse(data as Record<string, unknown>);
      if (playerRows.length > 0) {
        let transformedUsers: ChatUser[];
        try {
          transformedUsers = playerRows.map(mapAdminSearchRowToChatUser);
        } catch (transformError) {
          console.error('❌ [refreshActiveChats] mapAdminSearchRowToChatUser failed:', transformError);
          return;
        }
        if (!IS_PROD) console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} players with chat data`);

        if (!IS_PROD && playerRows.length > 0) {
          console.log('🔍 [refreshActiveChats] Sample player data:', {
            username: playerRows[0].username,
            unread_messages_count: playerRows[0].unread_messages_count,
            last_message: (playerRows[0].last_message as string | undefined)?.substring(0, 30),
            chatroom_id: playerRows[0].chatroom_id,
          });
        }

        // Update state with fresh data from backend. Do not touch Unreplied —
        // directory refreshes are not a membership source for that tab.
        setActiveChats(transformedUsers);

        // Log chats with unread counts for debugging
        const chatsWithUnread = transformedUsers.filter((c: ChatUser) => (c.unreadCount ?? 0) > 0);
        if (!IS_PROD && chatsWithUnread.length > 0) {
          console.log(`📬 [refreshActiveChats] ${chatsWithUnread.length} chats with unread messages:`,
            chatsWithUnread.map((c: ChatUser) => ({
              username: c.username,
              unreadCount: c.unreadCount,
              lastMessage: c.lastMessage?.substring(0, 30)
            }))
          );
        } else {
          if (!IS_PROD) console.log('📭 [refreshActiveChats] No unread messages');
        }
      } else if (data.chats && Array.isArray(data.chats)) {
        // Fallback to chats format if player array is not present
        let transformedUsers: ChatUser[];
        try {
          transformedUsers = data.chats.map((c: unknown) => transformChatToUser(c as Record<string, unknown>));
        } catch (transformError) {
          console.error('❌ [refreshActiveChats] transformChatToUser failed:', transformError);
          return;
        }
        if (!IS_PROD) console.log(` [refreshActiveChats] Fetched ${transformedUsers.length} chats (fallback format)`);
        setActiveChats(transformedUsers);
      } else {
        console.warn('⚠️ [refreshActiveChats] Unexpected API response format - no player or chats array');
      }
      } catch (error) {
        // An abort here is our own cancellation, not a failure.
        if (error instanceof Error && error.name === 'AbortError') return;
        console.error('❌ [refreshActiveChats] Error:', error);
        if (!isStale()) setError('Could not refresh the chat list. Please try again.');
      } finally {
        refreshAbortRef.current = null;
        refreshInFlightRef.current = null;
      }

      // Run exactly one trailing refresh for anything that arrived mid-flight.
      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        void refreshActiveChatsRef.current?.();
      }
    })();

    refreshInFlightRef.current = run;
    return run;
  }, [applyChatListServerCounts]);

  // FIX #4: Keep refreshActiveChats ref in sync via useEffect (not self-referencing)
  useEffect(() => {
    refreshActiveChatsRef.current = refreshActiveChats;
  }, [refreshActiveChats]);

  /**
   * Fetch ALL players from REST API endpoint (First page)
   *  PERFORMANCE: Cached for 5 minutes to avoid redundant API calls
   * `force` skips the cache — the manual refresh path passes it so the button
   * actually hits the network instead of re-serving the snapshot.
   * Note: Last messages are provided by WebSocket and merged in chat-component
   */
  const fetchAllPlayers = useCallback(async (options?: { force?: boolean }) => {
    const force = options?.force === true;

    // Set loading state IMMEDIATELY before any checks
    if (!IS_PROD) console.log('🚀 fetchAllPlayers - Starting');
    setIsLoadingAllPlayers(true);

    try {
      //  PERFORMANCE: Check cache first
      const now = Date.now();
      if (!force && playersCacheRef.current && (now - playersCacheRef.current.timestamp) < CACHE_TTL) {
        if (!IS_PROD) console.log(' Using cached chats data, count:', playersCacheRef.current.data.length);
        setAllPlayers(playersCacheRef.current.data);
        setChatListOnlinePlayersCount(playersCacheRef.current.onlinePlayersCount);
        setChatListAllPlayersCount(playersCacheRef.current.allPlayersCount);
        // Small delay to show skeleton briefly even with cache
        await new Promise(resolve => setTimeout(resolve, 150));
        return;
      }

      setError(null);
      if (!IS_PROD) console.log('📥 Fetching all players via REST API (page 1)...');

      const token = storage.get(TOKEN_KEY);
      const response = await fetch(`/api/chat-all-players?page=1&page_size=${pageSize}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to fetch all players');
      }

      const data = await response.json();

      // Handle both response formats: 'player' array (new endpoint) or 'results' array (old endpoint)
      const playersArray = extractPlayerArrayFromAdminChatResponse(data as Record<string, unknown>);
      const pagination = data.pagination;
      const listTotal = readChatListTotalCount(data as Record<string, unknown>);
      if (listTotal != null) {
        setPlayersWithChatsTotalCount(listTotal);
      }
      const counts = extractChatListServerCounts(data as Record<string, unknown>);
      applyChatListServerCounts(counts);
      const totalCount = data.count || pagination?.total_count || playersArray?.length || 0;

      if (!IS_PROD) console.log(`📊 REST API returned ${playersArray?.length || 0} of ${totalCount} players`);
      if (!IS_PROD) console.log(`📄 Pagination:`, pagination);

      if (playersArray && Array.isArray(playersArray)) {
        const transformedUsers = playersArray.map(mapAdminSearchRowToChatUser);
        setAllPlayers(transformedUsers);

        // Update pagination state
        if (pagination) {
          setCurrentPage(pagination.page || 1);
          setTotalPages(pagination.total_pages || 1);
          setHasMorePlayers(pagination.has_next || false);
        } else {
          setCurrentPage(1);
          setHasMorePlayers(false);
        }

        //  PERFORMANCE: Update cache
        playersCacheRef.current = {
          data: transformedUsers,
          timestamp: now,
          onlinePlayersCount: counts.onlinePlayersCount,
          allPlayersCount: counts.allPlayersCount,
          unrepliedPlayersCount: counts.unrepliedPlayersCount,
        };
      } else {
        console.warn('⚠️ No player or results array in response');
        setAllPlayers([]);
        setHasMorePlayers(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all players';
      console.error('❌ Error fetching all players:', errorMessage);
      setError(errorMessage);
    } finally {
      if (!IS_PROD) console.log('🏁 fetchAllPlayers - Complete');
      setIsLoadingAllPlayers(false); // Use separate loading state
    }
  }, [CACHE_TTL, pageSize, applyChatListServerCounts]);

  /**
   * Load more players (next page) for infinite scroll
   */
  const loadMorePlayers = useCallback(async () => {
    if (!hasMorePlayers || isLoadingMore || isLoadingAllPlayers) {
      if (!IS_PROD) console.log('🚫 Cannot load more:', { hasMorePlayers, isLoadingMore, isLoadingAllPlayers });
      return;
    }

    const nextPage = currentPage + 1;
    if (!IS_PROD) console.log(`🔄 Loading more players - page ${nextPage}...`);
    setIsLoadingMore(true);

    try {
      const token = storage.get(TOKEN_KEY);
      const response = await fetch(`/api/chat-all-players?page=${nextPage}&page_size=${pageSize}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to load more players');
      }

      const data = await response.json();
      const playersArray = extractPlayerArrayFromAdminChatResponse(data as Record<string, unknown>);
      const pagination = data.pagination;
      const listTotal = readChatListTotalCount(data as Record<string, unknown>);
      if (listTotal != null) {
        setPlayersWithChatsTotalCount(listTotal);
      }
      const counts = extractChatListServerCounts(data as Record<string, unknown>);
      applyChatListServerCounts(counts);

      if (!IS_PROD) console.log(`📊 Loaded ${playersArray?.length || 0} more players (page ${nextPage})`);
      if (!IS_PROD) console.log(`📄 Pagination:`, pagination);

      if (playersArray && Array.isArray(playersArray)) {
        const transformedUsers = playersArray.map(mapAdminSearchRowToChatUser);

        // Append new players to existing list.
        // Dedupe by user_id: the upstream list is ordered by last-message time,
        // which shifts between requests, so offset pagination can re-serve a
        // row that was already on the previous page.
        setAllPlayers((prev) => {
          const seen = new Set(prev.map((p) => p.user_id));
          const fresh = transformedUsers.filter((p) => !seen.has(p.user_id));
          if (fresh.length !== transformedUsers.length) {
            console.warn(
              `⚠️ [loadMorePlayers] dropped ${transformedUsers.length - fresh.length} duplicate row(s)`,
            );
          }
          return fresh.length > 0 ? [...prev, ...fresh] : prev;
        });
        invalidatePlayersCache();

        // Update pagination state
        if (pagination) {
          setCurrentPage(pagination.page || nextPage);
          setTotalPages(pagination.total_pages || totalPages);
          setHasMorePlayers(pagination.has_next || false);
        } else {
          setHasMorePlayers(false);
        }

        // Invalidate cache since we now have more data
        playersCacheRef.current = null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more players';
      console.error('❌ Error loading more players:', errorMessage);
      // Don't set main error to avoid disrupting the UI
    } finally {
      setIsLoadingMore(false);
      if (!IS_PROD) console.log('🏁 loadMorePlayers - Complete');
    }
  }, [
    hasMorePlayers,
    isLoadingMore,
    isLoadingAllPlayers,
    currentPage,
    pageSize,
    totalPages,
    invalidatePlayersCache,
    applyChatListServerCounts,
  ]);

  /**
   * REST fallback for the Unreplied badge/list on first paint.
   *
   * Live membership still comes from `/ws/chatlist/` (`add_new_chats.unreplied`
   * + `re_arrange`). When that socket seed is missing, the tab stayed at 0
   * until the next inbound message — even though `/api/chat-all-players`
   * already returns `counts.unreplied_players_count` and `is_unreplied` rows.
   */
  const seedUnrepliedFromRestApi = useCallback(async () => {
    if (unrepliedSocketSeededRef.current) return;

    try {
      const token = storage.get(TOKEN_KEY);
      const response = await fetch('/api/chat-all-players?page=1&page_size=100', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) return;

      const data = await response.json();
      if (unrepliedSocketSeededRef.current) return;

      applyChatListServerCounts(
        extractChatListServerCounts(data as Record<string, unknown>),
        { unreplied: true },
      );
      const listTotal = readChatListTotalCount(data as Record<string, unknown>);
      if (listTotal != null) {
        setPlayersWithChatsTotalCount(listTotal);
      }

      const rows = extractPlayerArrayFromAdminChatResponse(
        data as Record<string, unknown>,
      ).map(mapAdminSearchRowToChatUser);
      seedUnrepliedFromRestRows(rows);
    } catch (error) {
      if (!IS_PROD) {
        console.warn('⚠️ [seedUnreplied] REST seed failed:', error);
      }
    }
  }, [applyChatListServerCounts, seedUnrepliedFromRestRows]);

  // Connect on mount
  useEffect(() => {
    if (effectiveEnabled && adminId) {
      connect();
      void seedUnrepliedFromRestApi();
    }

    return () => {
      disconnect();
    };
  }, [effectiveEnabled, adminId, connect, disconnect, seedUnrepliedFromRestApi]);

  // No polling: Online stays socket-driven. Unreplied is socket-driven after the
  // connect snapshot; the one-shot REST seed above only covers a missing seed.
  // `/api/chat-all-players` directory pages still load only for All Players.

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  //  PERFORMANCE: Memoize online users using both chat list and player directory
  const onlineUsers = useMemo(() => {
    const seen = new Set<string>();

    return [...onlineChats, ...activeChats, ...allPlayers].filter((user) => {
      if (!user.isOnline) {
        return false;
      }

      const key = user.user_id ? String(user.user_id) : user.id;
      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }, [onlineChats, activeChats, allPlayers]);

  /**
   * Update a specific chat's last message and time in the active chats list
   * This is called when a new message is received in real-time
   */
  const updateChatLastMessage = useCallback((
    userId: number,
    chatId: string,
    lastMessage: string,
    lastMessageTime: string
  ) => {
    // Validate timestamp before using it
    const validTimestamp = isValidTimestamp(lastMessageTime) ? lastMessageTime : undefined;

    if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Called with:`, {
      userId,
      chatId,
      lastMessage: lastMessage.substring(0, 30),
      lastMessageTime,
      validTimestamp,
    });

    setActiveChats((prevChats) => {
      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Current activeChats count: ${prevChats.length}`);

      // Find and update the matching chat
      const chatIndex = prevChats.findIndex(
        (chat) => chat.id === chatId || chat.user_id === userId
      );

      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Found chat at index: ${chatIndex}`);

      if (chatIndex === -1) {
        // Chat not found in active chats - this could be a new conversation
        // The WebSocket should send an update to add it, but we can log this
        if (!IS_PROD) console.warn(`⚠️ [updateChatLastMessage] Chat not found! Looking for chatId: ${chatId} or userId: ${userId}`);
        if (!IS_PROD) console.log(`⚠️ [updateChatLastMessage] Available chats:`, prevChats.map(c => ({ id: c.id, user_id: c.user_id, username: c.username })));
        return prevChats;
      }

      const oldChat = prevChats[chatIndex];
      if (!IS_PROD) console.log(`📝 [updateChatLastMessage] Updating chat:`, {
        username: oldChat.username,
        oldLastMessage: oldChat.lastMessage?.substring(0, 30),
        newLastMessage: lastMessage.substring(0, 30),
      });

      // Content only. Ordering belongs to the chat-list socket (`re_arrange`),
      // never to the open conversation's message stream — a replayed message on
      // connect used to push the open row to the top.
      const updatedChats = [...prevChats];
      updatedChats[chatIndex] = {
        ...updatedChats[chatIndex],
        lastMessage,
        lastMessageTime: validTimestamp ?? updatedChats[chatIndex].lastMessageTime,
      };
      return updatedChats;
    });

    // Also update in allPlayers list if present
    setAllPlayers((prevPlayers) => {
      const playerIndex = prevPlayers.findIndex(
        (player) => player.user_id === userId
      );

      if (playerIndex === -1) {
        return prevPlayers;
      }

      const updatedPlayers = [...prevPlayers];
      updatedPlayers[playerIndex] = {
        ...updatedPlayers[playerIndex],
        lastMessage,
        lastMessageTime: validTimestamp,
      };

      return updatedPlayers;
    });
  }, []);

  /**
   * Reset unread count for a specific chat. Called when the admin opens a conversation.
   */
  const markChatAsRead = useCallback(({ chatId, userId }: { chatId?: string; userId?: number }) => {
    const normalizedChatId = chatId ? String(chatId) : null;
    const normalizedUserId = typeof userId === 'number' && Number.isFinite(userId) ? userId : null;

    if (!normalizedChatId && !normalizedUserId) {
      return;
    }

    // Clear the badge in every list the tabs render from. The row itself stays
    // in Unreplied — opening a chat is not a reply.
    const clearReceipt = (list: ChatUser[]) =>
      clearUnreadChatRow(list, {
        chatId: normalizedChatId,
        userId: normalizedUserId,
      });

    setActiveChats(clearReceipt);
    setOnlineChats(clearReceipt);
    setUnrepliedChats(clearReceipt);
    setAllPlayers(clearReceipt);
  }, []);

  /**
   * Debounced version of markChatAsRead to prevent rapid calls.
   *
   * Keyed by chatroom id internally so the call signature stays unchanged. With
   * a single shared timer, marking chat B read within 300ms of chat A discarded
   * A's receipt and left its unread badge on screen.
   */
  const markChatAsReadDebounced = useMemo(() => {
    const byKey = debounceByKey(
      (_key: string, params: { chatId?: string; userId?: number }) => {
        markChatAsRead(params);
      },
      300
    );
    markChatAsReadDebouncedRef.current = byKey;
    return (params: { chatId?: string; userId?: number }) => {
      byKey(params.chatId || `u:${params.userId ?? 'unknown'}`, params);
    };
  }, [markChatAsRead]);

  // Pending timers must not fire after unmount (setState on an unmounted hook).
  useEffect(() => {
    const chatUpdates = debouncedChatUpdateRef.current;
    return () => {
      chatUpdates.cancel();
      markChatAsReadDebouncedRef.current?.cancel();
    };
  }, []);

  return {
    users: activeChats, // For backward compatibility - return active chats as "users"
    onlineChats,
    unrepliedChats,
    allPlayers,
    onlineUsers,
    isLoading,
    isLoadingAllPlayers,
    isLoadingMore,
    error,
    isConnected, // Add connection status
    refetch,
    fetchAllPlayers,
    loadMorePlayers,
    hasMorePlayers,
    playersWithChatsTotalCount,
    chatListOnlinePlayersCount,
    chatListAllPlayersCount,
    chatListUnrepliedPlayersCount,
    unrepliedListLive,
    socketOfflineUserIds,
    acknowledgeStaffReply,
    refreshActiveChats,
    invalidatePlayersCache,
    updateChatLastMessage,
    markChatAsRead,
    markChatAsReadDebounced, // Debounced version for performance
  };
}


