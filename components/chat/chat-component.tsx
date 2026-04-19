'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowDownNarrowWide } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui';
import { formatCurrency, isValidTimestamp } from '@/lib/utils/formatters';
import { useChatUsersContext } from '@/contexts/chat-users-context';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { useOnlinePlayers } from '@/hooks/use-online-players';
import { storage } from '@/lib/utils/storage';
import { API_ENDPOINTS, TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser, ChatMessage } from '@/types';
import { EditProfileDrawer, EditBalanceDrawer, NotesDrawer, ExpandedImageModal } from './modals';
import {
  buildManualPaymentRequestBody,
  normalizeManualPaymentResponse,
  validateExternalCashoutAmount,
  type ManualAdjustmentKind,
  type ManualPaymentResponse,
} from '@/lib/api/manual-adjustment-payload';
import {
  normalizeWinningBalanceFromRealtime,
  pickWinningBalanceFromBackend,
  extractPlayerArrayFromAdminChatResponse,
  mapAdminSearchRowToChatUser,
} from '@/lib/chat/map-chat-api';
import { mergeWinningBalanceFromDirectoryRow } from '@/lib/chat/merge-player-ledger-display';
import { PlayerListSidebar, ChatHeader, PlayerInfoSidebar, EmptyState, PinnedMessagesSection, MessageInputArea } from './sections';
import { MessageBubble } from './components/message-bubble';
import { isAutoMessage, isPurchaseNotification, isKycVerificationMessage, parseTransactionMessage } from './utils/message-helpers';
import { MessageHistorySkeleton } from './skeletons';
import { useScrollManagement } from './hooks/use-scroll-management';

type Player = ChatUser;
type Message = ChatMessage;

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';
const ADMIN_STORAGE_KEY = 'user';
const NO_ADMIN_USER_ID = 0;

const asPositiveNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value) && value > NO_ADMIN_USER_ID) {
    return Math.floor(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > NO_ADMIN_USER_ID) {
      return parsed;
    }
  }

  return NO_ADMIN_USER_ID;
};

// Get admin user ID from storage
const getAdminUserId = (): number => {
  try {
    const userDataStr = storage.get(ADMIN_STORAGE_KEY);
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const candidateId = asPositiveNumber(userData.id ?? userData.user_id);

      if (candidateId > NO_ADMIN_USER_ID) {
        if (!IS_PROD) console.log('📍 Admin User ID:', candidateId);
        return candidateId;
      }

      if (!IS_PROD) console.warn('⚠️ Stored user data is missing a valid admin ID.');
    }
  } catch (error) {
    console.error('❌ Failed to parse user data from localStorage:', error);
  }

  if (!IS_PROD) console.warn('⚠️ Admin user ID unavailable. Chat endpoints remain disabled until authentication completes.');
  return NO_ADMIN_USER_ID;
};

const groupMessagesByDate = (messages: Message[]) => {
  // Deduplicate messages by ID first
  const uniqueMessages = messages.reduce((acc, msg) => {
    if (!acc.some(m => m.id === msg.id)) {
      acc.push(msg);
    }
    return acc;
  }, [] as Message[]);

  const grouped: { [key: string]: Message[] } = {};
  uniqueMessages.forEach((msg) => {
    const dateKey = msg.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(msg);
  });
  return grouped;
};

const formatMessageDate = (date: string) => {
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: undefined })
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DEFAULT_MARK_AS_READ = true;

export function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [adminUserId] = useState(() => getAdminUserId());
  const hasValidAdminUser = adminUserId > NO_ADMIN_USER_ID;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'online' | 'all-chats'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [serverSearchPlayers, setServerSearchPlayers] = useState<Player[]>([]);
  const [serverSearchForQuery, setServerSearchForQuery] = useState('');
  const [isPlayerSearchLoading, setIsPlayerSearchLoading] = useState(false);
  const playerSearchAbortRef = useRef<AbortController | null>(null);
  /** Bumps when clearing search or starting a new debounced fetch so stale/aborted requests cannot leave loading stuck. */
  const playerSearchEpochRef = useRef(0);
  const [messageInput, setMessageInput] = useState('');
  const [pendingPinMessageId, setPendingPinMessageId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [isPinnedMessagesExpanded, setIsPinnedMessagesExpanded] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    username: '',
    full_name: '',
    dob: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isEditBalanceModalOpen, setIsEditBalanceModalOpen] = useState(false);
  const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
  const [balanceValue, setBalanceValue] = useState(0);
  const [balanceAdjustmentKind, setBalanceAdjustmentKind] = useState<ManualAdjustmentKind>('freeplay');
  const [balanceRemarks, setBalanceRemarks] = useState('');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [hasNewMessagesWhileScrolled, setHasNewMessagesWhileScrolled] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const wasHistoryLoadingRef = useRef(false);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasScrolledToInitialLoadRef = useRef(false);
  const previousPlayerIdRef = useRef<number | null>(null); // Track previous player to detect actual player changes
  const isRefreshingMessagesRef = useRef(false); // Track if we're refreshing messages to prevent scroll conflicts
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Debounce refresh calls
  const scrollPositionBeforeRefreshRef = useRef<number | null>(null); // Preserve scroll position during refresh
  const displayedMessageIdsRef = useRef<Set<string>>(new Set()); // Track displayed messages for animation
  const hasScrolledForQueryParamsRef = useRef<string | null>(null); // Track if we've scrolled for query param navigation
  const processedQueryPlayerIdRef = useRef<number | null>(null); // Track which playerId we've already processed
  const processedQueryUsernameRef = useRef<string | null>(null); // Track which username we've already processed
  const lastSetSearchQueryRef = useRef<string>(''); // Track last search query we set to avoid unnecessary updates
  const queryParamPlayerRef = useRef<Player | null>(null); // Store the player selected via query params to ensure they stay visible
  // Track last manual payment operation to help determine message type for balanceUpdated messages
  const lastManualPaymentRef = useRef<{
    playerId: number;
    amount: number;
    operation: 'increase' | 'decrease';
    adjustmentKind: ManualAdjustmentKind;
    timestamp: number;
  } | null>(null);
  const { addToast } = useToast();

  // Common emojis for quick access
  const commonEmojis = [
    '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊',
    '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
    '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
    '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
    '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
    '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
    '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
    '👍', '👎', '👏', '🙌', '👐', '🤝', '🙏', '✌️',
    '🤞', '🤟', '🤘', '🤙', '💪', '🦾', '🖕', '✍️',
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍',
    '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
    '🔥', '⭐', '✨', '💫', '🌟', '💥', '💯', '',
    '❌', '⚠️', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇'
  ];

  // Get chat users from shared context
  const {
    users: activeChatsUsers, // Users with active chats (from WebSocket)
    allPlayers, // All players (from REST API)
    onlineUsers: onlinePlayers,
    isLoading: isLoadingUsers,
    isLoadingAllPlayers,
    isLoadingMore,
    error: usersError,
    fetchAllPlayers,
    loadMorePlayers,
    hasMorePlayers,
    playersWithChatsTotalCount,
    chatListOnlinePlayersCount,
    chatListAllPlayersCount,
    refreshActiveChats,
    updateChatLastMessage,
    markChatAsRead,
    markChatAsReadDebounced,
  } = useChatUsersContext();

  // ✨ OPTIMIZED: Fetch online players using hybrid REST + WebSocket approach
  const {
    onlinePlayers: apiOnlinePlayers,
    onlinePlayersTotalCount: onlinePlayersApiTotalCount,
    allPlayersTotalCount: allPlayersApiTotalCount,
    isLoading: isLoadingApiOnlinePlayers,
    error: onlinePlayersError,
    refetch: refetchOnlinePlayers,
    isConnected: isOnlinePlayersWSConnected,
  } = useOnlinePlayers({
    adminId: adminUserId,
    enabled: hasValidAdminUser, // Keep always enabled to preserve data and timestamps
  });

  const displayOnlinePlayersTotal = useMemo(
    () =>
      onlinePlayersApiTotalCount ??
      chatListOnlinePlayersCount ??
      onlinePlayers.length,
    [onlinePlayersApiTotalCount, chatListOnlinePlayersCount, onlinePlayers.length],
  );

  // WebSocket connection for real-time chat
  const {
    messages: wsMessages,
    isConnected,
    isTyping: remoteTyping,
    sendMessage: wsSendMessage,
    connectionError,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading: isHistoryLoadingMessages,
    updateMessagePinnedState,
    markAllAsRead,
    refreshMessages,
    notes,
    playerLastSeenAt,
  } = useChatWebSocket({
    userId: selectedPlayer?.user_id ?? null,
    chatId: selectedPlayer?.id ?? null, // id field contains chat_id
    adminId: adminUserId,
    enabled: !!selectedPlayer && hasValidAdminUser,
    onMessageReceived: useCallback(async (message: ChatMessage) => {
      // 🔄 Refresh the chat list from the API to get latest unread counts and sorting
      // This ensures the sidebar is always in sync with the backend
      refreshActiveChats();

      // ⚡ Update the local state immediately for the specific player for instant UI feedback
      if (message.userId) {
        updateChatLastMessage(
          message.userId,
          selectedPlayer?.id || '',
          message.text,
          message.timestamp
        );
      }
    }, [refreshActiveChats, updateChatLastMessage, selectedPlayer?.id]),
    onBalanceUpdated: useCallback(
      (data: {
        playerId: number;
        balance: string;
        winningBalance?: string;
        cashoutLimit?: string;
        lockedBalance?: string;
      }) => {
        if (!IS_PROD) {
          console.log('💰 [Chat Component] Balance updated via WebSocket callback:', {
            playerId: data.playerId,
            balance: data.balance,
            winningBalance: data.winningBalance,
            cashoutLimit: data.cashoutLimit,
            lockedBalance: data.lockedBalance,
            selectedPlayerId: selectedPlayer?.user_id,
            matchesSelectedPlayer: selectedPlayer?.user_id === data.playerId,
          });
        }

        // Update selected player's balance if this is the current player
        // Always create a new object to ensure React detects the change
        if (selectedPlayer && selectedPlayer.user_id === data.playerId) {
          setSelectedPlayer((prev) => {
            if (!prev) return null;

            // Parse balance values - handle both string and number formats
            const newBalance =
              data.balance && data.balance !== '0' && data.balance !== 'undefined'
                ? String(data.balance)
                : prev.balance;
            const newWinningBalance =
              data.winningBalance !== undefined
                ? normalizeWinningBalanceFromRealtime(data.winningBalance, prev.winningBalance)
                : undefined;

            const nextCashout =
              data.cashoutLimit !== undefined ? String(data.cashoutLimit) : prev.cashoutLimit;
            const nextLocked =
              data.lockedBalance !== undefined ? String(data.lockedBalance) : prev.lockedBalance;

            // Only update if values actually changed to avoid unnecessary re-renders
            if (
              newBalance === prev.balance &&
              newWinningBalance === prev.winningBalance &&
              nextCashout === prev.cashoutLimit &&
              nextLocked === prev.lockedBalance
            ) {
              if (!IS_PROD) console.log('⏭️ [Chat Component] Balance values unchanged, skipping update');
              return prev;
            }

            const updated = {
              ...prev,
              balance: newBalance,
              winningBalance: newWinningBalance,
              cashoutLimit: nextCashout,
              lockedBalance: nextLocked,
            };

            if (!IS_PROD) {
              console.log('✅ [Chat Component] Updated selected player balance:', {
                before: {
                  balance: prev.balance,
                  winningBalance: prev.winningBalance,
                  cashoutLimit: prev.cashoutLimit,
                  lockedBalance: prev.lockedBalance,
                },
                after: {
                  balance: updated.balance,
                  winningBalance: updated.winningBalance,
                  cashoutLimit: updated.cashoutLimit,
                  lockedBalance: updated.lockedBalance,
                },
                objectReferenceChanged: prev !== updated,
              });
            }

            return updated;
          });
        }

        // Balance updates are handled by websocket in real-time, no need to refresh
        // The chat list websocket will update balances automatically
      },
      [selectedPlayer],
    ),
  });

  const {
    isUserAtBottom,
    isLoadingOlder,
    sentinelRef,
    scrollToBottom,
    handleScroll,
  } = useScrollManagement({
    messagesContainerRef,
    isHistoryLoadingMessages,
    hasMoreHistory,
    loadOlderMessages,
    selectedPlayerId: selectedPlayer?.user_id ?? null,
  });

  

  const visibleMessages = useMemo(() => {
    let messages = wsMessages;
    const FIVE_SECONDS = 5000;

    // Pass 1: Handle operationType attribution (workaround for backend bug)
    if (lastManualPaymentRef.current) {
      const lastOp = lastManualPaymentRef.current;
      messages = messages.map((msg) => {
        if (msg.type?.toLowerCase() !== 'balanceupdated' && msg.type?.toLowerCase() !== 'balance_updated') {
          return msg;
        }

        const messageTime = new Date(msg.timestamp).getTime();
        const timeDiff = Math.abs(messageTime - lastOp.timestamp);
        const effectiveUserId = msg.userId || selectedPlayer?.id;

        if (effectiveUserId === lastOp.playerId && timeDiff < FIVE_SECONDS && !msg.operationType) {
          const amountMatch = msg.text.match(/\$([\d,]+\.?\d*)/);
          if (amountMatch) {
            const messageAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
            if (Math.abs(messageAmount - lastOp.amount) < 0.01) {
              return { ...msg, operationType: lastOp.operation };
            }
          }
        }
        return msg;
      });
    }

    // Pass 2: Consolidate purchase notifications and calculate bonuses
    const processedMessages: Message[] = [];
    const hiddenMessageIds = new Set<string>();
    const enhancements = new Map<string, Partial<Message>>();
    const lastBalanceByPlayer = new Map<number, number>();
    const balanceBeforeIntent = new Map<string, number>();

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const details = parseTransactionMessage(msg.text, msg.type, msg.operationType);
      const effectiveUserId = msg.userId || selectedPlayer?.id;

      if (isPurchaseNotification(msg)) {
        const amount = parseFloat(details.amount || '0');
        const currentCredits = parseFloat(details.credits || '0');

        if (amount > 0 && typeof effectiveUserId === 'number') {
          // Store the balance from BEFORE this purchase intent
          const prevBal = lastBalanceByPlayer.get(effectiveUserId);
          if (prevBal !== undefined) {
            balanceBeforeIntent.set(msg.id, prevBal);
          }
        }

        // If this is a $0 update following an actual purchase
        if (amount === 0 && details.credits && typeof effectiveUserId === 'number') {
          // Look back for the intent message
          let intentMsgIndex = -1;
          for (let j = processedMessages.length - 1; j >= 0; j--) {
            const prevMsg = processedMessages[j];
            const prevEffectiveUserId = prevMsg.userId || selectedPlayer?.id;

            if (prevEffectiveUserId === effectiveUserId && isPurchaseNotification(prevMsg)) {
              const prevDetails = parseTransactionMessage(prevMsg.text, prevMsg.type, prevMsg.operationType);
              if (parseFloat(prevDetails.amount || '0') > 0) {
                intentMsgIndex = j;
                break;
              }
            }
          }

          if (intentMsgIndex !== -1) {
            const intentMsg = processedMessages[intentMsgIndex];
            const intentDetails = parseTransactionMessage(intentMsg.text, intentMsg.type, intentMsg.operationType);
            const intentAmount = parseFloat(intentDetails.amount || '0');

            // Find balance BEFORE the intent message to calculate bonus
            const prevBalance = balanceBeforeIntent.get(intentMsg.id);

            if (prevBalance !== undefined) {
              const intentCredits = parseFloat(intentDetails.credits || '0');
              let bonus = 0;

              if (intentCredits > 0) {
                // More robust: use the difference between the two purchase messages
                bonus = currentCredits - intentCredits;
              } else {
                // Fallback: total increase minus purchase amount
                bonus = currentCredits - prevBalance - intentAmount;
              }

              // Update the intent message with the data from the confirmation message
              // use currentCredits (from $0 msg) and details (from $0 msg)
              enhancements.set(intentMsg.id, {
                bonusAmount: bonus > 1 ? bonus.toFixed(2) : undefined,
                userBalance: currentCredits.toFixed(2),
                winningBalance: details.winnings ? parseFloat(details.winnings).toFixed(2) : intentMsg.winningBalance,
                paymentMethod: intentDetails.paymentMethod || details.paymentMethod
              });

              // Mark current ($0) message to be hidden
              hiddenMessageIds.add(msg.id);
            }
          }
        }
      }

      // Track balance for bonus calculation (use effectiveUserId)
      if (typeof effectiveUserId === 'number') {
        if (details.credits) {
          lastBalanceByPlayer.set(effectiveUserId, parseFloat(details.credits));
        } else if (msg.userBalance) {
          lastBalanceByPlayer.set(effectiveUserId, parseFloat(String(msg.userBalance).replace(/[$,]/g, '')));
        }
      }

      processedMessages.push(msg);
    }

    // Final Pass: Filter and apply enhancements
    return messages
      .filter(m => !hiddenMessageIds.has(m.id))
      .map(m => enhancements.has(m.id) ? { ...m, ...enhancements.get(m.id) } : m);
  }, [wsMessages, selectedPlayer?.id]);

  const groupedMessages = useMemo(() => groupMessagesByDate(visibleMessages), [visibleMessages]);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    const token = storage.get(TOKEN_KEY);
    if (!trimmed) {
      playerSearchEpochRef.current += 1;
      playerSearchAbortRef.current?.abort();
      playerSearchAbortRef.current = null;
      setServerSearchPlayers([]);
      setServerSearchForQuery('');
      setIsPlayerSearchLoading(false);
      return;
    }

    if (!token) {
      playerSearchEpochRef.current += 1;
      playerSearchAbortRef.current?.abort();
      setServerSearchPlayers([]);
      setServerSearchForQuery('');
      setIsPlayerSearchLoading(false);
      return;
    }

    playerSearchEpochRef.current += 1;
    const epochAtSchedule = playerSearchEpochRef.current;
    setIsPlayerSearchLoading(true);

    const timer = setTimeout(() => {
      if (epochAtSchedule !== playerSearchEpochRef.current) {
        return;
      }
      const ac = new AbortController();
      playerSearchAbortRef.current?.abort();
      playerSearchAbortRef.current = ac;

      void (async () => {
        try {
          const res = await fetch(
            `/${API_ENDPOINTS.CHAT.SEARCH_PLAYERS}?query=${encodeURIComponent(trimmed)}`,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
              signal: ac.signal,
            },
          );

          if (!res.ok) {
            const errJson = (await res.json().catch(() => ({}))) as { message?: string };
            throw new Error(errJson.message || `Search failed (${res.status})`);
          }

          const data = (await res.json()) as Record<string, unknown>;
          const arr = extractPlayerArrayFromAdminChatResponse(data);
          const mapped = arr.map((row) => mapAdminSearchRowToChatUser(row));

          if (!IS_PROD && mapped.length === 0) {
            console.debug(
              '[chat-search-players] No rows after parse. Keys:',
              Object.keys(data),
              'sample:',
              JSON.stringify(data).slice(0, 800),
            );
          }

          if (!ac.signal.aborted && epochAtSchedule === playerSearchEpochRef.current) {
            setServerSearchPlayers(mapped);
            setServerSearchForQuery(trimmed);
          }
        } catch (e) {
          if (e instanceof Error && e.name === 'AbortError') {
            return;
          }
          console.error('Player search failed:', e);
          addToast({
            type: 'error',
            title: 'Search failed',
            description: e instanceof Error ? e.message : 'Could not search players',
          });
          if (!ac.signal.aborted && epochAtSchedule === playerSearchEpochRef.current) {
            setServerSearchPlayers([]);
            // Mark query complete so the list stays server-driven (empty) instead of a mismatched-query state.
            setServerSearchForQuery(trimmed);
          }
        } finally {
          if (epochAtSchedule === playerSearchEpochRef.current) {
            setIsPlayerSearchLoading(false);
          }
        }
      })();
    }, 300);

    return () => {
      clearTimeout(timer);
      playerSearchAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- addToast is stable; omitting avoids aborting search on toast identity churn
  }, [searchQuery]);

  const displayedPlayers = useMemo(() => {
    if (!IS_PROD) {
      console.log('🔄 [displayedPlayers] Memo recalculating...', {
        activeTab,
        apiOnlinePlayersCount: apiOnlinePlayers.length,
        activeChatsUsersCount: activeChatsUsers.length,
        allPlayersCount: allPlayers.length,
      });
    }

    let players: Player[];

    if (activeTab === 'online') {
      // ✨ OPTIMIZED: Use hybrid REST + WebSocket online players
      // apiOnlinePlayers already combines REST API data with real-time WebSocket updates
      const seenUserIds = new Map<number, Player>();

      // DEBUG: Log initial data states
      if (!IS_PROD) console.log(`🔍 [Online Tab] Data sources - API: ${apiOnlinePlayers.length}, WebSocket: ${activeChatsUsers.length}`);

      // DEBUG: Log sample data from both sources
      if (!IS_PROD && apiOnlinePlayers.length > 0) {
        const sampleApiPlayer = apiOnlinePlayers[0];
        console.log(`📊 [Online Tab] Sample API player:`, {
          username: sampleApiPlayer.username,
          lastMessage: sampleApiPlayer.lastMessage?.substring(0, 30),
          lastMessageTime: sampleApiPlayer.lastMessageTime,
          validTimestamp: isValidTimestamp(sampleApiPlayer.lastMessageTime),
        });
      }

      if (!IS_PROD && activeChatsUsers.length > 0) {
        const sampleWsPlayer = activeChatsUsers[0];
        console.log(`📊 [Online Tab] Sample WebSocket player:`, {
          username: sampleWsPlayer.username,
          lastMessage: sampleWsPlayer.lastMessage?.substring(0, 30),
          lastMessageTime: sampleWsPlayer.lastMessageTime,
          validTimestamp: isValidTimestamp(sampleWsPlayer.lastMessageTime),
        });
      }

      // First, add all online players from the optimized hook
      apiOnlinePlayers.forEach((player: Player) => {
        if (player.user_id) {
          seenUserIds.set(player.user_id, player);
        }
      });

      // Then, merge with active chat data for real-time message updates
      activeChatsUsers.forEach((player: Player) => {
        if (player.user_id && player.isOnline) {
          const existing = seenUserIds.get(player.user_id);
          if (existing) {
            //  DEBUG: Log timestamp merge behavior
            if (!IS_PROD) {
              console.log(`🔄 [Online Tab Merge] Merging timestamps for ${player.username}:`, {
                existingTime: existing.lastMessageTime,
                playerTime: player.lastMessageTime,
                validPlayerTime: isValidTimestamp(player.lastMessageTime),
                chosenTime: isValidTimestamp(player.lastMessageTime) ? player.lastMessageTime : existing.lastMessageTime,
              });
            }

            //  FIXED: Prioritize WebSocket data (real-time) over REST API data
            seenUserIds.set(player.user_id, {
              ...existing,
              // WebSocket data takes priority for real-time fields
              lastMessage: player.lastMessage || existing.lastMessage,
              //  FIXED: Use better timestamp preservation logic like all-chats tab
              lastMessageTime: isValidTimestamp(player.lastMessageTime)
                ? player.lastMessageTime
                : existing.lastMessageTime,
              unreadCount: player.unreadCount ?? existing.unreadCount ?? 0, // WebSocket first!
              isOnline: player.isOnline ?? existing.isOnline, // WebSocket status is authoritative
              notes: existing.notes || player.notes, // Preserve notes
            });
          } else {
            // Add player from active chats if not in online list
            seenUserIds.set(player.user_id, player);
          }
        }
      });

      players = Array.from(seenUserIds.values());

      // DEBUG: Log final result after merge
      if (!IS_PROD && players.length > 0) {
        const sampleFinalPlayer = players[0];
        console.log(`🎯 [Online Tab Final] Sample final player:`, {
          username: sampleFinalPlayer.username,
          lastMessage: sampleFinalPlayer.lastMessage?.substring(0, 30),
          lastMessageTime: sampleFinalPlayer.lastMessageTime,
          validTimestamp: isValidTimestamp(sampleFinalPlayer.lastMessageTime),
        });

        // Log all players with timestamps
        const playersWithTimestamps = players.filter(p => p.lastMessageTime);
        const playersWithoutTimestamps = players.filter(p => !p.lastMessageTime);
        console.log(`📊 [Online Tab Final] Players with timestamps: ${playersWithTimestamps.length}, without: ${playersWithoutTimestamps.length}`);
        if (playersWithoutTimestamps.length > 0) {
          console.log(`⚠️ [Online Tab Final] Players missing timestamps:`,
            playersWithoutTimestamps.map(p => ({ username: p.username, lastMessage: p.lastMessage?.substring(0, 20) }))
          );
        }
      }

      // Log players with notes for debugging
      if (!IS_PROD) {
        const playersWithNotes = players.filter(p => p.notes);
        if (playersWithNotes.length > 0) {
          console.log(`📋 [displayedPlayers - online] ${playersWithNotes.length} players with notes:`,
            playersWithNotes.map(p => ({ username: p.username, notes: p.notes?.substring(0, 30) }))
          );
        }

        // Log unread counts for debugging
        const playersWithUnread = players.filter(p => (p.unreadCount ?? 0) > 0);
        if (playersWithUnread.length > 0) {
          console.log(`📬 [displayedPlayers - online] ${playersWithUnread.length} players with unread messages:`,
            playersWithUnread.map(p => ({ username: p.username, unreadCount: p.unreadCount }))
          );
        }
      }
    } else {
      // For "all-chats" tab: combine activeChatsUsers and allPlayers
      //  FIXED: Merge last message data from activeChats into allPlayers
      const seenUserIds = new Map<number, Player>();

      // DEBUG: Log initial data states for all-chats tab
      if (!IS_PROD) console.log(`🔍 [All-Chats Tab] Data sources - WebSocket: ${activeChatsUsers.length}, API: ${allPlayers.length}`);

      // DEBUG: Log sample data from both sources
      if (!IS_PROD && activeChatsUsers.length > 0) {
        const sampleWsPlayer = activeChatsUsers[0];
        console.log(`📊 [All-Chats Tab] Sample WebSocket player:`, {
          username: sampleWsPlayer.username,
          lastMessage: sampleWsPlayer.lastMessage?.substring(0, 30),
          lastMessageTime: sampleWsPlayer.lastMessageTime,
          validTimestamp: isValidTimestamp(sampleWsPlayer.lastMessageTime),
        });
      }

      if (!IS_PROD && allPlayers.length > 0) {
        const sampleApiPlayer = allPlayers[0];
        console.log(`📊 [All-Chats Tab] Sample API player:`, {
          username: sampleApiPlayer.username,
          lastMessage: sampleApiPlayer.lastMessage?.substring(0, 30),
          lastMessageTime: sampleApiPlayer.lastMessageTime,
          validTimestamp: isValidTimestamp(sampleApiPlayer.lastMessageTime),
        });
      }

      // First, add active chats with last messages (from WebSocket)
      activeChatsUsers.forEach((player: Player) => {
        if (player.user_id) {
          seenUserIds.set(player.user_id, player);
        }
      });

      // Then, add/merge players from allPlayers (from REST API)
      allPlayers.forEach((player: Player) => {
        if (player.user_id) {
          const existing = seenUserIds.get(player.user_id);
          if (existing) {
            //  DEBUG: Log timestamp merge behavior for all-chats
            if (!IS_PROD) {
              console.log(`🔄 [All-Chats Tab Merge] Merging timestamps for ${player.username}:`, {
                existingTime: existing.lastMessageTime,
                playerTime: player.lastMessageTime,
                validExistingTime: isValidTimestamp(existing.lastMessageTime),
                chosenTime: isValidTimestamp(existing.lastMessageTime) ? existing.lastMessageTime : player.lastMessageTime,
              });
            }

            //  FIXED: Prioritize WebSocket data (real-time) over REST API data (stale)
            // Start with WebSocket data, only add missing fields from REST API
            seenUserIds.set(player.user_id, {
              ...existing, // WebSocket data (real-time unreadCount, lastMessage, etc.)
              // Only override with REST API data for fields not in WebSocket
              fullName: player.fullName || existing.fullName,
              email: player.email || existing.email,
              avatar: player.avatar || existing.avatar,
              balance: player.balance || existing.balance,
              winningBalance: Object.prototype.hasOwnProperty.call(player, 'winningBalance')
                ? player.winningBalance
                : undefined,
              gamesPlayed: player.gamesPlayed || existing.gamesPlayed,
              winRate: player.winRate || existing.winRate,
              phone: player.phone || existing.phone,
              notes: player.notes || existing.notes, // Preserve notes from REST API
              //  FIXED: Preserve lastMessageTime from REST API if WebSocket doesn't have it
              // Use WebSocket value if it exists and is valid, otherwise fall back to REST API
              lastMessage: existing.lastMessage || player.lastMessage,
              lastMessageTime: isValidTimestamp(existing.lastMessageTime)
                ? existing.lastMessageTime
                : player.lastMessageTime,
            });
          } else {
            // Player not in activeChats - add as is (with notes if present)
            seenUserIds.set(player.user_id, player);
          }
        }
      });

      // Always include the player selected via query params, even if they're not in loaded data
      // This ensures they stay visible even if they're on a later page of pagination
      if (queryParamPlayerRef.current && queryParamPlayerRef.current.user_id) {
        const queryPlayerId = queryParamPlayerRef.current.user_id;
        const existingInList = seenUserIds.get(queryPlayerId);
        if (!existingInList) {
          // Player not found in loaded data, add them from the ref
          seenUserIds.set(queryPlayerId, queryParamPlayerRef.current);
        } else {
          // Player exists, but merge with query param player data to ensure we have latest info
          seenUserIds.set(queryPlayerId, {
            ...existingInList,
            ...queryParamPlayerRef.current,
            // Preserve real-time data from existing
            unreadCount: existingInList.unreadCount ?? queryParamPlayerRef.current.unreadCount ?? 0,
            lastMessage: existingInList.lastMessage || queryParamPlayerRef.current.lastMessage,
            lastMessageTime: isValidTimestamp(existingInList.lastMessageTime)
              ? existingInList.lastMessageTime
              : queryParamPlayerRef.current.lastMessageTime,
            isOnline: existingInList.isOnline ?? queryParamPlayerRef.current.isOnline,
          });
        }
      }

      players = Array.from(seenUserIds.values());

      // Log players with notes for debugging
      if (!IS_PROD) {
        const playersWithNotes = players.filter(p => p.notes);
        if (playersWithNotes.length > 0) {
          console.log(`📋 [displayedPlayers - all-chats] ${playersWithNotes.length} players with notes:`,
            playersWithNotes.map(p => ({ username: p.username, notes: p.notes?.substring(0, 30) }))
          );
        }

        // Log unread counts for debugging
        const playersWithUnread = players.filter(p => (p.unreadCount ?? 0) > 0);
        if (playersWithUnread.length > 0) {
          console.log(`📬 [displayedPlayers - all-chats] ${playersWithUnread.length} players with unread messages:`,
            playersWithUnread.map(p => ({ username: p.username, unreadCount: p.unreadCount }))
          );
        }
      }
    }

    const trimmedSearch = searchQuery.trim();
    if (!trimmedSearch) {
      return players;
    }

    // Player list search is server-only: never filter the loaded directory client-side.
    const serverResultsReady =
      !isPlayerSearchLoading && serverSearchForQuery === trimmedSearch;

    if (!serverResultsReady) {
      return [];
    }

    const mergeSearchRowWithChats = (apiPlayer: Player): Player => {
      const ws = activeChatsUsers.find((a) => a.user_id === apiPlayer.user_id);
      const apiOn = apiOnlinePlayers.find((a) => a.user_id === apiPlayer.user_id);

      if (activeTab === 'all-chats') {
        if (ws) {
          return {
            ...ws,
            fullName: apiPlayer.fullName || ws.fullName,
            email: apiPlayer.email || ws.email,
            avatar: apiPlayer.avatar || ws.avatar,
            balance: apiPlayer.balance || ws.balance,
            winningBalance: Object.prototype.hasOwnProperty.call(apiPlayer, 'winningBalance')
              ? apiPlayer.winningBalance
              : undefined,
            gamesPlayed: apiPlayer.gamesPlayed || ws.gamesPlayed,
            winRate: apiPlayer.winRate || ws.winRate,
            phone: apiPlayer.phone || ws.phone,
            notes: apiPlayer.notes || ws.notes,
            lastMessage: ws.lastMessage || apiPlayer.lastMessage,
            lastMessageTime: isValidTimestamp(ws.lastMessageTime)
              ? ws.lastMessageTime
              : apiPlayer.lastMessageTime,
            isOnline: ws.isOnline ?? apiPlayer.isOnline,
          };
        }
        return apiPlayer;
      }

      if (apiOn) {
        if (ws) {
          return {
            ...apiOn,
            lastMessage: ws.lastMessage || apiOn.lastMessage,
            lastMessageTime: isValidTimestamp(ws.lastMessageTime)
              ? ws.lastMessageTime
              : apiOn.lastMessageTime,
            unreadCount: ws.unreadCount ?? apiOn.unreadCount ?? 0,
            isOnline: ws.isOnline ?? apiOn.isOnline ?? apiPlayer.isOnline,
            notes: apiOn.notes || ws.notes,
          };
        }
        return {
          ...apiOn,
          fullName: apiPlayer.fullName || apiOn.fullName,
          email: apiPlayer.email || apiOn.email,
          notes: apiPlayer.notes || apiOn.notes,
        };
      }

      if (ws?.isOnline) {
        return {
          ...ws,
          fullName: apiPlayer.fullName || ws.fullName,
          email: apiPlayer.email || ws.email,
          balance: apiPlayer.balance || ws.balance,
          notes: apiPlayer.notes || ws.notes,
        };
      }

      return { ...apiPlayer, isOnline: apiPlayer.isOnline ?? false };
    };

    // Server search must not hide matches when `is_online` is omitted from search_players
    // (merge above still sets green/red from REST + WebSocket when available).
    const fromServer = serverSearchPlayers.map(mergeSearchRowWithChats);

    if (queryParamPlayerRef.current?.user_id) {
      const queryPlayerId = queryParamPlayerRef.current.user_id;
      if (!fromServer.find((p) => p.user_id === queryPlayerId)) {
        const qp = mergeSearchRowWithChats(queryParamPlayerRef.current);
        if (activeTab !== 'online' || qp.isOnline) {
          return [qp, ...fromServer];
        }
      }
    }

    return fromServer;
  }, [
    activeTab,
    apiOnlinePlayers,
    activeChatsUsers,
    allPlayers,
    searchQuery,
    serverSearchPlayers,
    serverSearchForQuery,
    isPlayerSearchLoading,
  ]);

  /** Sidebar/drawer: align winnings with directory row on the same render (no `useEffect` flash). */
  const selectedPlayerLedgerView = useMemo(
    () =>
      selectedPlayer ? mergeWinningBalanceFromDirectoryRow(selectedPlayer, displayedPlayers) : null,
    [selectedPlayer, displayedPlayers],
  );

  // Determine which loading state to show based on active tab
  const isCurrentTabLoading = useMemo(() => {
    if (activeTab === 'online') {
      // ✨ OPTIMIZED: Use the new hook's loading state
      const isLoading = isLoadingApiOnlinePlayers;
      if (!IS_PROD) {
        console.log('🔍 Online tab loading state:', {
          isLoadingApiOnlinePlayers,
          computed: isLoading,
        });
      }
      return isLoading;
    }

    // For "all-chats" tab, we need both activeChatsUsers and allPlayers
    // Show loading if either is loading (but prioritize activeChatsUsers loading)
    const isLoading = isLoadingUsers || (allPlayers.length === 0 && isLoadingAllPlayers);
    if (!IS_PROD) {
      console.log('🔍 All Chats tab loading state:', {
        isLoadingUsers,
        isLoadingAllPlayers,
        allPlayersLength: allPlayers.length,
        computed: isLoading,
      });
    }
    return isLoading;
  }, [activeTab, isLoadingApiOnlinePlayers, isLoadingUsers, isLoadingAllPlayers, allPlayers.length]);

  useEffect(() => {
    // Load all players for "all-chats" tab only
    // "all-chats" needs all players to show everyone, not just those with active chats
    const shouldLoadAllPlayers = activeTab === 'all-chats';
    const hasPlayersCached = allPlayers.length > 0;

    if (!shouldLoadAllPlayers || hasPlayersCached) {
      return;
    }

    if (!IS_PROD) console.log('🔄 Loading players for tab:', activeTab);
    fetchAllPlayers();
  }, [activeTab, allPlayers.length, fetchAllPlayers]);


  const handleSendMessage = useCallback(async () => {
    if ((!messageInput.trim() && !selectedImage) || !selectedPlayer) return;

    // If there's an image to upload
    if (selectedImage) {
      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedImage);
        formData.append('chat_type', 'csr');
        formData.append('sender_id', String(adminUserId));
        formData.append('receiver_id', String(selectedPlayer.user_id));

        // Add text message if there is one
        if (messageInput.trim()) {
          formData.append('message', messageInput.trim());
        }

        const token = storage.get(TOKEN_KEY);

        // Upload to local Next.js API endpoint
        const response = await fetch('/api/chat-upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to upload image');
        }

        const result = await response.json();
        if (!IS_PROD) console.log(' Image uploaded successfully:', result);

        // The backend should return the file URL in the format:
        // https://serverhub.biz/media/csr/chats/filename.jpeg
        const imageUrl = result.file_url || result.url || result.file;
        if (!IS_PROD) console.log('📷 Image URL:', imageUrl);

        // If there's also a text message, send it via WebSocket with the image URL
        if (imageUrl) {
          const messageWithImage = messageInput.trim()
            ? `${messageInput.trim()}\n${imageUrl}`
            : imageUrl;

          // Send message with image URL via WebSocket
          wsSendMessage(messageWithImage);
        }

        // Clear image preview and input
        setSelectedImage(null);
        setImagePreviewUrl(null);
        setMessageInput('');

        // Update the chat list with the sent message
        const currentTime = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        updateChatLastMessage(
          selectedPlayer.user_id,
          selectedPlayer.id,
          messageInput.trim() || '📷 Image',
          currentTime
        );

        addToast({
          type: 'success',
          title: 'Image sent successfully',
        });

        // Rule 2: User sends a message → Force scroll to bottom (bypasses cooldown)
        scrollToBottom(true);

        // No need to refresh - websocket will send the message back with real ID
      } catch (error) {
        console.error('❌ Failed to upload image:', error);
        addToast({
          type: 'error',
          title: 'Failed to send image',
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsUploadingImage(false);
      }
      return;
    }

    // Send text message via WebSocket
    const messageText = messageInput.trim();
    wsSendMessage(messageText);

    // Update the chat list with the sent message
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    updateChatLastMessage(
      selectedPlayer.user_id,
      selectedPlayer.id,
      messageText,
      currentTime
    );

    setMessageInput('');

    // Rule 2: User sends a message → Force scroll to bottom (bypasses cooldown)
    scrollToBottom(true);

    // No need to refresh - websocket will send the message back with real ID
  }, [messageInput, selectedImage, selectedPlayer, wsSendMessage, updateChatLastMessage, adminUserId, addToast, scrollToBottom]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid file type',
        description: 'Please select an image file',
      });
      return;
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      addToast({
        type: 'error',
        title: 'File too large',
        description: 'Image must be less than 10MB',
      });
      return;
    }

    setSelectedImage(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Clear file input
    if (e.target) {
      e.target.value = '';
    }
  }, [addToast]);

  const handleClearImage = useCallback(() => {
    setSelectedImage(null);
    setImagePreviewUrl(null);
  }, []);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleOpenNotesDrawer = useCallback(() => {
    void refreshMessages();
    setIsNotesDrawerOpen(true);
  }, [refreshMessages]);

  const handlePlayerSelect = useCallback((player: Player, options?: { markAsRead?: boolean }) => {
    const { markAsRead } = options ?? {};
    const shouldMarkAsRead = markAsRead ?? DEFAULT_MARK_AS_READ;

    // Check if we're selecting a different player
    const isPlayerChange = previousPlayerIdRef.current !== player.user_id;

    // Load notes from localStorage as fallback if player doesn't have notes yet
    let playerWithNotes = player;
    if (player.user_id && (!player.notes || !player.notes.trim())) {
      const storageKey = `player_notes_${player.user_id}`;
      const storedNotes = storage.get(storageKey);
      if (storedNotes && storedNotes.trim()) {
        playerWithNotes = {
          ...player,
          notes: storedNotes,
        };
        if (!IS_PROD) {
          console.log('📝 [Player Select] Loaded notes from localStorage:', {
            playerId: player.user_id,
            notesLength: storedNotes.length,
          });
        }
      }
    }

    // Debug: Log player selection to verify IDs and notes
    if (!IS_PROD) {
      console.log('👤 [Player Select]', {
        username: playerWithNotes.username,
        chatId: playerWithNotes.id,
        userId: playerWithNotes.user_id,
        tab: activeTab,
        notes: playerWithNotes.notes,
        hasNotes: !!playerWithNotes.notes,
        isPlayerChange,
        fullPlayer: playerWithNotes,
      });
    }

    // Clear URL params when manually selecting a player from the chat list
    // This prevents the query param useEffect from re-selecting the original player
    const currentPlayerId = searchParams.get('playerId');
    const currentUsername = searchParams.get('username');
    if (currentPlayerId || currentUsername) {
      router.replace('/dashboard/chat', { scroll: false });
    }

    if (shouldMarkAsRead) {
      markChatAsReadDebounced({
        chatId: playerWithNotes.id,
        userId: playerWithNotes.user_id,
      });
    }

    setSelectedPlayer(playerWithNotes);
    setPendingPinMessageId(null);
    setMobileView('chat');

    // Only set scroll states when actually changing players
    // Otherwise, preserve current scroll position and state
    if (isPlayerChange) {
      // Reset scroll state to ensure we start fresh
      latestMessageIdRef.current = null;
      // Clear any pending refresh
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      isRefreshingMessagesRef.current = false;
      scrollPositionBeforeRefreshRef.current = null;
      displayedMessageIdsRef.current.clear(); // Reset animation tracking
      // Reset query param scroll tracking when player changes
      hasScrolledForQueryParamsRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markChatAsRead, activeTab, searchParams, router]);

  const handleNavigateToPlayer = useCallback(() => {
    if (selectedPlayer?.user_id) {
      router.push(`/dashboard/players/${selectedPlayer.user_id}`);
    }
  }, [selectedPlayer, router]);

  useEffect(() => {
    if (!selectedPlayer) {
      setPendingPinMessageId(null);
    }
  }, [selectedPlayer]);


  // Close emoji picker when clicking outside
  useEffect(() => {
    if (!showEmojiPicker) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!emojiPickerRef.current) {
        return;
      }

      if (emojiPickerRef.current.contains(event.target as Node)) {
        return;
      }

      setShowEmojiPicker(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showEmojiPicker]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker(prev => !prev);
  }, []);

  // ✨ OPTIMIZED: Refresh handler now uses the new hook
  const handleRefreshOnlinePlayers = useCallback(async () => {
    if (!hasValidAdminUser) {
      return;
    }
    await refetchOnlinePlayers();
  }, [hasValidAdminUser, refetchOnlinePlayers]);

  const handleTogglePin = useCallback(async (messageId: string, isPinned: boolean) => {
    if (!selectedPlayer) {
      addToast({
        type: 'error',
        title: 'Select a conversation first',
      });
      return;
    }

    if (pendingPinMessageId === messageId) {
      return;
    }

    const token = storage.get(TOKEN_KEY);
    if (!token) {
      addToast({
        type: 'error',
        title: 'Authentication required',
        description: 'Please sign in again to manage pinned messages.',
      });
      return;
    }

    const chatId = asPositiveNumber(selectedPlayer.id);
    const numericMessageId = asPositiveNumber(messageId);

    if (!chatId || !numericMessageId) {
      addToast({
        type: 'error',
        title: 'Invalid message reference',
        description: 'Unable to resolve chat or message identifiers for pinning.',
      });
      return;
    }

    const action = isPinned ? 'unpin' : 'pin';

    try {
      setPendingPinMessageId(messageId);

      const response = await fetch('/api/chat-message-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: numericMessageId,
          action,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          (result && (result.message || result.detail)) ||
          `Unable to ${action} this message right now.`;

        //  FIX: If message not found, it's likely a temporary WebSocket ID
        // Refresh messages to get real IDs and retry automatically
        if (errorMessage.includes('Message not found') || errorMessage.includes('message not found')) {
          if (!IS_PROD) console.log('🔄 Message not found, refreshing to get real IDs...');

          try {
            // Wait a bit for websocket to update message IDs, then retry
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!IS_PROD) console.log(' Retrying pin after brief delay...');

            // Retry the pin operation
            const retryResponse = await fetch('/api/chat-message-pin', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                chat_id: chatId,
                message_id: numericMessageId,
                action,
              }),
            });

            const retryResult = await retryResponse.json().catch(() => null);

            if (!retryResponse.ok) {
              throw new Error(
                (retryResult && (retryResult.message || retryResult.detail)) ||
                `Unable to ${action} this message after refresh.`
              );
            }

            // Success on retry!
            const pinnedState = Boolean(retryResult?.is_pinned ?? action === 'pin');
            updateMessagePinnedState(messageId, pinnedState);

            addToast({
              type: 'success',
              title: retryResult?.message ?? (pinnedState ? 'Message pinned' : 'Message unpinned'),
            });

            return; // Exit successfully
          } catch (retryError) {
            const retryDescription = retryError instanceof Error ? retryError.message : 'Unknown error';
            addToast({
              type: 'error',
              title: 'Failed to update pin status',
              description: retryDescription,
            });
            return;
          }
        }

        throw new Error(errorMessage);
      }

      const pinnedState = Boolean(result?.is_pinned ?? action === 'pin');
      updateMessagePinnedState(messageId, pinnedState);

      addToast({
        type: 'success',
        title: result?.message ?? (pinnedState ? 'Message pinned' : 'Message unpinned'),
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to update pin status',
        description,
      });
    } finally {
      setPendingPinMessageId(null);
    }
  }, [selectedPlayer, pendingPinMessageId, addToast, updateMessagePinnedState]);

  const handleNotesSaved = useCallback((savedNotes: string) => {
    if (!selectedPlayer) return;

    // Update selectedPlayer state immediately with the saved notes
    setSelectedPlayer(prev => {
      if (!prev) return null;
      return {
        ...prev,
        notes: savedNotes,
      };
    });

    // Also update the displayedPlayers list so the notes persist when switching tabs
    // This ensures notes are available in the player list
    const storageKey = `player_notes_${selectedPlayer.user_id}`;
    if (savedNotes.trim()) {
      storage.set(storageKey, savedNotes);
    } else {
      storage.remove(storageKey);
    }

    // Notes will eventually be updated via websocket, but this provides immediate feedback
    if (!IS_PROD) {
      console.log('📝 Notes saved and updated locally:', {
        playerId: selectedPlayer.user_id,
        notesLength: savedNotes.length,
      });
    }
  }, [selectedPlayer]);

  const handleOpenEditProfile = useCallback(() => {
    if (!selectedPlayer) return;

    setProfileFormData({
      username: selectedPlayer.username || '',
      full_name: selectedPlayer.fullName || '',
      dob: '', // You may need to add this field to the player data
      email: selectedPlayer.email || '',
      password: '',
      confirmPassword: '',
    });
    setIsEditProfileModalOpen(true);
  }, [selectedPlayer]);

  const handleUpdateProfile = useCallback(async () => {
    if (!selectedPlayer || isUpdatingProfile) {
      return;
    }

    // Validate passwords match if provided
    if (profileFormData.password && profileFormData.password !== profileFormData.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Password mismatch',
        description: 'Password and Confirm Password must match.',
      });
      return;
    }

    const token = storage.get(TOKEN_KEY);
    if (!token) {
      addToast({
        type: 'error',
        title: 'Authentication required',
        description: 'Please sign in again to update profile.',
      });
      return;
    }

    setIsUpdatingProfile(true);
    try {
      // Build update payload, only include password if it's provided
      const updatePayload: Record<string, string | undefined> = {
        username: profileFormData.username,
        full_name: profileFormData.full_name,
        email: profileFormData.email,
      };

      if (profileFormData.dob) {
        updatePayload.dob = profileFormData.dob;
      }

      if (profileFormData.password) {
        updatePayload.password = profileFormData.password;
      }

      const response = await fetch(`/api/admin/players/${selectedPlayer.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          (result && (result.message || result.detail)) ||
          'Unable to update profile right now.';
        throw new Error(errorMessage);
      }

      addToast({
        type: 'success',
        title: 'Profile updated successfully',
      });

      setIsEditProfileModalOpen(false);

      // Update the selected player with new data
      setSelectedPlayer(prev => prev ? {
        ...prev,
        username: profileFormData.username,
        fullName: profileFormData.full_name,
        email: profileFormData.email,
      } : null);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to update profile',
        description,
      });
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [selectedPlayer, profileFormData, isUpdatingProfile, addToast]);

  const handleOpenEditBalance = useCallback(() => {
    if (!selectedPlayer) return;
    setBalanceValue(0);
    setBalanceAdjustmentKind('freeplay');
    setBalanceRemarks('');
    setIsEditBalanceModalOpen(true);
  }, [selectedPlayer]);

  const handleManualAdjustmentPrimary = useCallback(async () => {
    if (!selectedPlayer || isUpdatingBalance) return;

    if (balanceValue <= 0) {
      addToast({
        type: 'error',
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0.',
      });
      return;
    }

    if (balanceAdjustmentKind === 'external_cashout') {
      const cashoutCheck = validateExternalCashoutAmount(
        balanceValue,
        selectedPlayer.cashoutLimit,
        selectedPlayer.balance,
      );
      if (!cashoutCheck.ok) {
        let description = 'This external cashout cannot be submitted.';
        switch (cashoutCheck.reason) {
          case 'invalid_amount':
            description = 'Enter an amount greater than 0.';
            break;
          case 'limit_unknown':
            description =
              'Cashout limit must be loaded before external cashout. Refresh the player or reopen the drawer.';
            break;
          case 'exceeds_limit':
            description = 'External cashout cannot exceed the player’s cashout limit.';
            break;
          case 'exceeds_balance':
            description = 'External cashout cannot exceed the player’s balance.';
            break;
        }
        addToast({
          type: 'error',
          title: 'External cashout not allowed',
          description,
        });
        return;
      }
    }

    const operation: 'increase' | 'decrease' =
      balanceAdjustmentKind === 'freeplay' || balanceAdjustmentKind === 'external_deposit'
        ? 'increase'
        : 'decrease';

    setIsUpdatingBalance(true);
    try {
      const { playersApi } = await import('@/lib/api/users');

      const payload = buildManualPaymentRequestBody(selectedPlayer.user_id, balanceAdjustmentKind, balanceValue, {
        remarks: balanceRemarks,
      });

      const rawPayment = await playersApi.manualPayment(payload);
      const response: ManualPaymentResponse =
        normalizeManualPaymentResponse(rawPayment) ?? (rawPayment as ManualPaymentResponse);

      const manualPaymentTs = Date.now();
      lastManualPaymentRef.current = {
        playerId: selectedPlayer.user_id,
        amount: balanceValue,
        operation,
        adjustmentKind: balanceAdjustmentKind,
        timestamp: manualPaymentTs,
      };

      setTimeout(() => {
        if (lastManualPaymentRef.current?.timestamp === manualPaymentTs) {
          lastManualPaymentRef.current = null;
        }
      }, 10000);

      const titleByKind: Record<ManualAdjustmentKind, string> = {
        freeplay: `$${balanceValue} freeplay added`,
        external_deposit: `$${balanceValue} external deposit recorded`,
        external_cashout: `$${balanceValue} external cashout recorded`,
        void: `$${balanceValue} void applied`,
      };

      let description = `Balance: ${formatCurrency(response.player_bal)}`;
      if (response.cashout_limit !== undefined && response.cashout_limit !== null && String(response.cashout_limit) !== '') {
        description += `\nCashout limit: ${formatCurrency(String(response.cashout_limit))}`;
      }
      if (response.locked_balance !== undefined && response.locked_balance !== null && String(response.locked_balance) !== '') {
        description += `\nLocked: ${formatCurrency(String(response.locked_balance))}`;
      }

      addToast({
        type: 'success',
        title: titleByKind[balanceAdjustmentKind],
        description,
      });

      setIsEditBalanceModalOpen(false);
      setBalanceValue(0);
      setBalanceRemarks('');

      setSelectedPlayer((prev) =>
        prev
          ? {
              ...prev,
              balance: String(response.player_bal),
              winningBalance:
                response.player_winning_bal !== undefined && response.player_winning_bal !== null
                  ? String(response.player_winning_bal)
                  : undefined,
              ...(response.cashout_limit !== undefined && response.cashout_limit !== null
                ? { cashoutLimit: String(response.cashout_limit) }
                : {}),
              ...(response.locked_balance !== undefined && response.locked_balance !== null
                ? { lockedBalance: String(response.locked_balance) }
                : {}),
            }
          : null,
      );

      void refreshActiveChats();
    } catch (error) {
      let errorMessage = 'Unknown error';

      if (error && typeof error === 'object') {
        const apiError = error as { message?: string; detail?: string; error?: string; status?: string };
        errorMessage = apiError.message || apiError.detail || apiError.error || errorMessage;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      addToast({
        type: 'error',
        title: 'Failed to update balance',
        description: errorMessage,
      });
    } finally {
      setIsUpdatingBalance(false);
    }
  }, [
    selectedPlayer,
    balanceValue,
    balanceAdjustmentKind,
    balanceRemarks,
    isUpdatingBalance,
    addToast,
    refreshActiveChats,
  ]);

  // Log online players connection status
  useEffect(() => {
    if (!IS_PROD && activeTab === 'online') {
      console.log('🌐 [Online Players] Status:', {
        loading: isLoadingApiOnlinePlayers,
        count: apiOnlinePlayers.length,
        wsConnected: isOnlinePlayersWSConnected,
        error: onlinePlayersError,
      });
    }
  }, [activeTab, isLoadingApiOnlinePlayers, apiOnlinePlayers.length, isOnlinePlayersWSConnected, onlinePlayersError]);

  // Mark read once per selected player, not on every selectedPlayer object update
  const lastMarkedReadPlayerIdRef = useRef<number | null>(null);
  useEffect(() => {
    const selectedPlayerId = selectedPlayer?.user_id ?? null;
    const selectedPlayerUsername = selectedPlayer?.username ?? '';

    if (!selectedPlayerId) {
      lastMarkedReadPlayerIdRef.current = null;
      return;
    }

    if (!isConnected || lastMarkedReadPlayerIdRef.current === selectedPlayerId) {
      return;
    }

    if (!IS_PROD) {
      console.log('📬 Chat opened, marking messages as read for player:', selectedPlayerUsername);
    }

    // Use a small delay to ensure the WebSocket is fully ready
    const timeoutId = setTimeout(() => {
      markAllAsRead();
      lastMarkedReadPlayerIdRef.current = selectedPlayerId;
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [isConnected, selectedPlayer?.user_id, selectedPlayer?.username, markAllAsRead]);

  const queryPlayerId = searchParams.get('playerId');
  const queryUsername = searchParams.get('username');

  // Effect to handle query param player selection - runs only when queryPlayerId changes
  useEffect(() => {
    if (!queryPlayerId) {
      // Only clear processing refs, but KEEP queryParamPlayerRef if player is already selected
      // This prevents the player from disappearing from the list when URL is cleared
      processedQueryPlayerIdRef.current = null;
      lastSetSearchQueryRef.current = '';
      // NOTE: We intentionally do NOT clear queryParamPlayerRef here
      // The player should remain visible in the list even after URL params are cleared
      return;
    }

    const rawUserId = Number(queryPlayerId);
    const targetUserId = Number.isFinite(rawUserId) ? rawUserId : null;

    if (!targetUserId) {
      return;
    }

    // Reset processed ref if queryPlayerId changed to a different player
    if (processedQueryPlayerIdRef.current !== null && processedQueryPlayerIdRef.current !== targetUserId) {
      processedQueryPlayerIdRef.current = null;
      lastSetSearchQueryRef.current = '';
    }

    // Skip if we've already processed this exact playerId
    if (processedQueryPlayerIdRef.current === targetUserId) {
      return;
    }

    // When a player is selected via query params, ensure we have all players loaded
    if (allPlayers.length === 0 && !isLoadingAllPlayers) {
      void fetchAllPlayers();
    }

    // Switch to "all-chats" tab when query params are present
    setActiveTab('all-chats');
  }, [queryPlayerId, allPlayers.length, isLoadingAllPlayers, fetchAllPlayers]);

  // Separate effect to find and select player when data is available
  // Uses refs to prevent re-render loops when allPlayers/activeChatsUsers arrays change
  // FIX: Now also fetches player from API when not found in loaded data
  useEffect(() => {
    if (!queryPlayerId) {
      return;
    }

    const rawUserId = Number(queryPlayerId);
    const targetUserId = Number.isFinite(rawUserId) ? rawUserId : null;

    if (!targetUserId) {
      if (!IS_PROD) console.log(`⚠️ [Query Param] Invalid targetUserId from queryPlayerId=${queryPlayerId}`);
      return;
    }

    // Skip if we've already processed this playerId
    if (processedQueryPlayerIdRef.current === targetUserId) {
      if (!IS_PROD) console.log(`⏭️ [Query Param] Already processed player ${targetUserId}, skipping`);
      return;
    }

    // Search for the player in the available data
    let candidate = [...allPlayers, ...activeChatsUsers].find((player) => {
      return player.user_id === targetUserId;
    });

    // If not found in loaded data, check if we have them in the ref (from a previous find)
    if (!candidate && queryParamPlayerRef.current && queryParamPlayerRef.current.user_id === targetUserId) {
      candidate = queryParamPlayerRef.current;
    }

    // FIX: If player not found anywhere, fetch from API directly
    // This prevents the "No players found" message while allPlayers is loading
    if (!candidate) {
      const fetchPlayerById = async () => {
        try {
          if (!IS_PROD) console.log(`🔍 [Query Param] Player ${targetUserId} not found in loaded data, fetching from API...`);

          const token = storage.get(TOKEN_KEY);
          // Use the players detail endpoint to get the full player data (username, email, etc.)
          const response = await fetch(`/api/player-details/${targetUserId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          });

          if (!response.ok) {
            if (!IS_PROD) console.error(`❌ [Query Param] Failed to fetch player ${targetUserId}:`, response.status);
            return;
          }

          const data = await response.json();
          if (!IS_PROD) console.log(`✅ [Query Param] Fetched player data:`, data);

          // Transform the player data to ChatUser format
          const player = data.player || data;
          if (player && (player.id || player.user_id)) {
            const chatUser: Player = {
              id: String(player.chatroom_id || player.id || ''),
              user_id: Number(player.id || player.user_id || 0),
              username: player.username || player.full_name || 'Unknown',
              fullName: player.full_name || player.name || undefined,
              email: player.email || '',
              avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
              isOnline: player.is_online || false,
              lastMessage: player.last_message || undefined,
              lastMessageTime: player.last_message_timestamp || undefined,
              balance: player.balance !== undefined ? String(player.balance) : undefined,
              ...pickWinningBalanceFromBackend(player as Record<string, unknown>),
              cashoutLimit:
                player.cashout_limit !== undefined && player.cashout_limit !== null
                  ? String(player.cashout_limit)
                  : undefined,
              lockedBalance:
                player.locked_balance !== undefined && player.locked_balance !== null
                  ? String(player.locked_balance)
                  : undefined,
              gamesPlayed: player.games_played || player.gems || undefined,
              winRate: player.win_rate || undefined,
              phone: player.phone_number || player.mobile_number || undefined,
              unreadCount: player.unread_messages_count || 0,
              notes: player.notes || undefined,
            };

            // Store in ref immediately so displayedPlayers includes them
            queryParamPlayerRef.current = chatUser;
            processedQueryPlayerIdRef.current = targetUserId;

            // Set search query
            if (chatUser.username && lastSetSearchQueryRef.current !== chatUser.username) {
              lastSetSearchQueryRef.current = chatUser.username;
              setSearchQuery(chatUser.username);
            }

            // Select the player
            setActiveTab('all-chats');
            setSelectedPlayer(chatUser);
            setPendingPinMessageId(null);
            setMobileView('chat');

            // Mark as read if has chatId
            if (chatUser.id) {
              markChatAsReadDebounced({
                chatId: chatUser.id,
                userId: chatUser.user_id,
              });
            }

            // Clear URL params after a short delay
            setTimeout(() => {
              router.replace('/dashboard/chat', { scroll: false });
            }, 100);
          }
        } catch (error) {
          console.error('❌ [Query Param] Error fetching player:', error);
        }
      };

      // Fetch player from API
      void fetchPlayerById();
      return; // Exit early, the fetch will handle everything
    }

    if (candidate) {
      // Mark this playerId as processed to prevent re-running
      processedQueryPlayerIdRef.current = targetUserId;

      // Store the player in ref to ensure they always appear in the list
      // This prevents them from disappearing if they're not in the first page of allPlayers
      queryParamPlayerRef.current = candidate;

      // Set search query only if not already set for this player
      if (candidate.username && lastSetSearchQueryRef.current !== candidate.username) {
        lastSetSearchQueryRef.current = candidate.username;
        setSearchQuery(candidate.username);
      }

      // Select the player if not already selected
      // Set selectedPlayer directly to avoid handlePlayerSelect clearing URL params too early
      if (!selectedPlayer || selectedPlayer.user_id !== candidate.user_id) {
        setActiveTab('all-chats');
        // Set player state directly first
        setSelectedPlayer(candidate);
        setPendingPinMessageId(null);
        setMobileView('chat');

        // Mark as read
        markChatAsReadDebounced({
          chatId: candidate.id,
          userId: candidate.user_id,
        });

        // Clear URL params after a short delay to ensure state is set
        setTimeout(() => {
          router.replace('/dashboard/chat', { scroll: false });
        }, 100);
      }
    } else if (queryParamPlayerRef.current && queryParamPlayerRef.current.user_id === targetUserId) {
      // If we have the player in ref but they're not in the data yet, still select them
      // This handles the case where the player appears in the list but data hasn't loaded
      if (!selectedPlayer || selectedPlayer.user_id !== queryParamPlayerRef.current.user_id) {
        setActiveTab('all-chats');
        const player = queryParamPlayerRef.current;
        // Set player state directly first
        setSelectedPlayer(player);
        setPendingPinMessageId(null);
        setMobileView('chat');

        // Mark as read if player has chatId
        if (player.id) {
          markChatAsReadDebounced({
            chatId: player.id,
            userId: player.user_id,
          });
        }

        // Clear URL params after a short delay to ensure state is set
        setTimeout(() => {
          router.replace('/dashboard/chat', { scroll: false });
        }, 100);
      }
    }
  }, [queryPlayerId, allPlayers, activeChatsUsers, selectedPlayer, markChatAsReadDebounced, router]);

  // Fallback effect: Ensure selectedPlayer is set if we have queryPlayerId and player in ref
  // This handles cases where the player is in the list but wasn't selected yet
  useEffect(() => {
    if (!queryPlayerId || !queryParamPlayerRef.current) {
      return;
    }

    const rawUserId = Number(queryPlayerId);
    const targetUserId = Number.isFinite(rawUserId) ? rawUserId : null;

    if (!targetUserId || queryParamPlayerRef.current.user_id !== targetUserId) {
      return;
    }

    // If we have the player in ref but selectedPlayer is null or different, select them
    // Set selectedPlayer directly to avoid handlePlayerSelect clearing URL params too early
    if (!selectedPlayer || selectedPlayer.user_id !== targetUserId) {
      setActiveTab('all-chats');
      const player = queryParamPlayerRef.current;
      // Set player state directly first
      setSelectedPlayer(player);
      setPendingPinMessageId(null);
      setMobileView('chat');

      // Mark as read if player has chatId
      if (player.id) {
        markChatAsReadDebounced({
          chatId: player.id,
          userId: player.user_id,
        });
      }

      // Clear URL params after a short delay to ensure state is set
      setTimeout(() => {
        router.replace('/dashboard/chat', { scroll: false });
      }, 100);
    }
  }, [queryPlayerId, selectedPlayer, markChatAsReadDebounced, router]);

  // Effect to handle username query param player selection
  useEffect(() => {
    // Only process username if playerId is not present (playerId takes precedence)
    if (queryPlayerId || !queryUsername) {
      if (!queryUsername) {
        // Clear processing ref when username param is removed
        processedQueryUsernameRef.current = null;
      }
      return;
    }

    const targetUsername = queryUsername.trim().toLowerCase();

    if (!targetUsername) {
      return;
    }

    // Reset processed ref if username changed to a different player
    if (processedQueryUsernameRef.current !== null && processedQueryUsernameRef.current !== targetUsername) {
      processedQueryUsernameRef.current = null;
      lastSetSearchQueryRef.current = '';
    }

    // Skip if we've already processed this exact username
    if (processedQueryUsernameRef.current === targetUsername) {
      return;
    }

    // When a player is selected via query params, ensure we have all players loaded
    if (allPlayers.length === 0 && !isLoadingAllPlayers) {
      void fetchAllPlayers();
    }

    // Switch to "all-chats" tab when query params are present
    setActiveTab('all-chats');
  }, [queryUsername, queryPlayerId, allPlayers.length, isLoadingAllPlayers, fetchAllPlayers]);

  // Separate effect to find and select player by username when data is available
  useEffect(() => {
    // Only process username if playerId is not present (playerId takes precedence)
    if (queryPlayerId || !queryUsername) {
      return;
    }

    const targetUsername = queryUsername.trim().toLowerCase();

    if (!targetUsername) {
      return;
    }

    // Skip if we've already processed this username
    if (processedQueryUsernameRef.current === targetUsername) {
      if (!IS_PROD) console.log(`⏭️ [Query Param Username] Already processed username ${targetUsername}, skipping`);
      return;
    }

    // Search for the player by username in the available data (case-insensitive)
    let candidate = [...allPlayers, ...activeChatsUsers].find((player) => {
      const playerUsername = (player.username || '').trim().toLowerCase();
      return playerUsername === targetUsername;
    });

    // If not found in loaded data, check if we have them in the ref (from a previous find)
    if (!candidate && queryParamPlayerRef.current) {
      const refUsername = (queryParamPlayerRef.current.username || '').trim().toLowerCase();
      if (refUsername === targetUsername) {
        candidate = queryParamPlayerRef.current;
      }
    }

    if (candidate) {
      // Mark this username as processed to prevent re-running
      processedQueryUsernameRef.current = targetUsername;

      // Store the player in ref to ensure they always appear in the list
      queryParamPlayerRef.current = candidate;

      // Set search query only if not already set for this player
      if (candidate.username && lastSetSearchQueryRef.current !== candidate.username) {
        lastSetSearchQueryRef.current = candidate.username;
        setSearchQuery(candidate.username);
      }

      // Select the player if not already selected
      if (!selectedPlayer || selectedPlayer.user_id !== candidate.user_id) {
        setActiveTab('all-chats');
        setSelectedPlayer(candidate);
        setPendingPinMessageId(null);
        setMobileView('chat');

        // Mark as read
        markChatAsReadDebounced({
          chatId: candidate.id,
          userId: candidate.user_id,
        });

        // Clear URL params after a short delay to ensure state is set
        setTimeout(() => {
          router.replace('/dashboard/chat', { scroll: false });
        }, 100);
      }
    } else if (queryParamPlayerRef.current) {
      // If we have the player in ref but they're not in the data yet, still select them
      const refUsername = (queryParamPlayerRef.current.username || '').trim().toLowerCase();
      if (refUsername === targetUsername) {
        if (!selectedPlayer || selectedPlayer.user_id !== queryParamPlayerRef.current.user_id) {
          setActiveTab('all-chats');
          const player = queryParamPlayerRef.current;
          setSelectedPlayer(player);
          setPendingPinMessageId(null);
          setMobileView('chat');

          // Mark as read if player has chatId
          if (player.id) {
            markChatAsReadDebounced({
              chatId: player.id,
              userId: player.user_id,
            });
          }

          // Clear URL params after a short delay to ensure state is set
          setTimeout(() => {
            router.replace('/dashboard/chat', { scroll: false });
          }, 100);
        }
      }
    }
  }, [queryUsername, queryPlayerId, allPlayers, activeChatsUsers, selectedPlayer, markChatAsReadDebounced, router]);

  // Scroll to bottom when navigating from player page via query params
  useEffect(() => {
    if (!queryPlayerId && !queryUsername) {
      // Clear the ref when query params are removed
      hasScrolledForQueryParamsRef.current = null;
      return;
    }

    if (!selectedPlayer) {
      return;
    }

    // Verify this is the player from query params
    let matchesQuery = false;
    let queryKey = '';

    if (queryPlayerId) {
      const rawUserId = Number(queryPlayerId);
      const targetUserId = Number.isFinite(rawUserId) ? rawUserId : null;
      if (targetUserId && selectedPlayer.user_id === targetUserId) {
        matchesQuery = true;
        queryKey = `playerId-${queryPlayerId}`;
      }
    } else if (queryUsername) {
      const targetUsername = queryUsername.trim().toLowerCase();
      const playerUsername = (selectedPlayer.username || '').trim().toLowerCase();
      if (targetUsername && playerUsername === targetUsername) {
        matchesQuery = true;
        queryKey = `username-${queryUsername}`;
      }
    }

    if (!matchesQuery) {
      return;
    }

    // Skip if we've already scrolled for this query param
    if (hasScrolledForQueryParamsRef.current === queryKey) {
      return;
    }

    // Wait for messages to load, then scroll to bottom
    if (wsMessages.length > 0 && !isHistoryLoadingMessages) {
      // Mark that we've scrolled for this query param combination
      hasScrolledForQueryParamsRef.current = queryKey;

      const scrollTimeout = setTimeout(() => {
        scrollToBottom(true);
      }, 100);

      return () => {
        clearTimeout(scrollTimeout);
      };
    }
  }, [queryUsername, queryPlayerId, selectedPlayer, wsMessages.length, isHistoryLoadingMessages, scrollToBottom]);

  // Removed auto-selection of first player - users should manually select a player to chat with

  useEffect(() => {
    if (!selectedPlayer) {
      previousPlayerIdRef.current = null;
      return;
    }

    const isActualPlayerChange = previousPlayerIdRef.current !== selectedPlayer.user_id;
    previousPlayerIdRef.current = selectedPlayer.user_id;

    if (!isActualPlayerChange) return;

    latestMessageIdRef.current = null;
    wasHistoryLoadingRef.current = false;
    hasScrolledToInitialLoadRef.current = false;
  }, [selectedPlayer, wsMessages.length]);

  useEffect(() => {
    const lastMessage = wsMessages[wsMessages.length - 1];
    if (!lastMessage) {
      latestMessageIdRef.current = null;
      return;
    }

    const hasNewLatest = latestMessageIdRef.current !== lastMessage.id;

    if (isRefreshingMessagesRef.current) {
      latestMessageIdRef.current = lastMessage.id;
      return;
    }

    latestMessageIdRef.current = lastMessage.id;

    if (!hasNewLatest) {
      return;
    }

    if (!hasScrolledToInitialLoadRef.current && wsMessages.length > 0) {
      hasScrolledToInitialLoadRef.current = true;

      scrollToBottom(true);
      return;
    }

    const shouldAutoScroll = !isRefreshingMessagesRef.current && isUserAtBottom;

    if (shouldAutoScroll) {
      setHasNewMessagesWhileScrolled(false);
      scrollToBottom(true);
    } else {
      //  NEW MESSAGE INDICATOR: Show indicator when new messages arrive and user is scrolled up
      if (!isRefreshingMessagesRef.current && hasNewLatest && !isUserAtBottom) {
        setHasNewMessagesWhileScrolled(true);
      }
    }
  }, [wsMessages, isHistoryLoadingMessages, scrollToBottom, isUserAtBottom]);

  useEffect(() => {
    const wasLoading = wasHistoryLoadingRef.current;
    wasHistoryLoadingRef.current = isHistoryLoadingMessages;

    //  CRITICAL: Don't auto-scroll if we're refreshing messages
    if (isRefreshingMessagesRef.current) {
      return;
    }

    //  TARGETED LATEST: History load completion → Only scroll to latest if we haven't scrolled yet
    // This preserves natural behavior while ensuring latest message for initial scenarios
    if (wasLoading && !isHistoryLoadingMessages && !hasScrolledToInitialLoadRef.current && wsMessages.length > 0) {
      hasScrolledToInitialLoadRef.current = true;

      scrollToBottom(true);
    }
  }, [isHistoryLoadingMessages, wsMessages.length, scrollToBottom]);

  // Cleanup: Clear refresh timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 gap-0 overflow-hidden bg-background md:gap-4">
      {/* Left Column - Player List */}
      <PlayerListSidebar
        mobileView={mobileView}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        displayedPlayers={displayedPlayers}
        selectedPlayer={selectedPlayer}
        onlinePlayersCount={displayOnlinePlayersTotal}
        activeChatsCount={
          activeTab === 'online'
            ? displayOnlinePlayersTotal
            : activeChatsUsers.length
        }
        directoryAllPlayersCount={allPlayersApiTotalCount ?? chatListAllPlayersCount}
        playersWithChatsTotalCount={playersWithChatsTotalCount}
        isCurrentTabLoading={isCurrentTabLoading}
        isPlayerSearchLoading={isPlayerSearchLoading}
        isLoadingApiOnlinePlayers={isLoadingApiOnlinePlayers}
        isLoadingMore={isLoadingMore}
        hasMorePlayers={hasMorePlayers}
        usersError={usersError}
        onPlayerSelect={handlePlayerSelect}
        onRefreshOnlinePlayers={handleRefreshOnlinePlayers}
        onLoadMore={loadMorePlayers}
      />

      {/* Middle Column - Chat Conversation */}
      <div
        className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden border-r border-border bg-card shadow-sm md:w-auto`}
      >
        {selectedPlayer ? (
          <>
            {/* Chat Header */}
            <ChatHeader
              selectedPlayer={selectedPlayer}
              isConnected={isConnected}
              connectionError={connectionError}
              mobileView={mobileView}
              setMobileView={setMobileView}
              onNavigateToPlayer={handleNavigateToPlayer}
              onOpenNotesDrawer={handleOpenNotesDrawer}
              playerLastSeenAt={playerLastSeenAt}
            />

            {/* Connection Status Banner */}
            {!isConnected && (
              <div className="flex shrink-0 items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-amber-700 animate-in fade-in slide-in-from-top-1 duration-300 dark:text-amber-400">
                <svg className="w-3.5 h-3.5 animate-spin shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="3" />
                  <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span className="text-[11px] font-medium">
                  {connectionError ? `Connection lost: ${connectionError}` : 'Reconnecting...'}
                </span>
              </div>
            )}

            {/* Pinned Messages Section */}
            <PinnedMessagesSection
              messages={wsMessages}
              isExpanded={isPinnedMessagesExpanded}
              onToggleExpanded={() => setIsPinnedMessagesExpanded(!isPinnedMessagesExpanded)}
              onTogglePin={handleTogglePin}
              pendingPinMessageId={pendingPinMessageId}
            />

            <div
              ref={messagesContainerRef}
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
              className="relative min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain bg-gradient-to-b from-muted/10 via-transparent to-background scrollbar-smooth"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
              }}
              onScroll={handleScroll}
            >
              <div className="min-w-0 space-y-6 px-3 py-4 sm:px-4 sm:py-5 md:px-8 md:py-8">

                {/* Sentinel for IntersectionObserver-based infinite scroll */}
                <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden="true" />

                {/* Inline loading shimmer for older messages */}
                {isLoadingOlder && (
                  <div className="flex justify-center py-1">
                    <div className="h-0.5 w-20 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-1/2 rounded-full bg-primary/30 animate-scroll-load" />
                    </div>
                  </div>
                )}

                {/* Beginning of conversation marker */}
                {!hasMoreHistory && wsMessages.length > 0 && !isHistoryLoadingMessages && (
                  <div className="flex items-center justify-center py-2">
                    <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">
                      Beginning of conversation
                    </span>
                  </div>
                )}

                {isHistoryLoadingMessages && wsMessages.length === 0 && <MessageHistorySkeleton />}
                {!isHistoryLoadingMessages && wsMessages.length === 0 && isConnected && (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                    <div className="text-center space-y-2">
                      <p className="text-muted-foreground text-sm md:text-base">
                        No chat history available
                      </p>
                    </div>
                  </div>
                )}
                {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                  <div key={date} className="space-y-3">
                    {/* Date Separator */}
                    <div className="flex items-center justify-center my-8 first:mt-0">
                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-border/40" />
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-3 py-1 bg-card/90 backdrop-blur-sm text-[8px] font-semibold uppercase tracking-wide text-muted-foreground rounded-full border border-border/40 shadow-sm">
                            {formatMessageDate(date)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Messages for this date */}
                    {dateMessages.map((message, idx) => {
                      const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                      const isAuto = isAutoMessage(message);
                      const isPurchase = isPurchaseNotification(message);
                      const isKyc = isKycVerificationMessage(message);
                      const isSystemMessage = isAuto || isPurchase || isKyc;
                      const showAvatar = !isSystemMessage && message.sender === 'player' && (
                        !prevMessage || prevMessage.sender !== message.sender ||
                        (prevMessage.time && message.time &&
                          Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() -
                            new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
                      );
                      const isConsecutive = !isSystemMessage && prevMessage && !isAutoMessage(prevMessage) && !isPurchaseNotification(prevMessage) && !isKycVerificationMessage(prevMessage) && prevMessage.sender === message.sender;
                      const isAdmin = !isSystemMessage && message.sender === 'admin';
                      const isPinning = pendingPinMessageId === message.id;

                      if (!displayedMessageIdsRef.current.has(message.id)) {
                        displayedMessageIdsRef.current.add(message.id);
                      }

                      return (
                        <div key={message.id} data-message-id={message.id}>
                          <MessageBubble
                            message={message}
                            selectedPlayer={selectedPlayer}
                            isAdmin={isAdmin}
                            showAvatar={Boolean(showAvatar)}
                            isConsecutive={Boolean(isConsecutive)}
                            isPinning={isPinning}
                            onExpandImage={setExpandedImage}
                            onTogglePin={handleTogglePin}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
              {/* End content wrapper */}

              {/* Rule 10 & 11: Scroll-to-bottom button - show when away from bottom, hide when at bottom */}
              {!isUserAtBottom && (
                <div className="pointer-events-none sticky bottom-3 z-20 flex justify-end px-2 sm:bottom-4 sm:px-3">
                  <div className="pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => {
                        scrollToBottom(true); // Rule 6: Force scroll (bypasses cooldown)
                        setHasNewMessagesWhileScrolled(false); // Clear indicator
                      }}
                      aria-label="Jump to latest messages"
                      className={`group relative flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/95 text-muted-foreground shadow-md backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:h-12 sm:w-12 ${hasNewMessagesWhileScrolled ? 'border-primary/40 text-primary' : ''}`}
                    >
                      <span className="absolute bottom-full right-0 z-30 mb-2 hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground shadow-lg group-hover:flex group-focus-visible:flex">
                        <ArrowDownNarrowWide className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                        Jump to latest
                      </span>
                      <ArrowDownNarrowWide className="h-5 w-5" strokeWidth={2.5} />
                      {hasNewMessagesWhileScrolled && (
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary shadow-sm ring-2 ring-card" aria-hidden />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Typing + composer: always above message scroll; z-index avoids overlap; shrink-0 avoids clipping when column is tight */}
            <div className="relative z-[100] isolate mt-auto flex shrink-0 flex-col bg-card">
              {remoteTyping && (
                <div className="shrink-0 border-t border-border/30 bg-card/80 px-4 py-2 backdrop-blur-sm md:px-6">
                  <div className="flex items-end justify-start gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-[10px] font-bold text-white shadow-md shadow-blue-500/20 ring-2 ring-white/20 dark:ring-white/10 md:h-9 md:w-9">
                      {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="rounded-2xl rounded-bl-sm bg-gradient-to-br from-blue-500 to-indigo-500 px-3 py-2 shadow-lg shadow-blue-500/20 md:px-4 md:py-3">
                      <div className="flex gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-white/80 typing-indicator-smooth" />
                        <div className="h-1.5 w-1.5 rounded-full bg-white/80 typing-indicator-smooth" />
                        <div className="h-1.5 w-1.5 rounded-full bg-white/80 typing-indicator-smooth" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <MessageInputArea
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                selectedImage={selectedImage}
                imagePreviewUrl={imagePreviewUrl}
                isUploadingImage={isUploadingImage}
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                commonEmojis={commonEmojis}
                emojiPickerRef={emojiPickerRef}
                fileInputRef={fileInputRef}
                onSendMessage={handleSendMessage}
                onKeyPress={handleKeyPress}
                onImageSelect={handleImageSelect}
                onClearImage={handleClearImage}
                onAttachClick={handleAttachClick}
                onEmojiSelect={handleEmojiSelect}
                toggleEmojiPicker={toggleEmojiPicker}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
            <EmptyState onlinePlayersCount={displayOnlinePlayersTotal} />
          </div>
        )}
      </div>

      {/* Right Column - Player Info */}
      {selectedPlayerLedgerView && (
        <PlayerInfoSidebar
          selectedPlayer={selectedPlayerLedgerView}
          isConnected={isConnected}
          mobileView={mobileView}
          setMobileView={setMobileView}
          notes={notes}
          onNavigateToPlayer={handleNavigateToPlayer}
          onOpenEditBalance={handleOpenEditBalance}
          onOpenEditProfile={handleOpenEditProfile}
          onOpenNotesDrawer={handleOpenNotesDrawer}
        />
      )}

      {/* Modals */}
      <EditProfileDrawer
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        profileFormData={profileFormData}
        setProfileFormData={setProfileFormData}
        isUpdating={isUpdatingProfile}
        onUpdate={handleUpdateProfile}
      />

      <EditBalanceDrawer
        isOpen={isEditBalanceModalOpen}
        onClose={() => setIsEditBalanceModalOpen(false)}
        credits={selectedPlayerLedgerView?.balance ?? '0'}
        winnings={selectedPlayerLedgerView?.winningBalance}
        cashoutLimit={selectedPlayerLedgerView?.cashoutLimit}
        adjustmentKind={balanceAdjustmentKind}
        setAdjustmentKind={setBalanceAdjustmentKind}
        balanceValue={balanceValue}
        setBalanceValue={setBalanceValue}
        remarks={balanceRemarks}
        setRemarks={setBalanceRemarks}
        isUpdating={isUpdatingBalance}
        onPrimaryAction={handleManualAdjustmentPrimary}
      />

      <NotesDrawer
        isOpen={isNotesDrawerOpen}
        onClose={() => setIsNotesDrawerOpen(false)}
        selectedPlayer={selectedPlayer as ChatUser}
        notes={notes}
        onNotesSaved={handleNotesSaved}
      />

      {/* Expanded Image Modal */}
      {expandedImage && (
        <ExpandedImageModal
          imageUrl={expandedImage}
          onClose={() => setExpandedImage(null)}
        />
      )}
    </div>
  );
};

export default ChatComponent;
