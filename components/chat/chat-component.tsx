'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser, ChatMessage } from '@/types';

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
        !IS_PROD && console.log('📍 Admin User ID:', candidateId);
        return candidateId;
      }

      !IS_PROD && console.warn('⚠️ Stored user data is missing a valid admin ID.');
    }
  } catch (error) {
    console.error('❌ Failed to parse user data from localStorage:', error);
  }

  !IS_PROD && console.warn('⚠️ Admin user ID unavailable. Chat endpoints remain disabled until authentication completes.');
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
  const today = new Date();
  const messageDate = new Date(date);
  const diffTime = today.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Strip HTML tags and decode HTML entities for preview text
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const LOAD_MORE_SCROLL_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 64;
const MAX_UNREAD_BADGE_COUNT = 99;
const DEFAULT_MARK_AS_READ = true;

const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

const hasHtmlContent = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  return HTML_TAG_REGEX.test(value);
};

const MESSAGE_HTML_CONTENT_CLASS = {
  admin: [
    'text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap',
    'text-foreground',
    '[&_b]:text-primary [&_b]:font-semibold [&_b]:bg-primary/5 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:rounded [&_b]:inline-flex [&_b]:items-center',
    '[&_strong]:text-primary [&_strong]:font-semibold',
    '[&_em]:text-muted-foreground',
    '[&_br]:block [&_br]:h-2',
  ].join(' '),
  player: [
    'text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap',
    'text-white',
    '[&_b]:text-white [&_b]:font-semibold [&_b]:bg-white/10 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:rounded [&_b]:inline-flex [&_b]:items-center',
    '[&_strong]:text-white [&_strong]:font-semibold',
    '[&_em]:text-white/80',
    '[&_br]:block [&_br]:h-2',
  ].join(' '),
};

const PURCHASE_HTML_CONTENT_CLASS = [
  'prose prose-sm dark:prose-invert max-w-none',
  'prose-headings:text-foreground prose-headings:font-semibold',
  'prose-p:text-foreground prose-p:leading-relaxed prose-p:my-1',
  'prose-strong:text-primary prose-strong:font-semibold',
  'prose-em:text-muted-foreground',
  'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
  'prose-ul:my-1 prose-ul:list-disc prose-ul:pl-4',
  'prose-ol:my-1 prose-ol:list-decimal prose-ol:pl-4',
  'prose-li:text-foreground prose-li:my-0.5',
  'prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
  '[&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  'text-sm leading-6 text-foreground',
  '[&_b]:text-primary [&_b]:font-semibold [&_b]:bg-primary/5 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:rounded [&_b]:inline-flex [&_b]:items-center',
  '[&_br]:block [&_br]:h-3',
].join(' ');

export function ChatComponent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [adminUserId] = useState(() => getAdminUserId());
  const hasValidAdminUser = adminUserId > NO_ADMIN_USER_ID;
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'online' | 'all-chats'>('online');
  const [chatViewMode, setChatViewMode] = useState<'messages' | 'purchases'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [availability, setAvailability] = useState(true);
  const [notes, setNotes] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [pendingPinMessageId, setPendingPinMessageId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [isUserAtLatest, setIsUserAtLatest] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  const [isRefreshingOnlinePlayers, setIsRefreshingOnlinePlayers] = useState(false);
  const [apiOnlinePlayers, setApiOnlinePlayers] = useState<Player[]>([]);
  const [isLoadingApiOnlinePlayers, setIsLoadingApiOnlinePlayers] = useState(false);
  const hasFetchedOnlinePlayersRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const wasHistoryLoadingRef = useRef(false);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const { addToast } = useToast();

  // Fetch chat users list
  const { 
    users: activeChatsUsers, // Users with active chats (from WebSocket)
    allPlayers, // All players (from REST API)
    onlineUsers: onlinePlayers, 
    isLoading: isLoadingUsers, 
    isLoadingAllPlayers,
    error: usersError,
    fetchAllPlayers,
    updateChatLastMessage,
    markChatAsRead,
  } = useChatUsers({
    adminId: adminUserId,
    enabled: hasValidAdminUser,
  });

  // WebSocket connection for real-time chat
  const {
    messages: wsMessages,
    isConnected,
    isTyping: remoteTyping,
    isUserOnline,
    sendMessage: wsSendMessage,
    connectionError,
    purchaseHistory,
    fetchPurchaseHistory,
    isPurchaseHistoryLoading,
    loadOlderMessages,
    hasMoreHistory,
    isHistoryLoading: isHistoryLoadingMessages,
    updateMessagePinnedState,
  } = useChatWebSocket({
    userId: selectedPlayer?.user_id ?? null,
    chatId: selectedPlayer?.id ?? null, // id field contains chat_id
    adminId: adminUserId,
    enabled: !!selectedPlayer && hasValidAdminUser,
    onMessageReceived: useCallback((message: Message) => {
      !IS_PROD && console.log('🔔 onMessageReceived callback fired:', {
        messageText: message.text,
        messageTime: message.time,
        selectedPlayer: selectedPlayer?.username,
        userId: selectedPlayer?.user_id,
        chatId: selectedPlayer?.id,
      });
      
      // Update the chat list when a new message is received
      if (selectedPlayer?.user_id && selectedPlayer?.id) {
        !IS_PROD && console.log('✅ Updating chat list with new message');
        updateChatLastMessage(
          selectedPlayer.user_id,
          selectedPlayer.id,
          message.text,
          message.time || message.timestamp
        );
      } else {
        !IS_PROD && console.warn('⚠️ Cannot update chat list - selectedPlayer missing:', {
          hasUserId: !!selectedPlayer?.user_id,
          hasId: !!selectedPlayer?.id,
        });
      }
    }, [selectedPlayer, updateChatLastMessage]),
  });

  const groupedMessages = useMemo(() => groupMessagesByDate(wsMessages), [wsMessages]);

  const displayedPlayers = useMemo(() => {
    let players: Player[];
    
    if (activeTab === 'online') {
      // Use API online players as base, then merge/append WebSocket updates
      const seenUserIds = new Map<number, Player>();
      
      // First, add API online players (base list)
      apiOnlinePlayers.forEach((player) => {
        if (player.user_id) {
          seenUserIds.set(player.user_id, player);
        }
      });
      
      // Then, append/update with WebSocket active chats (only if not already present)
      activeChatsUsers.forEach((player) => {
        if (player.user_id && player.isOnline) {
          // Update existing player with WebSocket data, or add new one
          const existing = seenUserIds.get(player.user_id);
          if (existing) {
            // Merge: keep API data but update with WebSocket chat info
            seenUserIds.set(player.user_id, {
              ...existing,
              lastMessage: player.lastMessage || existing.lastMessage,
              lastMessageTime: player.lastMessageTime || existing.lastMessageTime,
              unreadCount: player.unreadCount ?? existing.unreadCount ?? 0,
            });
          } else {
            // Append new player from WebSocket
            seenUserIds.set(player.user_id, player);
          }
        }
      });
      
      players = Array.from(seenUserIds.values());
    } else {
      // For "all-chats" tab: combine activeChatsUsers and allPlayers
      // Active chats are prioritized, then add any players not in active chats
      const seenUserIds = new Set<number>();
      const combinedPlayers: Player[] = [];
      
      // First, add active chats (prioritized)
      activeChatsUsers.forEach((player) => {
        if (player.user_id && !seenUserIds.has(player.user_id)) {
          seenUserIds.add(player.user_id);
          combinedPlayers.push(player);
        }
      });
      
      // Then, add players from allPlayers that aren't in active chats
      allPlayers.forEach((player) => {
        if (player.user_id && !seenUserIds.has(player.user_id)) {
          seenUserIds.add(player.user_id);
          combinedPlayers.push(player);
        }
      });
      
      players = combinedPlayers;
    }
    
    if (!searchQuery.trim()) {
      return players;
    }

    const query = searchQuery.toLowerCase();
    return players.filter((player) => {
      const username = player.username.toLowerCase();
      const email = player.email.toLowerCase();
      return username.includes(query) || email.includes(query);
    });
  }, [activeTab, apiOnlinePlayers, activeChatsUsers, allPlayers, searchQuery]);

  // Determine which loading state to show based on active tab
  const isCurrentTabLoading = useMemo(() => {
    if (activeTab === 'online') {
      const isLoading = isLoadingApiOnlinePlayers || isRefreshingOnlinePlayers;
      !IS_PROD && console.log('🔍 Online tab loading state:', {
        isLoadingApiOnlinePlayers,
        isRefreshingOnlinePlayers,
        computed: isLoading,
      });
      return isLoading;
    }

    // For "all-chats" tab, we need both activeChatsUsers and allPlayers
    // Show loading if either is loading (but prioritize activeChatsUsers loading)
    const isLoading = isLoadingUsers || (allPlayers.length === 0 && isLoadingAllPlayers);
    !IS_PROD && console.log('🔍 All Chats tab loading state:', {
      isLoadingUsers,
      isLoadingAllPlayers,
      allPlayersLength: allPlayers.length,
      computed: isLoading,
    });
    return isLoading;
  }, [activeTab, isLoadingUsers, isLoadingAllPlayers, allPlayers.length]);

  useEffect(() => {
    // Load all players for "all-chats" tab only
    // "all-chats" needs all players to show everyone, not just those with active chats
    const shouldLoadAllPlayers = activeTab === 'all-chats';
    const hasPlayersCached = allPlayers.length > 0;

    if (!shouldLoadAllPlayers || hasPlayersCached) {
      return;
    }

    !IS_PROD && console.log('🔄 Loading players for tab:', activeTab);
    fetchAllPlayers();
  }, [activeTab, allPlayers.length, fetchAllPlayers]);

  // Fetch purchase history when switching to 'purchases' view
  useEffect(() => {
    if (chatViewMode === 'purchases' && selectedPlayer) {
      fetchPurchaseHistory();
    }
  }, [chatViewMode, selectedPlayer, fetchPurchaseHistory]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedPlayer) return;
    
    const messageText = messageInput.trim();
    
    // Send message via WebSocket
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
  }, [messageInput, selectedPlayer, wsSendMessage, updateChatLastMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTo({ top: container.scrollHeight, behavior });
    setIsUserAtLatest(true);
    setAutoScrollEnabled(true);
    setUnseenMessageCount(0);
  }, []);

  const evaluateScrollPosition = useCallback(() => {
    if (chatViewMode !== 'messages') {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;

    setIsUserAtLatest(isAtBottom);
    setAutoScrollEnabled(isAtBottom);
    if (isAtBottom) {
      setUnseenMessageCount(0);
    }
  }, [chatViewMode]);

  const handlePlayerSelect = useCallback((player: Player, options?: { markAsRead?: boolean }) => {
    const { markAsRead } = options ?? {};
    const shouldMarkAsRead = markAsRead ?? DEFAULT_MARK_AS_READ;

    if (shouldMarkAsRead) {
      markChatAsRead({
        chatId: player.id,
        userId: player.user_id,
      });
    }

    setSelectedPlayer(player);
    setMessageMenuOpen(null);
    setPendingPinMessageId(null);
    setMobileView('chat');
    setAutoScrollEnabled(true);
    setIsUserAtLatest(true);
    latestMessageIdRef.current = null;
    setUnseenMessageCount(0);
  }, [markChatAsRead]);

  const handleNavigateToPlayer = useCallback(() => {
    if (selectedPlayer?.user_id) {
      router.push(`/dashboard/players?highlight=${selectedPlayer.user_id}`);
    }
  }, [selectedPlayer, router]);

  useEffect(() => {
    if (!selectedPlayer) {
      setPendingPinMessageId(null);
    }
  }, [selectedPlayer]);

  useEffect(() => {
    if (!messageMenuOpen) {
      return;
    }

    const handleOutsideClick = (event: MouseEvent) => {
      if (!messageMenuRef.current) {
        return;
      }

      if (messageMenuRef.current.contains(event.target as Node)) {
        return;
      }

      setMessageMenuOpen(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [messageMenuOpen]);

  // Transform API response to Player format
  const transformApiPlayerToUser = useCallback((player: any): Player => {
    return {
      id: String(player.id || ''),
      user_id: Number(player.id || 0),
      username: player.username || player.full_name || 'Unknown',
      fullName: player.full_name || player.name || undefined,
      email: player.email || '',
      avatar: player.profile_pic || player.profile_image || player.avatar || undefined,
      isOnline: player.is_online !== undefined ? player.is_online : true, // Online players from API are online
      lastMessage: undefined,
      lastMessageTime: undefined,
      balance: player.balance !== undefined ? String(player.balance) : undefined,
      winningBalance: player.winning_balance ? String(player.winning_balance) : undefined,
      gamesPlayed: player.games_played || undefined,
      winRate: player.win_rate || undefined,
      phone: player.phone_number || player.mobile_number || undefined,
      unreadCount: 0,
    };
  }, []);

  // Fetch online players from API endpoint
  const fetchOnlinePlayers = useCallback(async () => {
    if (!hasValidAdminUser) {
      return;
    }

    setIsLoadingApiOnlinePlayers(true);
    try {
      const token = storage.get(TOKEN_KEY);
      const response = await fetch('/api/chat-online-players', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ Failed to fetch online players:', errorData.message);
        hasFetchedOnlinePlayersRef.current = true; // Mark as fetched even on error to prevent retry loop
        return;
      }

      const data = await response.json();
      !IS_PROD && console.log('✅ Fetched online players from API:', data);

      // Transform API response to Player format
      // Handle different response formats
      let players: any[] = [];
      if (Array.isArray(data)) {
        players = data;
      } else if (data.players && Array.isArray(data.players)) {
        players = data.players;
      } else if (data.results && Array.isArray(data.results)) {
        players = data.results;
      } else if (data.online_players && Array.isArray(data.online_players)) {
        players = data.online_players;
      } else if (data.player && Array.isArray(data.player)) {
        // Handle the format: {"chats":[],"player":[]}
        players = data.player;
      }

      const transformedPlayers = players.map(transformApiPlayerToUser);
      setApiOnlinePlayers(transformedPlayers);
      hasFetchedOnlinePlayersRef.current = true; // Mark as fetched (even if empty)
      !IS_PROD && console.log(`✅ Set ${transformedPlayers.length} online players from API`);
    } catch (error) {
      console.error('❌ Error fetching online players:', error);
      hasFetchedOnlinePlayersRef.current = true; // Mark as fetched even on error to prevent retry loop
    } finally {
      setIsLoadingApiOnlinePlayers(false);
    }
  }, [hasValidAdminUser, transformApiPlayerToUser]);

  const handleRefreshOnlinePlayers = useCallback(async () => {
    if (!hasValidAdminUser || isRefreshingOnlinePlayers) {
      return;
    }

    setIsRefreshingOnlinePlayers(true);
    // Reset the ref to allow refresh
    hasFetchedOnlinePlayersRef.current = false;
    try {
      await fetchOnlinePlayers();
    } catch (error) {
      console.error('❌ Error refreshing online players:', error);
    } finally {
      setIsRefreshingOnlinePlayers(false);
    }
  }, [hasValidAdminUser, isRefreshingOnlinePlayers, fetchOnlinePlayers]);

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
        throw new Error(errorMessage);
      }

      const pinnedState = Boolean(result?.is_pinned ?? action === 'pin');
      updateMessagePinnedState(messageId, pinnedState);
      setMessageMenuOpen(null);

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

  // Fetch online players when switching to "online" tab or on mount
  useEffect(() => {
    if (
      activeTab === 'online' &&
      hasValidAdminUser &&
      !hasFetchedOnlinePlayersRef.current &&
      !isLoadingApiOnlinePlayers
    ) {
      !IS_PROD && console.log('🔄 Loading online players for online tab');
      fetchOnlinePlayers();
    }
  }, [activeTab, hasValidAdminUser, isLoadingApiOnlinePlayers, fetchOnlinePlayers]);

  const maybeLoadOlderMessages = useCallback(async () => {
    if (chatViewMode !== 'messages') return;
    if (!selectedPlayer) return;

    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop > LOAD_MORE_SCROLL_THRESHOLD) return;
    if (isHistoryLoadingMessages) return;
    if (!hasMoreHistory) return;

    const previousScrollTop = container.scrollTop;
    const previousScrollHeight = container.scrollHeight;

    try {
      const result = await loadOlderMessages();

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) {
          return;
        }

        if (result.added > 0) {
          const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
          updatedContainer.scrollTop = previousScrollTop + heightDelta;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
    }
  }, [chatViewMode, hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, selectedPlayer]);

  const handleScroll = useCallback(() => {
    evaluateScrollPosition();
    void maybeLoadOlderMessages();
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

  const queryPlayerId = searchParams.get('playerId');
  const queryUsername = searchParams.get('username');

  useEffect(() => {
    if (!queryPlayerId && !queryUsername) {
      return;
    }

    // When a player is selected via query params, ensure we have all players loaded
    // and switch to "all-chats" tab so the player appears in the list
    if (allPlayers.length === 0 && !isLoadingAllPlayers) {
      void fetchAllPlayers();
    }
    
    // Switch to "all-chats" tab when query params are present
    // This ensures the selected player is visible in the first column
    setActiveTab('all-chats');
  }, [queryPlayerId, queryUsername, allPlayers.length, isLoadingAllPlayers, fetchAllPlayers]);

  useEffect(() => {
    if (!queryPlayerId && !queryUsername) {
      return;
    }

    const rawUserId = queryPlayerId ? Number(queryPlayerId) : NaN;
    const targetUserId = Number.isFinite(rawUserId) ? rawUserId : null;
    const normalizedUsername = queryUsername?.trim().toLowerCase();

    const candidate = [...activeChatsUsers, ...allPlayers].find((player) => {
      const matchesId = targetUserId !== null && player.user_id === targetUserId;
      const matchesUsername = normalizedUsername ? player.username.toLowerCase() === normalizedUsername : false;
      return matchesId || matchesUsername;
    });

    if (candidate && (!selectedPlayer || selectedPlayer.user_id !== candidate.user_id)) {
      // Switch to "all-chats" tab when a player is selected via query params
      // This ensures the player appears in the first column
      setActiveTab('all-chats');
      handlePlayerSelect(candidate);
    }
  }, [
    queryPlayerId,
    queryUsername,
    activeChatsUsers,
    allPlayers,
    selectedPlayer,
    handlePlayerSelect,
  ]);

  // Auto-select first player if none selected
  useEffect(() => {
    if (!selectedPlayer && activeChatsUsers.length > 0) {
      handlePlayerSelect(activeChatsUsers[0], { markAsRead: false });
    }
  }, [selectedPlayer, activeChatsUsers, handlePlayerSelect]);

  useEffect(() => {
    if (!selectedPlayer || chatViewMode !== 'messages') {
      return;
    }

    latestMessageIdRef.current = null;
    setAutoScrollEnabled(true);
    setIsUserAtLatest(true);

    wasHistoryLoadingRef.current = isHistoryLoadingMessages;
    setUnseenMessageCount(0);

    requestAnimationFrame(() => {
      scrollToLatest('auto');
    });
  }, [selectedPlayer, chatViewMode, scrollToLatest, isHistoryLoadingMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleContainerScroll = () => {
      handleScroll();
    };

    container.addEventListener('scroll', handleContainerScroll);

    requestAnimationFrame(() => {
      evaluateScrollPosition();
    });

    return () => {
      container.removeEventListener('scroll', handleContainerScroll);
    };
  }, [handleScroll, evaluateScrollPosition, chatViewMode, selectedPlayer]);

  useEffect(() => {
    if (chatViewMode !== 'messages') {
      return;
    }

    const lastMessage = wsMessages[wsMessages.length - 1];
    if (!lastMessage) {
      latestMessageIdRef.current = null;
      setUnseenMessageCount(0);
      return;
    }

    const hasNewLatest = latestMessageIdRef.current !== lastMessage.id;
    latestMessageIdRef.current = lastMessage.id;

    if (!hasNewLatest) {
      return;
    }

    if (autoScrollEnabled) {
      setUnseenMessageCount(0);
      requestAnimationFrame(() => {
        scrollToLatest('smooth');
      });
    } else {
      setUnseenMessageCount((prev) => Math.min(prev + 1, 99));
    }
  }, [wsMessages, autoScrollEnabled, chatViewMode, scrollToLatest]);

  useEffect(() => {
    if (chatViewMode !== 'messages') {
      return;
    }

    const wasLoading = wasHistoryLoadingRef.current;
    wasHistoryLoadingRef.current = isHistoryLoadingMessages;

    if (wasLoading && !isHistoryLoadingMessages && autoScrollEnabled) {
      requestAnimationFrame(() => {
        scrollToLatest('auto');
      });
    }
  }, [isHistoryLoadingMessages, autoScrollEnabled, chatViewMode, scrollToLatest]);

  return (
    <div className="h-full flex gap-0 md:gap-4 bg-background">
      {/* Left Column - Player List */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-64 lg:w-80 flex-shrink-0 border-r border-border/50 bg-gradient-to-b from-card to-card/50 flex-col`}>
        {/* Availability Toggle */}
        <div className="p-4 md:p-5 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className={`w-4 h-4 transition-colors ${availability ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-foreground">Availability</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${availability ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                {availability ? 'Available' : 'Away'}
              </span>
              <button
                onClick={() => setAvailability(!availability)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 shadow-inner ${
                  availability ? 'bg-green-500' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                    availability ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 md:p-5 border-b border-border/50">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 rounded-xl bg-muted/50 dark:bg-muted/30 border-2 border-transparent focus:border-primary focus:bg-background transition-all shadow-sm"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-5 pt-2 pb-3 border-b border-border/50">
          <div className="flex gap-2 p-1 bg-muted/30 rounded-xl">
            <button
              onClick={() => setActiveTab('online')}
              className={`flex-1 px-2 md:px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'online'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${activeTab === 'online' ? 'bg-white' : 'bg-green-500'}`} />
                Online
              </div>
            </button>
            <button
              onClick={() => setActiveTab('all-chats')}
              className={`flex-1 px-2 md:px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'all-chats'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All Chats
            </button>
          </div>
        </div>

        {/* Player Count */}
        <div className="px-4 md:px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-sm font-bold text-green-600 dark:text-green-400">
                  {activeTab === 'online' ? displayedPlayers.length : onlinePlayers.length}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Online Players</p>
                <p className="text-[10px] text-muted-foreground">{activeChatsUsers.length} with chats</p>
              </div>
            </div>
            <button
              onClick={handleRefreshOnlinePlayers}
              disabled={isRefreshingOnlinePlayers}
              className="p-2 hover:bg-muted rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh online players"
              title="Refresh online players"
            >
              <svg
                className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ${
                  isRefreshingOnlinePlayers ? 'animate-spin' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const shouldShowSkeleton = isCurrentTabLoading && displayedPlayers.length === 0 && !usersError;
            !IS_PROD && console.log('💀 Should show skeleton?', shouldShowSkeleton, {
              isCurrentTabLoading,
              activeTab,
              displayedPlayersLength: displayedPlayers.length,
              usersError,
            });
            return shouldShowSkeleton;
          })() ? (
            <div className="p-2 space-y-2">
              {/* Skeleton loaders for player cards */}
              {[...Array(5)].map((_, index) => (
                <div key={index} className="w-full p-3 md:p-3.5 rounded-xl bg-muted/30 animate-pulse">
                  <div className="flex items-center gap-3">
                    {/* Avatar skeleton */}
                    <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-muted/60" />
                    
                    {/* Player info skeleton */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="h-4 w-24 bg-muted/60 rounded" />
                        <div className="h-3 w-12 bg-muted/60 rounded" />
                      </div>
                      <div className="h-3 w-32 bg-muted/60 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : usersError ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Chat Not Available</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {usersError.includes('Backend') || usersError.includes('404') 
                  ? 'Backend chat service is not ready yet. This feature will be available once the backend is deployed.'
                  : usersError
                }
              </p>
            </div>
          ) : displayedPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No players found</p>
              <p className="text-xs text-muted-foreground">Try a different search term</p>
            </div>
          ) : (
            <div className="p-2">
              {displayedPlayers.map((player) => {
                const isSelected = selectedPlayer?.user_id === player.user_id;
                const unreadCount = player.unreadCount ?? 0;
                const shouldDisplayUnreadBadge = !isSelected && unreadCount > 0;
                const unreadBadgeValue = unreadCount > MAX_UNREAD_BADGE_COUNT
                  ? `${MAX_UNREAD_BADGE_COUNT}+`
                  : String(unreadCount);
                return (
                <button
                  key={`${player.user_id}-${player.id}`}
                  onClick={() => handlePlayerSelect(player)}
                  className={`w-full p-3 md:p-3.5 rounded-xl mb-2 transition-all duration-200 group ${
                    isSelected
                      ? 'bg-primary/10 shadow-md ring-2 ring-primary/20' 
                      : 'hover:bg-muted/50 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background scale-105' 
                          : 'group-hover:scale-105'
                      }`}>
                        {player.avatar || player.username.charAt(0).toUpperCase()}
                      </div>
                      {player.isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background animate-pulse shadow-sm" />
                      )}
                    </div>
                    
                    {/* Player Info */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <h4 className="font-semibold text-sm text-foreground truncate">{player.username}</h4>
                        {player.lastMessageTime && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                            {player.lastMessageTime}
                          </span>
                        )}
                      </div>
                      {player.lastMessage && (
                        <p className="text-xs text-muted-foreground truncate leading-tight">
                          {stripHtml(player.lastMessage)}
                        </p>
                      )}
                      {player.isOnline && !player.lastMessage && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="w-1 h-1 bg-green-500 rounded-full" />
                          <span className="text-xs text-green-600 dark:text-green-400 font-medium">Active now</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Unread Badge */}
                    {shouldDisplayUnreadBadge && (
                      <div className="min-w-[20px] h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 px-1.5">
                        <span className="text-[10px] font-bold text-primary-foreground leading-none">
                          {unreadBadgeValue}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Middle Column - Chat Conversation */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-border bg-card w-full md:w-auto overflow-hidden`}>
        {selectedPlayer ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-card via-card/95 to-card backdrop-blur-sm sticky top-0 z-10 shadow-sm">
              {/* Back button for mobile */}
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors mr-1"
                aria-label="Back to list"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
              <button
                onClick={handleNavigateToPlayer}
                className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-sm md:text-base font-bold shadow-md ring-2 ring-primary/10 hover:ring-4 hover:ring-primary/20 transition-all cursor-pointer"
                title="View player profile"
              >
                {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
              </button>
                  {selectedPlayer.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleNavigateToPlayer}
                      className="font-semibold text-foreground text-sm md:text-base truncate hover:text-primary transition-colors cursor-pointer"
                      title="View player profile"
                    >
                      {selectedPlayer.username}
                    </button>
                    {isConnected ? (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Connected
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        Connecting...
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {connectionError ? `Error: ${connectionError}` : selectedPlayer.isOnline ? 'Active now' : `Last seen ${selectedPlayer.lastMessageTime || 'recently'}`}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1 flex-shrink-0">
                <button 
                  onClick={() => setMobileView('info')}
                  className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="View info"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button className="hidden md:flex p-2 hover:bg-muted rounded-lg transition-colors" aria-label="Search">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="hidden md:flex p-2 hover:bg-muted rounded-lg transition-colors" aria-label="More options">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="px-4 py-2 border-b border-border/50 bg-muted/20">
              <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
                <button
                  onClick={() => setChatViewMode('messages')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    chatViewMode === 'messages'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  💬 Messages
                </button>
                <button
                  onClick={() => setChatViewMode('purchases')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    chatViewMode === 'purchases'
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  💰 Purchases
                </button>
              </div>
            </div>

            {/* Messages / Purchase History */}
            <div 
              ref={messagesContainerRef}
              className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6 space-y-6 scroll-smooth bg-gradient-to-b from-background/50 to-background"
            >
              {/* Loading state for purchase history */}
              {chatViewMode === 'purchases' && isPurchaseHistoryLoading && (
                <div className="space-y-4">
                  {/* Skeleton loaders for purchase history */}
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex justify-start animate-pulse">
                      <div className="flex items-start gap-2 md:gap-3 w-full max-w-[85%] md:max-w-[75%] min-w-0">
                        {/* System Icon skeleton */}
                        <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-muted/60 flex-shrink-0" />
                        
                        {/* Purchase Message skeleton */}
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="bg-muted/40 rounded-2xl rounded-bl-sm px-4 py-3 space-y-2">
                            <div className="h-4 w-3/4 bg-muted/60 rounded" />
                            <div className="h-4 w-full bg-muted/60 rounded" />
                            <div className="h-4 w-1/2 bg-muted/60 rounded" />
                          </div>
                          <div className="flex items-center gap-2 px-2">
                            <div className="h-3 w-16 bg-muted/60 rounded" />
                            <div className="h-3 w-20 bg-muted/60 rounded" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state for purchases */}
              {chatViewMode === 'purchases' && !isPurchaseHistoryLoading && purchaseHistory.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">No purchase history available</p>
                  </div>
                </div>
              )}

              {/* Render messages or purchase history based on view mode */}
              {chatViewMode === 'messages' && isHistoryLoadingMessages && (
                <div className="flex justify-center py-3 text-muted-foreground">
                  <svg
                    className="h-5 w-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      d="M4 12a8 8 0 018-8"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              {chatViewMode === 'messages' && Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="space-y-3">
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-8 first:mt-0">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-border/50" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="px-4 py-1.5 bg-muted/80 backdrop-blur-sm text-xs font-medium text-muted-foreground rounded-full border border-border/50 shadow-sm">
                          {formatMessageDate(date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Messages for this date */}
                  {dateMessages.map((message, idx) => {
                    const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                    const showAvatar = message.sender === 'player' && (
                      !prevMessage || prevMessage.sender !== message.sender || 
                      (prevMessage.time && message.time && 
                       Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() - 
                                new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
                    );
                                const isConsecutive = prevMessage && prevMessage.sender === message.sender;
                    const isAdmin = message.sender === 'admin';
                    const messageHasHtml = hasHtmlContent(message.text);
                    const isPinning = pendingPinMessageId === message.id;
                    const pinButtonLabel = message.isPinned ? 'Unpin message' : 'Pin message';

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200 ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] min-w-0 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          {showAvatar ? (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20">
                              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-7 md:w-8 shrink-0" />
                          )}
                          
                          {/* Message Bubble */}
                          <div className="relative group flex flex-col min-w-0">
                            <div
                              className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md transition-all duration-200 ${
                                isAdmin
                                  ? 'bg-card border border-border/50 text-foreground shadow-black/5 dark:shadow-black/20'
                                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25'
                              } ${
                                isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
                              } ${message.isPinned ? 'ring-2 ring-amber-400/60' : ''}`}
                            >
                              {/* File indicator badge with download link */}
                              {message.isFile && (
                                <div className={`flex items-center justify-between gap-2 mb-2 pb-2 border-b ${
                                  isAdmin ? 'border-border/50' : 'border-white/20'
                                }`}>
                                  <div className="flex items-center gap-1.5">
                                    <svg className={`w-4 h-4 ${isAdmin ? 'text-primary' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <span className={`text-xs font-medium ${isAdmin ? 'text-muted-foreground' : 'text-white/90'}`}>
                                      File attachment{message.fileExtension && ` (.${message.fileExtension})`}
                                    </span>
                                  </div>
                                  {message.fileUrl && (
                                    <a
                                      href={message.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`text-xs font-medium hover:underline flex items-center gap-1 ${
                                        isAdmin ? 'text-primary hover:text-primary/80' : 'text-white hover:text-white/80'
                                      }`}
                                    >
                                      Download
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </a>
                                  )}
                                </div>
                              )}
                              
                              {/* Comment badge */}
                              {message.isComment && (
                                <div className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${
                                  isAdmin ? 'border-border/50' : 'border-white/20'
                                }`}>
                                  <svg className={`w-4 h-4 ${isAdmin ? 'text-amber-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                  </svg>
                                  <span className={`text-xs font-medium ${isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-white/90'}`}>
                                    Comment
                                  </span>
                                </div>
                              )}
                              
                              {messageHasHtml ? (
                                <div
                                  className={MESSAGE_HTML_CONTENT_CLASS[isAdmin ? 'admin' : 'player']}
                                  dangerouslySetInnerHTML={{ __html: message.text ?? '' }}
                                />
                              ) : (
                                <p
                                  className={`text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                    isAdmin ? 'text-foreground' : 'text-white'
                                  }`}
                                >
                                  {message.text}
                                </p>
                              )}
                              
                              {/* User balance indicator (only for player messages) */}
                              {!isAdmin && message.userBalance !== undefined && (
                                <div className="mt-2 pt-2 border-t border-white/20">
                                  <div className="flex items-center gap-1.5">
                                    <svg className="w-3.5 h-3.5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="text-xs text-white/90 font-medium">
                                      Balance: {formatCurrency(parseFloat(message.userBalance))}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Message Meta */}
                            <div className={`flex items-center gap-1.5 mt-1 px-1 ${
                              isAdmin ? 'justify-end' : 'justify-start'
                            }`}>
                              <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                                {message.time || message.timestamp}
                              </span>
                              {message.isPinned && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
                                  </svg>
                                  Pinned
                                </span>
                              )}
                              {isAdmin && (
                                <svg 
                                  className={`w-3.5 h-3.5 ${
                                    message.isRead 
                                      ? 'text-blue-500 dark:text-blue-400' 
                                      : 'text-muted-foreground/50'
                                  }`} 
                                  fill="currentColor" 
                                  viewBox="0 0 20 20"
                                >
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 8.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                            
                            {/* Options Button (Desktop) */}
                            {isAdmin && (
                              <button
                                onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                                className="hidden md:flex absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg"
                                aria-label="Message options"
                              >
                                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            )}
                            {isAdmin && messageMenuOpen === message.id && (
                              <div
                                ref={messageMenuRef}
                                className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur"
                              >
                                <button
                                  type="button"
                                  onClick={() => handleTogglePin(message.id, Boolean(message.isPinned))}
                                  disabled={isPinning}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isPinning ? (
                                    <svg
                                      className="h-4 w-4 animate-spin text-primary"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        strokeWidth="4"
                                      />
                                      <path
                                        className="opacity-75"
                                        d="M4 12a8 8 0 018-8"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                      />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                      <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
                                    </svg>
                                  )}
                                  <span>{pinButtonLabel}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Render purchase history */}
              {chatViewMode === 'purchases' && !isPurchaseHistoryLoading && purchaseHistory.length > 0 && 
                purchaseHistory.map((purchase) => (
                  <div key={purchase.id} className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex items-start gap-2 md:gap-3 w-full max-w-[85%] md:max-w-[75%] min-w-0">
                      {/* System Icon */}
                      <div className="w-7 md:w-8 h-7 md:h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                        </svg>
                      </div>
                      
                      {/* Purchase Message */}
                      <div className="flex flex-col gap-1 flex-1">
                        <div className="bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-border/50">
                          <div
                            className={PURCHASE_HTML_CONTENT_CLASS}
                            dangerouslySetInnerHTML={{ __html: purchase.text }}
                          />
                        </div>
                        <div className="flex items-center gap-2 px-2">
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {purchase.time || new Date(purchase.timestamp).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60">•</span>
                          <span className="text-[10px] text-muted-foreground/60">
                            {new Date(purchase.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {purchase.type && (
                            <>
                              <span className="text-[10px] text-muted-foreground/60">•</span>
                              <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                                {purchase.type}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              }

              {chatViewMode === 'messages' && !isUserAtLatest && (
                <div className="pointer-events-none sticky bottom-12 sm:bottom-16 z-20 flex justify-end pr-0">
                  <div className="pointer-events-auto -mr-3 sm:-mr-8">
                    <button
                      type="button"
                      onClick={() => scrollToLatest()}
                      aria-label="Jump to latest messages"
                      className="group relative flex w-12 flex-col items-center gap-3 rounded-full border border-border/40 bg-background/95 px-0 py-5 text-primary shadow-xl backdrop-blur-md transition-transform duration-200 hover:-translate-x-0.5 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <span className="absolute right-full mr-3 hidden translate-x-2 items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg opacity-0 transition-all duration-200 group-hover:flex group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:flex group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Jump to latest
                        {unseenMessageCount > 0 && (
                          <span className="rounded-full bg-primary-foreground/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
                            {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
                          </span>
                        )}
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                      </span>
                      {unseenMessageCount > 0 && (
                        <span className="flex flex-col items-center gap-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-primary">
                          <span className="rounded-full bg-primary text-primary-foreground px-2 py-1">
                            {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
                          </span>
                          <span className="text-[0.55rem] tracking-[0.4em] text-primary/80">
                            behind
                          </span>
                        </span>
                      )}
                      <span
                        className="font-semibold uppercase tracking-[0.35em] text-[0.68rem] text-primary transition-all duration-200 group-hover:opacity-0 group-hover:delay-75"
                        style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                      >
                        Latest
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-transform duration-300 group-hover:translate-y-1 group-active:translate-y-1.5">
                        <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Typing Indicator */}
              {chatViewMode === 'messages' && remoteTyping && (
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 md:w-8 shrink-0" />
                    <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-border/50">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            </div>

            {/* Message Input - Only show in messages view */}
            {chatViewMode === 'messages' && (
            <div className="px-4 py-3 md:px-6 md:py-4 border-t border-border/50 bg-gradient-to-t from-card via-card/95 to-card/90 backdrop-blur-sm sticky bottom-0 shadow-lg">
              {/* Toolbar - Desktop Only */}
              <div className="hidden lg:flex items-center gap-1 mb-2 pb-2 border-b border-border/30">
                <button 
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Attach file"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button 
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Attach image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>
                <button 
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                  title="Emoji"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 bg-muted/50 rounded border border-border/50 text-[10px]">Shift + Enter</kbd>
                  <span className="text-[10px]">for new line</span>
                </div>
              </div>

              {/* Input Area - Creative: Send button inside textarea */}
              <div className="flex items-start gap-2 md:gap-2.5">
                {/* Mobile: Show attach button */}
                <button 
                  className="md:hidden p-2.5 mt-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95 flex-shrink-0"
                  title="Attach"
                  aria-label="Attach file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                {/* Textarea Container with Embedded Send Button */}
                <div className="flex-1 relative">
                  <textarea
                    placeholder="Type your message... (Shift+Enter for new line)"
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      // Auto-resize - responsive max height
                      e.target.style.height = 'auto';
                      const maxHeight = window.innerWidth >= 768 ? 300 : 200;
                      e.target.style.height = Math.min(e.target.scrollHeight, maxHeight) + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    rows={1}
                    className="w-full min-h-[80px] md:min-h-[140px] lg:min-h-[160px] max-h-[200px] md:max-h-[300px] rounded-2xl bg-background/80 dark:bg-background border-2 border-border/50 focus:border-primary transition-all text-sm md:text-base lg:text-lg py-3 md:py-4 lg:py-5 px-4 md:px-5 lg:px-6 pr-16 md:pr-20 pb-14 md:pb-16 shadow-md resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 text-foreground leading-relaxed"
                  />
                  
                  {/* Action Bar - Inside Textarea at Bottom */}
                  <div className="absolute bottom-2 md:bottom-3 left-3 right-3 md:left-4 md:right-4 flex items-center justify-between gap-2">
                    {/* Left: Quick Actions */}
                    <div className="flex items-center gap-1">
                      <button 
                        className="p-1.5 md:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95"
                        title="Attach file"
                        aria-label="Attach file"
                      >
                        <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                      </button>
                      <button 
                        className="p-1.5 md:p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-95"
                        title="Emoji"
                        aria-label="Add emoji"
                      >
                        <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>
                      {messageInput && (
                        <button
                          onClick={() => setMessageInput('')}
                          className="p-1.5 md:p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all active:scale-95"
                          aria-label="Clear message"
                        >
                          <svg className="w-4 h-4 md:w-4.5 md:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* Right: Send Button */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!messageInput.trim()}
                      className="rounded-xl px-4 md:px-5 lg:px-6 py-2 md:py-2.5 transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-md flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground font-semibold text-sm md:text-base"
                      aria-label="Send message"
                    >
                      <span className="hidden sm:inline">Send</span>
                      <svg className="w-4.5 h-4.5 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Mobile hint */}
              <div className="md:hidden mt-2 text-xs text-muted-foreground/60 text-center">
                Tap Send or Enter to send • Hold Shift for new line
              </div>
            </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-background/50 to-background">
            <div className="relative mb-6">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center ring-8 ring-primary/5">
                <svg className="w-12 h-12 md:w-14 md:h-14 text-primary/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-lg md:text-xl font-bold text-foreground mb-2">No Conversation Selected</h3>
            <p className="text-sm md:text-base text-muted-foreground max-w-sm mb-6">
              Choose a player from the list to start messaging and provide support
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>{displayedPlayers.filter(p => p.isOnline).length} players online</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Player Info */}
      {selectedPlayer && (
        <div className={`${mobileView === 'info' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-shrink-0 bg-gradient-to-b from-card to-card/50 flex-col border-l border-border/50`}>
          {/* Header with Player Avatar */}
          <div className="p-3 md:p-4 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
            {/* Back button for mobile */}
            <button
              onClick={() => setMobileView('chat')}
              className="md:hidden mb-3 p-2 hover:bg-muted rounded-lg transition-colors inline-flex items-center gap-2 text-muted-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to chat</span>
            </button>
            
            <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <button
                    onClick={handleNavigateToPlayer}
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-lg md:text-xl font-bold shadow-lg ring-2 ring-primary/20 hover:ring-4 hover:ring-primary/30 transition-all cursor-pointer"
                    title="View player profile"
                  >
                    {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                  </button>
                  {isConnected && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-lg" />
                  )}
                </div>
                <button
                  onClick={handleNavigateToPlayer}
                  className="text-base md:text-lg font-bold text-foreground mb-0.5 hover:text-primary transition-colors cursor-pointer"
                  title="View player profile"
                >
                  {selectedPlayer.fullName || selectedPlayer.username}
                </button>
                <p className="text-xs text-muted-foreground mb-0.5">@{selectedPlayer.username}</p>
                <p className="text-[10px] text-muted-foreground truncate max-w-full px-2">
                  {selectedPlayer.email || 'Email not available'}
                </p>
                {isConnected ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-medium">
                    <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-medium">
                    <span className="w-1 h-1 bg-amber-500 rounded-full" />
                    Connecting...
                  </span>
                )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3">
            {/* Financial Summary */}
            <div className="rounded-lg bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-foreground">Balance</h4>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-2 bg-background/50 rounded-md">
                  <span className="text-xs text-muted-foreground">Total Balance</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(selectedPlayer.balance || '0')}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-md border border-yellow-500/20">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs text-foreground font-medium">Winnings</span>
                  </div>
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-500">{formatCurrency(selectedPlayer.winningBalance || '0')}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" className="w-full shadow-md hover:shadow-lg transition-shadow text-xs py-2">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Edit Balance
              </Button>
              <Button variant="secondary" className="w-full hover:bg-muted/50 text-xs py-2">
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Info
              </Button>
            </div>

            {/* Activity Sections */}
            <div className="rounded-lg bg-card border border-border p-3 space-y-1.5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-foreground">Activity</h4>
              </div>
              {[
                { name: 'Purchases', count: 0, icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                { name: 'Cashouts', count: 0, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                { name: 'Game Activities', count: 0, icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
                { name: 'Games', count: 0, icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' }
              ].map((section, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center justify-between p-2 hover:bg-muted/50 rounded-md transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-medium text-foreground">{section.name}</p>
                      <p className="text-[10px] text-muted-foreground">{section.count} items</p>
                    </div>
                  </div>
                  <svg className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Add Game Button */}
            <Button variant="primary" className="w-full shadow-md hover:shadow-lg transition-shadow text-xs py-2">
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Game
            </Button>

            {/* Notes Section */}
            <div className="rounded-lg bg-card border border-border p-3 space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-sm text-foreground">Notes</h4>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this player..."
                className="w-full min-h-[80px] p-2.5 border border-border rounded-md bg-background dark:bg-background text-foreground text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" className="w-full text-xs py-2">
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </Button>
                <Button variant="secondary" className="w-full text-xs py-2" onClick={() => setNotes('')}>
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

