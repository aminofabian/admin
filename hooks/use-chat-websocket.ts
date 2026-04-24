import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE_URL, WEBSOCKET_BASE_URL, TOKEN_KEY } from '@/lib/constants/api';
import { storage } from '@/lib/utils/storage';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { websocketManager, createWebSocketUrl, type WebSocketListeners } from '@/lib/websocket-manager';
import type { ChatMessage, WebSocketMessage } from '@/types';

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';
const MESSAGES_PER_PAGE = 20;

type HistoryMergeMode = 'prepend' | 'replace';

const ensurePositiveInteger = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
};

interface HistoryPayload {
  messages: ChatMessage[];
  page: number;
  totalPages: number;
  notes?: string;
  playerLastSeenAt?: string;
}

interface RawChatMessage {
  id?: string | number;
  message_id?: string | number;
  message?: string;
  sender?: string;
  sender_id?: number;
  is_player_sender?: boolean;
  sent_time?: string;
  timestamp?: string;
  is_read?: boolean;
  type?: string;
  is_comment?: boolean;
  is_file?: boolean;
  file_extension?: string;
  file?: string;
  file_url?: string;
  user_balance?: string | number;
  balance?: string | number;
  player_bal?: string | number;
  winning_balance?: string | number;
  player_winning_bal?: string | number;
  is_pinned?: boolean;
  isPinned?: boolean;
  text?: string;
  player_id?: number;
  user_id?: number;
  is_active?: boolean;
  username?: string;
  error?: string;
  sent_by?: {
    id: number;
    username: string;
    full_name?: string | null;
    role?: string;
    profile_pic?: string | null;
  };
  operationType?: 'increase' | 'decrease' | null;
  cashout_limit?: string | number | null;
  player_cashout_limit?: string | number | null;
  locked_balance?: string | number | null;
  player_locked_balance?: string | number | null;
  cashoutLimit?: string | number | null;
  lockedBalance?: string | number | null;
  credits_balance?: string | number | null;
  player?: {
    cashout_limit?: string | number | null;
    player_cashout_limit?: string | number | null;
    locked_balance?: string | number | null;
    player_locked_balance?: string | number | null;
    cashoutLimit?: string | number | null;
    lockedBalance?: string | number | null;
    credits_balance?: string | number | null;
  };
  payload?: {
    event?: string;
    credits_balance?: string | number | null;
    cashout_limit?: string | number | null;
    locked_balance?: string | number | null;
    winning_balance?: string | number | null;
    balance?: string | number | null;
    user_balance?: string | number | null;
    player_bal?: string | number | null;
    player_winning_bal?: string | number | null;
    [key: string]: unknown;
  };
}

const mapHistoryMessage = (msg: RawChatMessage): ChatMessage => {
  const sender: 'player' | 'admin' =
    msg.sender === 'company' || msg.sender === 'admin' ? 'admin' : 'player';

  const timestamp = msg.sent_time ?? msg.timestamp ?? new Date().toISOString();
  const messageDate = new Date(timestamp);

  // Map sent_by data if available
  const sentBy = msg.sent_by ? {
    id: msg.sent_by.id,
    username: msg.sent_by.username,
    fullName: msg.sent_by.full_name ?? null,
    role: msg.sent_by.role,
    profilePic: msg.sent_by.profile_pic ?? null,
  } : undefined;

  return {
    id: String(msg.id ?? msg.message_id ?? Date.now()),
    text: msg.message ?? '',
    sender,
    timestamp: messageDate.toISOString(),
    date: messageDate.toISOString().split('T')[0],
    time: messageDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    isRead: Boolean(msg.is_read),
    userId: msg.sender_id,
    type: msg.type,
    isComment: msg.is_comment ?? false,
    isFile: msg.is_file ?? false,
    fileExtension: msg.file_extension ?? undefined,
    fileUrl: msg.file || msg.file_url || undefined,
    userBalance: msg.user_balance !== undefined ? String(msg.user_balance) : (msg.balance !== undefined ? String(msg.balance) : undefined),
    isPinned: msg.is_pinned ?? msg.isPinned ?? false,
    senderId: typeof msg.sender_id === 'number' ? msg.sender_id : undefined,
    sentBy,
  };
};

const normalizeHistoryMessages = (rawMessages: RawChatMessage[]): ChatMessage[] =>
  rawMessages.map(mapHistoryMessage).reverse();

const mergeMessageLists = (
  incoming: ChatMessage[],
  existing: ChatMessage[],
  mode: HistoryMergeMode,
): ChatMessage[] => {
  const combined = mode === 'prepend' ? [...incoming, ...existing] : incoming;
  const deduped = new Map<string, ChatMessage>();

  combined.forEach((message) => {
    if (deduped.has(message.id)) {
      return;
    }
    deduped.set(message.id, message);
  });

  return Array.from(deduped.values()).sort((left, right) => {
    const leftTime = new Date(left.timestamp).getTime();
    const rightTime = new Date(right.timestamp).getTime();
    return leftTime - rightTime;
  });
};

interface UseChatWebSocketParams {
  userId: number | null;
  chatId: string | null; // The chatroom ID for fetching message history
  adminId: number;
  enabled: boolean;
  onMessageReceived?: (message: ChatMessage) => void; // Callback to update chat list
  /**
   * `winningBalance` only present when the WS payload included a winnings field (omit when single-balance).
   * `cashoutLimit` / `lockedBalance` when the room WS includes ledger fields (same as chat-list WS).
   */
  onBalanceUpdated?: (data: {
    playerId: number;
    balance: string;
    winningBalance?: string;
    cashoutLimit?: string;
    lockedBalance?: string;
  }) => void;
}

interface UseChatWebSocketReturn {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  isUserOnline: boolean;
  sendMessage: (text: string) => void;
  markAsRead: (messageId: string) => void;
  markAllAsRead: () => void;
  connectionError: string | null;
  purchaseHistory: ChatMessage[];
  fetchPurchaseHistory: () => Promise<void>;
  isPurchaseHistoryLoading: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  hasMoreHistory: boolean;
  isHistoryLoading: boolean;
  updateMessagePinnedState: (messageId: string, pinned: boolean) => void;
  refreshMessages: () => Promise<void>;
  updateMessagesBalance: (balance: string, winningBalance: string) => void;
  notes: string;
  playerLastSeenAt: string | null;
}

export function useChatWebSocket({
  userId,
  chatId,
  adminId,
  enabled,
  onMessageReceived,
  onBalanceUpdated,
}: UseChatWebSocketParams): UseChatWebSocketReturn {
  const { user } = useAuth();
  const isAgent = user?.role === USER_ROLES.AGENT;
  const effectiveEnabled = enabled && !isAgent;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isUserOnline, setIsUserOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<ChatMessage[]>([]);
  const [isPurchaseHistoryLoading, setIsPurchaseHistoryLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 0, totalPages: 0 });
  const [notes, setNotes] = useState<string>('');
  const [playerLastSeenAt, setPlayerLastSeenAt] = useState<string | null>(null);

  // WebSocket management refs
  const wsUrlRef = useRef<string>('');
  const listenersRef = useRef<WebSocketListeners | null>(null);
  const historyRequestRef = useRef(0);
  const purchaseRequestRef = useRef(0);
  const activeConnectionKeyRef = useRef('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Connection state for message sending decisions
  const connectionStateRef = useRef<'disconnected' | 'connecting' | 'connected'>('disconnected');

  // Message queue for messages sent while connecting
  const messageQueueRef = useRef<Array<{ text: string; timestamp: number }>>([]);
  const connectionWaitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const CONNECTION_WAIT_TIMEOUT = 3000; // Wait 3 seconds for connection before falling back

  // Use ref to avoid reconnecting WebSocket when callback changes
  const onMessageReceivedRef = useRef(onMessageReceived);
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  const onBalanceUpdatedRef = useRef(onBalanceUpdated);
  useEffect(() => {
    onBalanceUpdatedRef.current = onBalanceUpdated;
  }, [onBalanceUpdated]);

  useEffect(() => {
    setMessages([]);
    setPurchaseHistory([]);
    setIsTyping(false);
    setNotes('');
    setPlayerLastSeenAt(null);
    setIsUserOnline(false);
    setIsHistoryLoading(false);
    setHasMoreHistory(false);
    setHistoryPagination({ page: 0, totalPages: 0 });

    if (effectiveEnabled) {
      setConnectionError(null);
    }
  }, [chatId, userId, effectiveEnabled]);

  const requestHistory = useCallback(async (page: number): Promise<HistoryPayload | null> => {
    if (!chatId && !userId) {
      return null;
    }

    try {
      !IS_PROD && console.log('📜 Fetching message history...', { chatId, userId, page });

      const token = storage.get(TOKEN_KEY);
      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return null;
      }

      const params = new URLSearchParams({
        per_page: String(MESSAGES_PER_PAGE),
        page: String(page),
      });

      if (chatId) {
        params.append('chatroom_id', chatId);
      }

      if (userId) {
        params.append('user_id', String(userId));
      }

      const response = await fetch(`/api/chat-messages?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch message history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
        });

        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Authentication failed - redirecting to login');
          storage.clear();
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }

        return null;
      }

      const data = await response.json();
      const requestedPage = ensurePositiveInteger(page, 1);
      const resolvedPage = ensurePositiveInteger(
        data.page ?? data.current_page,
        requestedPage,
      );

      const resolvedTotalPages = ensurePositiveInteger(
        data.total_pages ?? data.totalPages ?? data.page_count,
        resolvedPage,
      );

      const payload: HistoryPayload = {
        messages: Array.isArray(data.messages) ? normalizeHistoryMessages(data.messages) : [],
        page: resolvedPage,
        totalPages: resolvedTotalPages,
        notes: data.notes ?? '',
        playerLastSeenAt: data.player_last_seen_at ?? undefined,
      };

      !IS_PROD && console.log(
        ` Loaded ${payload.messages.length} of ${data.total_count ?? payload.messages.length} messages (page ${payload.page}/${payload.totalPages})`,
      );

      !IS_PROD && console.log('📝 Notes from API:', data.notes);
      !IS_PROD && console.log('👁️ Player last seen at:', data.player_last_seen_at);

      return payload;
    } catch (error) {
      console.error('❌ Failed to fetch message history:', error);
      return null;
    }
  }, [chatId, userId]);

  const fetchMessageHistory = useCallback(
    async (page: number, mode: HistoryMergeMode): Promise<number> => {
      if (!chatId && !userId) {
        return 0;
      }

      const requestId = historyRequestRef.current + 1;
      historyRequestRef.current = requestId;
      setIsHistoryLoading(true);

      try {
        const payload = await requestHistory(page);
        if (!payload) {
          return 0;
        }

        if (historyRequestRef.current !== requestId) {
          !IS_PROD && console.log('⚠️ Ignoring stale message history response');
          return 0;
        }

        let added = 0;
        setMessages((prev) => {
          const merged = mergeMessageLists(payload.messages, prev, mode);
          added = merged.length - prev.length;
          return merged;
        });

        setHistoryPagination({
          page: payload.page,
          totalPages: payload.totalPages,
        });
        setHasMoreHistory(payload.page < payload.totalPages);

        // Update notes and player last seen from the first page response
        if (payload.page === 1) {
          if (payload.notes !== undefined) {
            setNotes(payload.notes);
          }
          if (payload.playerLastSeenAt !== undefined) {
            setPlayerLastSeenAt(payload.playerLastSeenAt);
          }
        }

        return added;
      } finally {
        if (historyRequestRef.current === requestId) {
          setIsHistoryLoading(false);
        }
      }
    },
    [chatId, userId, requestHistory],
  );

  const loadOlderMessages = useCallback(async () => {
    if (isHistoryLoading) {
      return { added: 0 };
    }

    const currentPage = Number.isFinite(historyPagination.page)
      ? historyPagination.page
      : 0;
    const nextPage = currentPage > 0 ? currentPage + 1 : 1;

    if (currentPage > 0 && !hasMoreHistory) {
      return { added: 0 };
    }

    const mode: HistoryMergeMode = currentPage > 0 ? 'prepend' : 'replace';
    const added = await fetchMessageHistory(nextPage, mode);
    return { added };
  }, [fetchMessageHistory, hasMoreHistory, historyPagination.page, isHistoryLoading]);

  //  Fetch purchase/transaction history for the chatroom
  const fetchPurchaseHistory = useCallback(async () => {
    if (!chatId && !userId) return;

    const requestId = purchaseRequestRef.current + 1;
    purchaseRequestRef.current = requestId;

    try {
      setIsPurchaseHistoryLoading(true);
      !IS_PROD && console.log(`💰 Fetching purchase history...`, { chatId, userId });

      const token = storage.get(TOKEN_KEY);

      if (!token) {
        console.error('❌ No authentication token found. Please log in again.');
        return;
      }

      //  Try chatId first (could be chatroom_id), fallback to userId (player_id)
      const params = new URLSearchParams();
      if (chatId) params.append('chatroom_id', chatId);
      if (userId) params.append('user_id', String(userId));

      const response = await fetch(`/api/chat-purchases?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch purchase history:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 200),
        });

        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Authentication failed - redirecting to login');
          storage.clear();
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
        }
        return;
      }

      const data = await response.json();

      if (data.messages && Array.isArray(data.messages)) {
        const purchases: ChatMessage[] = data.messages.map((msg: RawChatMessage) => {
          const sender: 'player' | 'admin' =
            msg.sender === 'company' || msg.sender === 'admin'
              ? 'admin'
              : 'player';

          const timestamp = msg.sent_time || new Date().toISOString();
          const messageDate = new Date(timestamp);

          return {
            id: String(msg.id),
            text: msg.message || '',
            sender,
            timestamp: messageDate.toISOString(),
            date: messageDate.toISOString().split('T')[0],
            time: messageDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isRead: true, // Purchase history is always marked as read
            userId: msg.sender_id,
            type: msg.type, // 'message' or other transaction types
            isComment: msg.is_comment || false,
            isFile: msg.is_file || false,
            fileUrl: msg.file || undefined,
          };
        });

        !IS_PROD && console.log(` Loaded ${purchases.length} purchase records (total: ${data.total_count || purchases.length})`);
        if (purchaseRequestRef.current !== requestId) {
          !IS_PROD && console.log('⚠️ Ignoring stale purchase history response');
          return;
        }

        setPurchaseHistory(purchases.reverse()); // Reverse to show oldest first
      }
    } catch (error) {
      console.error('❌ Failed to fetch purchase history:', error);
    } finally {
      setIsPurchaseHistoryLoading(false);
    }
  }, [chatId, userId]); // Include userId in dependency array

  // FIX #8: Centralized balance update handler (single source of truth)
  const handleBalanceUpdate = useCallback((rawData: RawChatMessage) => {
    const playerId = rawData.player_id || rawData.user_id || userId;
    const p = rawData.player;
    // Some events (e.g. game_recharge / game_redeem) embed ledger fields under `payload`.
    const pl = rawData.payload;
    const balance =
      rawData.user_balance ??
      rawData.balance ??
      rawData.player_bal ??
      rawData.credits_balance ??
      pl?.credits_balance ??
      pl?.user_balance ??
      pl?.balance ??
      pl?.player_bal ??
      p?.credits_balance;
    const winningBalance =
      rawData.winning_balance ??
      rawData.player_winning_bal ??
      pl?.winning_balance ??
      pl?.player_winning_bal;
    const cashoutRaw =
      rawData.cashout_limit ??
      rawData.player_cashout_limit ??
      rawData.cashoutLimit ??
      pl?.cashout_limit ??
      p?.cashout_limit ??
      p?.player_cashout_limit ??
      p?.cashoutLimit;
    const lockedRaw =
      rawData.locked_balance ??
      rawData.player_locked_balance ??
      rawData.lockedBalance ??
      pl?.locked_balance ??
      p?.locked_balance ??
      p?.player_locked_balance ??
      p?.lockedBalance;

    if (!playerId) return;

    !IS_PROD &&
      console.log('💰 [Chat WS] Processing balance update:', {
        playerId,
        balance,
        winningBalance,
        cashoutRaw,
        lockedRaw,
      });

    if (String(playerId) === String(userId) && balance !== undefined && balance !== null) {
      const balanceStr = String(balance);
      const winningBalanceStr = winningBalance !== undefined && winningBalance !== null
        ? String(winningBalance)
        : undefined;

      setMessages((prev) =>
        prev.map((msg) =>
          (msg.userId === Number(playerId) || msg.sender === 'player')
            ? { ...msg, userBalance: balanceStr, winningBalance: winningBalanceStr }
            : msg
        ),
      );
    }

    if (onBalanceUpdatedRef.current) {
      const payload: {
        playerId: number;
        balance: string;
        winningBalance?: string;
        cashoutLimit?: string;
        lockedBalance?: string;
      } = {
        playerId: Number(playerId),
        balance: balance !== undefined && balance !== null ? String(balance) : '0',
      };
      if (winningBalance !== undefined && winningBalance !== null) {
        payload.winningBalance = String(winningBalance);
      }
      if (cashoutRaw !== undefined && cashoutRaw !== null && String(cashoutRaw).trim() !== '') {
        payload.cashoutLimit = String(cashoutRaw);
      }
      if (lockedRaw !== undefined && lockedRaw !== null && String(lockedRaw).trim() !== '') {
        payload.lockedBalance = String(lockedRaw);
      }
      onBalanceUpdatedRef.current(payload);
    }
  }, [userId]);

  // FIX #1: Use websocketManager instead of raw WebSocket
  const connect = useCallback(() => {
    if (!userId || !effectiveEnabled) return;

    try {
      const connectionKey = `${userId}:${chatId ?? 'none'}`;
      activeConnectionKeyRef.current = connectionKey;

      const roomName = `P${userId}Chat`;
      const wsUrl = createWebSocketUrl(WEBSOCKET_BASE_URL, `/ws/cschat/${roomName}/`, { user_id: adminId });
      wsUrlRef.current = wsUrl;

      !IS_PROD && console.log('🔌 Connecting to chat WebSocket via manager:', wsUrl);
      connectionStateRef.current = 'connecting';

      const listeners: WebSocketListeners = {
        onOpen: () => {
          if (activeConnectionKeyRef.current !== connectionKey) {
            !IS_PROD && console.log('⚠️ Stale WebSocket open event ignored');
            websocketManager.disconnect(wsUrl, listeners);
            return;
          }

          !IS_PROD && console.log('✅ [Chat WS] WebSocket connected successfully');
          connectionStateRef.current = 'connected';
          if (isMountedRef.current) {
            setIsConnected(true);
            setConnectionError(null);
          }

          if (connectionWaitTimeoutRef.current) {
            clearTimeout(connectionWaitTimeoutRef.current);
            connectionWaitTimeoutRef.current = null;
          }

          // Process queued messages
          if (messageQueueRef.current.length > 0) {
            !IS_PROD && console.log(`📤 [Chat WS] Processing ${messageQueueRef.current.length} queued messages`);
            const queuedMessages = [...messageQueueRef.current];
            messageQueueRef.current = [];

            queuedMessages.forEach(({ text }) => {
              const sent = websocketManager.send(wsUrl, {
                type: 'message',
                sender_id: adminId,
                is_player_sender: false,
                message: text,
                sent_time: new Date().toISOString(),
              });
              if (!sent) {
                messageQueueRef.current.push({ text, timestamp: Date.now() });
              }
            });
          }

          !IS_PROD && console.log('📜 [Chat WS] Fetching message history after connection...');
          void fetchMessageHistory(1, 'replace');
        },

        onMessage: (data) => {
          if (activeConnectionKeyRef.current !== connectionKey) return;

          const rawData = data as RawChatMessage;
          const messageType = rawData.type;

          !IS_PROD && console.log('📨 [Chat WS] Received:', {
            type: messageType,
            messagePreview: rawData.message?.substring(0, 30),
            sender: rawData.is_player_sender ? 'player' : 'admin',
            hasPayload: !!rawData.payload,
            payloadEvent: rawData.payload?.event,
          });

          // Universal ledger extraction: run on ANY incoming message, independent of `type`.
          // Backend events like game_redeem / game_recharge / recharge / cashout_completed
          // deliver ledger changes inside a nested `payload` and may not use a `balanceUpdated`
          // type. This guarantees the selected-player ledger is always in sync.
          {
            const pl = rawData.payload;
            const hasLedger =
              rawData.user_balance !== undefined ||
              rawData.balance !== undefined ||
              rawData.player_bal !== undefined ||
              rawData.credits_balance !== undefined ||
              rawData.cashout_limit !== undefined ||
              rawData.locked_balance !== undefined ||
              !!(
                pl &&
                (pl.credits_balance !== undefined ||
                  pl.balance !== undefined ||
                  pl.user_balance !== undefined ||
                  pl.player_bal !== undefined ||
                  pl.cashout_limit !== undefined ||
                  pl.locked_balance !== undefined)
              );
            if (hasLedger) {
              handleBalanceUpdate(rawData);
            }
          }

          const hasMessageContent = !!(rawData.message || rawData.text || rawData.is_file);
          const isMessageType = messageType === 'message' ||
            ((messageType === 'balanceUpdated' || messageType === 'balance_updated') && hasMessageContent);

          if (isMessageType) {
            const isPlayerSender = rawData.is_player_sender ?? true;
            const sender: 'player' | 'admin' = isPlayerSender ? 'player' : 'admin';
            const timestamp = rawData.sent_time || rawData.timestamp || new Date().toISOString();
            const messageDate = new Date(timestamp);

            const sentBy = rawData.sent_by ? {
              id: rawData.sent_by.id,
              username: rawData.sent_by.username,
              fullName: rawData.sent_by.full_name ?? null,
              role: rawData.sent_by.role,
              profilePic: rawData.sent_by.profile_pic ?? null,
            } : undefined;

            const hasRealId = !!(rawData.id || rawData.message_id);
            const newMessage: ChatMessage = {
              id: String(rawData.id || rawData.message_id || `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`),
              text: rawData.message || rawData.text || '',
              sender,
              timestamp: messageDate.toISOString(),
              date: messageDate.toISOString().split('T')[0],
              time: messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              isRead: false,
              userId: rawData.sender_id || rawData.player_id,
              type: rawData.type,
              isFile: rawData.is_file || false,
              fileExtension: rawData.file_extension || undefined,
              fileUrl: rawData.file || rawData.file_url || undefined,
              isComment: rawData.is_comment || false,
              isPinned: rawData.is_pinned ?? false,
              userBalance: rawData.user_balance ? String(rawData.user_balance) : undefined,
              senderId: rawData.sender_id,
              sentBy,
            };

            if (hasMessageContent && isMountedRef.current) {
              setMessages((prev) => {
                // FIX #6: Check by ID first, then by content+timestamp for temp ID dedup
                if (prev.some(msg => msg.id === newMessage.id)) {
                  !IS_PROD && console.log('⚠️ [Chat WS] Duplicate by ID, skipping:', newMessage.id);
                  return prev;
                }

                if (hasRealId) {
                  // Remove any temp-ID message with matching content and similar timestamp (within 5s)
                  const msgTime = messageDate.getTime();
                  const filtered = prev.filter((msg) => {
                    if (!msg.id.startsWith('temp-')) return true;
                    const timeDiff = Math.abs(new Date(msg.timestamp).getTime() - msgTime);
                    return !(msg.text === newMessage.text && timeDiff < 5000);
                  });
                  return [...filtered, newMessage];
                }

                return [...prev, newMessage];
              });

              if (onMessageReceivedRef.current) {
                try {
                  onMessageReceivedRef.current(newMessage);
                } catch (error) {
                  console.error('❌ [Chat WS] Error in onMessageReceived callback:', error);
                }
              }
            }

            // Ledger extraction happens universally at the top of onMessage now.
          } else if (messageType === 'typing') {
            // FIX #2: Clear previous timeout before setting new one
            if (typingTimeoutRef.current) {
              clearTimeout(typingTimeoutRef.current);
            }
            if (isMountedRef.current) setIsTyping(true);
            typingTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current) setIsTyping(false);
              typingTimeoutRef.current = null;
            }, 3000);
          } else if (messageType === 'mark_message_as_read' || messageType === 'read') {
            const messageId = rawData.message_id || rawData.id;
            const senderId = rawData.sender_id;
            const isPlayerSender = rawData.is_player_sender ?? true;

            if (!isMountedRef.current) return;

            if (messageId) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === String(messageId) ? { ...msg, isRead: true } : msg
                )
              );
            } else if (senderId) {
              const targetSender: 'player' | 'admin' = isPlayerSender ? 'admin' : 'player';
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.sender === targetSender ? { ...msg, isRead: true } : msg
                )
              );
            }
          } else if (messageType === 'live_status') {
            const isActive = rawData.is_active ?? false;
            if (String(rawData.player_id) === String(userId) && isMountedRef.current) {
              setIsUserOnline(isActive);
            }
          } else if (messageType === 'balanceUpdated' || messageType === 'balance_updated') {
            // FIX #8: Standalone balance update (no message content) — single handler
            if (!rawData.message) {
              handleBalanceUpdate(rawData);
            }
          } else if (messageType === 'error') {
            console.error('❌ WebSocket error message:', rawData.error || rawData.message);
            if (isMountedRef.current) {
              setConnectionError(String(rawData.error || rawData.message || 'Unknown error'));
            }
          } else {
            !IS_PROD && console.log('ℹ️ Unhandled message type:', messageType);
          }
        },

        // FIX #7: Surface connection errors to UI
        onError: () => {
          console.error('❌ [Chat WS] WebSocket error');
          if (isMountedRef.current) {
            setConnectionError('Chat connection error. Retrying...');
          }
        },

        onClose: (event) => {
          if (activeConnectionKeyRef.current !== connectionKey) return;

          !IS_PROD && console.log('🔌 Chat WebSocket closed:', event.code, event.reason);
          connectionStateRef.current = 'disconnected';
          if (isMountedRef.current) {
            setIsConnected(false);
          }
        },
      };

      // Store listener ref for cleanup
      listenersRef.current = listeners;

      websocketManager.connect({
        url: wsUrl,
        maxReconnectAttempts: 5,
        baseDelay: 1000,
        maxDelay: 30000,
        connectionTimeout: 10000,
      }, listeners);
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
    }
  }, [userId, chatId, adminId, effectiveEnabled, fetchMessageHistory, handleBalanceUpdate]);

  const sendMessageViaRest = useCallback(async (text: string, retryCount = 0): Promise<boolean> => {
    const MAX_RETRIES = 2;

    try {
      const token = storage.get(TOKEN_KEY);
      if (!token) {
        console.error('❌ No authentication token found');
        setConnectionError('Authentication required. Please log in again.');
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/chat/send/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sender_id: adminId,
          receiver_id: userId,
          message: text,
          is_player_sender: false,
          sent_time: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.error('🚨 Authentication failed - redirecting to login');
          storage.clear();
          if (typeof window !== 'undefined') {
            window.location.replace('/login');
          }
          return false;
        }

        // Retry on server errors (5xx) or network errors
        if (retryCount < MAX_RETRIES && (response.status >= 500 || response.status === 0)) {
          !IS_PROD && console.log(`🔄 Retrying REST API send (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
          return sendMessageViaRest(text, retryCount + 1);
        }

        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
      }

      !IS_PROD && console.log('✅ Message sent successfully via REST API');

      // FIX #9: Guard state updates against unmounted component
      if (isMountedRef.current) {
        const messageDate = new Date();
        const newMessage: ChatMessage = {
          id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          text,
          sender: 'admin',
          timestamp: messageDate.toISOString(),
          date: messageDate.toISOString().split('T')[0],
          time: messageDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isRead: false,
          userId: adminId,
          isPinned: false,
        };

        setMessages((prev) => [...prev, newMessage]);

        if (onMessageReceivedRef.current) {
          onMessageReceivedRef.current(newMessage);
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to send message via REST API:', error);

      if (retryCount < MAX_RETRIES) {
        !IS_PROD && console.log(`🔄 Retrying REST API send (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return sendMessageViaRest(text, retryCount + 1);
      }

      setConnectionError('Failed to send message. Please check your connection and try again.');
      return false;
    }
  }, [adminId, userId]);

  const disconnect = useCallback(() => {
    if (connectionWaitTimeoutRef.current) {
      clearTimeout(connectionWaitTimeoutRef.current);
      connectionWaitTimeoutRef.current = null;
    }

    // FIX #2: Clear typing timeout on disconnect
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    // FIX #9: Only send queued messages if still mounted
    if (messageQueueRef.current.length > 0 && isMountedRef.current) {
      !IS_PROD && console.log(`📤 Processing ${messageQueueRef.current.length} queued messages before disconnect...`);
      const queuedMessages = [...messageQueueRef.current];
      messageQueueRef.current = [];
      queuedMessages.forEach(({ text }) => {
        void sendMessageViaRest(text);
      });
    } else {
      messageQueueRef.current = [];
    }

    // FIX #1: Disconnect via manager instead of raw ws.close()
    if (wsUrlRef.current && listenersRef.current) {
      !IS_PROD && console.log('🔌 Disconnecting chat WebSocket via manager');
      websocketManager.disconnect(wsUrlRef.current, listenersRef.current);
      listenersRef.current = null;
    }

    connectionStateRef.current = 'disconnected';
    if (isMountedRef.current) {
      setIsConnected(false);
    }
  }, [sendMessageViaRest]);

  // FIX #1: Use manager for sending instead of raw WS ref
  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    // Case 1: Connected — send via manager
    if (connectionStateRef.current === 'connected') {
      const sent = websocketManager.send(wsUrlRef.current, {
        type: 'message',
        sender_id: adminId,
        is_player_sender: false,
        message: text,
        sent_time: new Date().toISOString(),
      });
      if (sent) {
        !IS_PROD && console.log('📤 Sent message via WebSocket');
        return;
      }
      // If send failed, fall through to REST
      console.error('❌ Failed to send via WebSocket, falling back to REST');
    }

    // Case 2: Connecting — queue and wait
    if (connectionStateRef.current === 'connecting') {
      !IS_PROD && console.log('⏳ WebSocket connecting, queueing message...');
      messageQueueRef.current.push({ text, timestamp: Date.now() });

      if (!connectionWaitTimeoutRef.current) {
        connectionWaitTimeoutRef.current = setTimeout(async () => {
          connectionWaitTimeoutRef.current = null;

          if (connectionStateRef.current !== 'connected') {
            !IS_PROD && console.log('⏱️ Connection timeout, sending queued messages via REST API...');
            const queuedMessages = [...messageQueueRef.current];
            messageQueueRef.current = [];
            for (const { text: queuedText } of queuedMessages) {
              await sendMessageViaRest(queuedText);
            }
          }
        }, CONNECTION_WAIT_TIMEOUT);
      }
      return;
    }

    // Case 3: Disconnected — REST fallback
    !IS_PROD && console.log('📤 WebSocket not available, sending via REST API...');
    void sendMessageViaRest(text);
  }, [adminId, sendMessageViaRest]);

  const markAsRead = useCallback((messageId: string) => {
    const sent = websocketManager.send(wsUrlRef.current, {
      type: 'mark_message_as_read',
      sender_id: adminId,
      is_player_sender: false,
      message_id: messageId,
    });
    if (sent) {
      !IS_PROD && console.log(' Marked message as read:', messageId);
    }
  }, [adminId]);

  const markAllAsRead = useCallback(() => {
    const sent = websocketManager.send(wsUrlRef.current, {
      type: 'mark_message_as_read',
      sender_id: adminId,
      is_player_sender: false,
    });
    if (sent) {
      !IS_PROD && console.log(' Sent mark all as read message to backend');
    } else {
      !IS_PROD && console.log('⚠️ Cannot mark all as read: WebSocket not connected');
    }
  }, [adminId]);

  const updateMessagePinnedState = useCallback((messageId: string, pinned: boolean) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId ? { ...message, isPinned: pinned } : message,
      ),
    );
  }, []);

  // Update balance in all messages for the current user
  const updateMessagesBalance = useCallback((balance: string, winningBalance: string) => {
    if (!userId) return;

    !IS_PROD && console.log('💰 [Chat WS] Updating balance in messages:', {
      userId,
      balance,
      winningBalance,
    });

    setMessages((prev) =>
      prev.map((message) => {
        // Only update messages from the current player
        if (message.userId === userId || message.sender === 'player') {
          // Update userBalance field - use main balance for userBalance
          return {
            ...message,
            userBalance: balance,
          };
        }
        return message;
      }),
    );
  }, [userId]);

  // Refresh the latest messages to get real IDs from backend
  const refreshMessages = useCallback(async () => {
    if (!chatId && !userId) {
      return;
    }

    !IS_PROD && console.log('🔄 Refreshing messages to get real IDs...');
    // Fetch page 1 (latest messages) and merge with existing, replacing temporary IDs
    await fetchMessageHistory(1, 'replace');
  }, [chatId, userId, fetchMessageHistory]);

  // FIX #9: Track mount state for safe state updates
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Connect/disconnect based on enabled state and userId
  useEffect(() => {
    if (effectiveEnabled && userId) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [effectiveEnabled, userId, connect, disconnect]);

  return {
    messages,
    isConnected,
    isTyping,
    isUserOnline,
    sendMessage,
    markAsRead,
    markAllAsRead,
    connectionError,
    purchaseHistory,
    fetchPurchaseHistory,
    isPurchaseHistoryLoading,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading,
    updateMessagePinnedState,
    refreshMessages,
    updateMessagesBalance,
    notes,
    playerLastSeenAt,
  };
}

