'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowBigDown, ArrowDown, ArrowDownFromLine, ArrowDownNarrowWide, ArrowDownToLine, ChevronDown } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, useToast, Skeleton } from '@/components/ui';
import { formatCurrency, isValidTimestamp } from '@/lib/utils/formatters';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { useOnlinePlayers } from '@/hooks/use-online-players';
import { usePlayerGames } from '@/hooks/use-player-games';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser, ChatMessage } from '@/types';
import { EditProfileDrawer, EditBalanceDrawer, NotesDrawer, ExpandedImageModal } from './modals';
import { PlayerListSidebar, ChatHeader, PlayerInfoSidebar, EmptyState, PinnedMessagesSection, MessageInputArea } from './sections';
import { MessageBubble } from './components/message-bubble';
import { isAutoMessage } from './utils/message-helpers';
import { useScrollManagement } from './hooks/use-scroll-management';
import { useViewportMessages } from './hooks/use-viewport-messages';

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

const MAX_UNREAD_BADGE_COUNT = 99;
const DEFAULT_MARK_AS_READ = true;

const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

const hasHtmlContent = (value: string | null | undefined): boolean => {
  if (!value) {
    return false;
  }
  return HTML_TAG_REGEX.test(value);
};

// Check if a URL points to an image
const isImageUrl = (url: string): boolean => {
  if (!url) return false;
  const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico|heic|heif)(\?.*)?$/i;
  return imageExtensions.test(url);
};

// Convert plain text URLs to clickable links
const linkifyText = (text: string): string => {
  if (!text) return text;
  
  // Regex to match URLs (http, https, or www)
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  
  return text.replace(urlRegex, (url) => {
    // Ensure URL has protocol
    const href = url.startsWith('http') ? url : `https://${url}`;
    // Open in new tab for security
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

// Extract image URLs from text
const extractImageUrls = (text: string): string[] => {
  if (!text) return [];
  // Updated regex to handle URLs with spaces and query parameters
  // Matches URLs until the image extension, including any query params after it
  const urlRegex = /(https?:\/\/\S+?\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico|heic|heif)(?:\?[^\s<>"]*)?)/gi;
  const matches = text.match(urlRegex);
  if (!matches) return [];
  
  // Also try to extract URLs that might have spaces (edge case for malformed URLs)
  // This catches URLs like "https://example.com/Screenshot 2025-11-10 at 12.11.34 PM.png"
  const spaceUrlRegex = /(https?:\/\/[^\s<>"]*(?:\s+[^\s<>"]+)*\.(jpg|jpeg|png|gif|bmp|webp|svg|tiff|ico|heic|heif)(?:[^\s<>"]*)?)/gi;
  const spaceMatches = text.match(spaceUrlRegex) || [];
  
  // Combine both matches and deduplicate
  const allMatches = [...new Set([...matches, ...spaceMatches])];
  return allMatches;
};

const MESSAGE_HTML_CONTENT_CLASS = {
  admin: [
    'text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap',
    'text-foreground',
    '[&_b]:text-primary [&_b]:font-semibold [&_b]:bg-primary/5 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:rounded [&_b]:inline-flex [&_b]:items-center',
    '[&_strong]:text-primary [&_strong]:font-semibold',
    '[&_em]:text-muted-foreground',
    '[&_br]:block [&_br]:h-2',
    '[&_a]:text-primary [&_a]:underline [&_a]:cursor-pointer hover:[&_a]:text-primary/80',
  ].join(' '),
  player: [
    'text-[13px] md:text-sm leading-relaxed break-words whitespace-pre-wrap',
    'text-white',
    '[&_b]:text-white [&_b]:font-semibold [&_b]:bg-white/10 [&_b]:px-1.5 [&_b]:py-0.5 [&_b]:rounded [&_b]:inline-flex [&_b]:items-center',
    '[&_strong]:text-white [&_strong]:font-semibold',
    '[&_em]:text-white/80',
    '[&_br]:block [&_br]:h-2',
    '[&_a]:text-blue-300 [&_a]:underline [&_a]:cursor-pointer hover:[&_a]:text-blue-200',
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
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [availability, setAvailability] = useState(true);
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
  const [balanceType, setBalanceType] = useState<'main' | 'winning'>('main');
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
  const { addToast } = useToast();
  const { games: playerGames, isLoading: isLoadingPlayerGames } = usePlayerGames(selectedPlayer?.user_id || null);

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

  // Fetch chat users list
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
    refreshActiveChats,
    updateChatLastMessage,
    markChatAsRead,
    markChatAsReadDebounced,
  } = useChatUsers({
    adminId: adminUserId,
    enabled: hasValidAdminUser,
  });

  // ✨ OPTIMIZED: Fetch online players using hybrid REST + WebSocket approach
  const {
    onlinePlayers: apiOnlinePlayers,
    isLoading: isLoadingApiOnlinePlayers,
    error: onlinePlayersError,
    refetch: refetchOnlinePlayers,
    isConnected: isOnlinePlayersWSConnected,
  } = useOnlinePlayers({
    adminId: adminUserId,
    enabled: hasValidAdminUser, // Keep always enabled to preserve data and timestamps
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
    markAllAsRead,
    refreshMessages,
    notes,
  } = useChatWebSocket({
    userId: selectedPlayer?.user_id ?? null,
    chatId: selectedPlayer?.id ?? null, // id field contains chat_id
    adminId: adminUserId,
    enabled: !!selectedPlayer && hasValidAdminUser,
    onMessageReceived: useCallback(async (message: Message) => {
      !IS_PROD && console.log('🔔 onMessageReceived callback fired:', {
        messageText: message.text,
        messageTime: message.time,
        selectedPlayer: selectedPlayer?.username,
        userId: selectedPlayer?.user_id,
        chatId: selectedPlayer?.id,
      });
      
      // Refresh chat list from backend API when a new message is received
      // This ensures we get the latest unread counts and last messages from the server
      !IS_PROD && console.log('🔄 Refreshing chat list from backend after message...');
      await refreshActiveChats();
      !IS_PROD && console.log(' Chat list refreshed with latest backend data');
    }, [selectedPlayer, refreshActiveChats]),
  });

  // Use scroll management hook
  const {
    isUserAtBottom,
    scrollToBottom,
    handleScroll,
  } = useScrollManagement({
    messagesContainerRef,
    isHistoryLoadingMessages,
    hasMoreHistory,
    loadOlderMessages,
    selectedPlayerId: selectedPlayer?.user_id ?? null,
    addToast,
  });

  //  TEMPORARY FIX: Disable viewport rendering to test core functionality
  //  VIEWPORT RENDERING: Only show messages that fill viewport, reveal more as user scrolls
  // const {
  //   visibleMessages,
  //   topSpacerHeight,
  //   bottomSpacerHeight,
  // } = useViewportMessages({
  //   messages: wsMessages,
  //   messagesContainerRef,
  //   viewportBuffer: 10, // Show 10 extra messages above/below viewport
  // });

  //  TEMPORARY: Show all messages without viewport optimization
  const visibleMessages = wsMessages;
  const topSpacerHeight = 0;
  const bottomSpacerHeight = 0;

  const groupedMessages = useMemo(() => groupMessagesByDate(visibleMessages), [visibleMessages]);

  const displayedPlayers = useMemo(() => {
    !IS_PROD && console.log('🔄 [displayedPlayers] Memo recalculating...', {
      activeTab,
      apiOnlinePlayersCount: apiOnlinePlayers.length,
      activeChatsUsersCount: activeChatsUsers.length,
      allPlayersCount: allPlayers.length,
    });
    
    let players: Player[];
    
    if (activeTab === 'online') {
      // ✨ OPTIMIZED: Use hybrid REST + WebSocket online players
      // apiOnlinePlayers already combines REST API data with real-time WebSocket updates
      const seenUserIds = new Map<number, Player>();

      // DEBUG: Log initial data states
      !IS_PROD && console.log(`🔍 [Online Tab] Data sources - API: ${apiOnlinePlayers.length}, WebSocket: ${activeChatsUsers.length}`);

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
            !IS_PROD && console.log(`🔄 [Online Tab Merge] Merging timestamps for ${player.username}:`, {
              existingTime: existing.lastMessageTime,
              playerTime: player.lastMessageTime,
              validPlayerTime: isValidTimestamp(player.lastMessageTime),
              chosenTime: isValidTimestamp(player.lastMessageTime) ? player.lastMessageTime : existing.lastMessageTime,
            });

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
      !IS_PROD && console.log(`🔍 [All-Chats Tab] Data sources - WebSocket: ${activeChatsUsers.length}, API: ${allPlayers.length}`);

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
            !IS_PROD && console.log(`🔄 [All-Chats Tab Merge] Merging timestamps for ${player.username}:`, {
              existingTime: existing.lastMessageTime,
              playerTime: player.lastMessageTime,
              validExistingTime: isValidTimestamp(existing.lastMessageTime),
              chosenTime: isValidTimestamp(existing.lastMessageTime) ? existing.lastMessageTime : player.lastMessageTime,
            });

            //  FIXED: Prioritize WebSocket data (real-time) over REST API data (stale)
            // Start with WebSocket data, only add missing fields from REST API
            seenUserIds.set(player.user_id, {
              ...existing, // WebSocket data (real-time unreadCount, lastMessage, etc.)
              // Only override with REST API data for fields not in WebSocket
              fullName: player.fullName || existing.fullName,
              email: player.email || existing.email,
              avatar: player.avatar || existing.avatar,
              balance: player.balance || existing.balance,
              winningBalance: player.winningBalance || existing.winningBalance,
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
      // ✨ OPTIMIZED: Use the new hook's loading state
      const isLoading = isLoadingApiOnlinePlayers;
      !IS_PROD && console.log('🔍 Online tab loading state:', {
        isLoadingApiOnlinePlayers,
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
  }, [activeTab, isLoadingApiOnlinePlayers, isLoadingUsers, isLoadingAllPlayers, allPlayers.length]);

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
        !IS_PROD && console.log(' Image uploaded successfully:', result);
        
        // The backend should return the file URL in the format:
        // https://serverhub.biz/media/csr/chats/filename.jpeg
        const imageUrl = result.file_url || result.url || result.file;
        !IS_PROD && console.log('📷 Image URL:', imageUrl);
        
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

        // Refresh messages after sending
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          isRefreshingMessagesRef.current = true;
          refreshMessages().catch((error) => {
            !IS_PROD && console.warn('⚠️ Failed to refresh messages after sending image:', error);
          }).finally(() => {
            Promise.resolve().then(() => {
              scrollToBottom(true);
              isRefreshingMessagesRef.current = false;
            });
          });
        }, 250);
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

    // Refresh messages after sending
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    refreshTimeoutRef.current = setTimeout(() => {
      isRefreshingMessagesRef.current = true;
      refreshMessages().catch((error) => {
        !IS_PROD && console.warn('⚠️ Failed to refresh messages after sending:', error);
      }).finally(() => {
        Promise.resolve().then(() => {
          scrollToBottom(true);
          isRefreshingMessagesRef.current = false;
        });
      });
    }, 250);
  }, [messageInput, selectedImage, selectedPlayer, wsSendMessage, updateChatLastMessage, adminUserId, addToast, refreshMessages, scrollToBottom]);

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

  const handlePlayerSelect = useCallback((player: Player, options?: { markAsRead?: boolean }) => {
    const { markAsRead } = options ?? {};
    const shouldMarkAsRead = markAsRead ?? DEFAULT_MARK_AS_READ;

    // Check if we're selecting a different player
    const isPlayerChange = previousPlayerIdRef.current !== player.user_id;

    // Debug: Log player selection to verify IDs and notes
    !IS_PROD && console.log('👤 [Player Select]', {
      username: player.username,
      chatId: player.id,
      userId: player.user_id,
      tab: activeTab,
      notes: player.notes,
      hasNotes: !!player.notes,
      isPlayerChange,
      fullPlayer: player,
    });

    if (shouldMarkAsRead) {
      markChatAsReadDebounced({
        chatId: player.id,
        userId: player.user_id,
      });
    }

    setSelectedPlayer(player);
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
    }
  }, [markChatAsRead, activeTab]);

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
          !IS_PROD && console.log('🔄 Message not found, refreshing to get real IDs...');
          
          try {
            // Refresh messages to get real database IDs
            await refreshMessages();
            !IS_PROD && console.log(' Messages refreshed, retrying pin...');
            
            // Retry the pin operation with refreshed messages
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
  }, [selectedPlayer, pendingPinMessageId, addToast, updateMessagePinnedState, refreshMessages]);

  const handleNotesSaved = useCallback(async () => {
    // Refresh messages to get updated notes from backend
    await refreshMessages();
  }, [refreshMessages]);

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
    setBalanceType('main');
    setIsEditBalanceModalOpen(true);
  }, [selectedPlayer]);

  const handleUpdateBalance = useCallback(async (operation: 'increase' | 'decrease') => {
    if (!selectedPlayer || isUpdatingBalance || balanceValue <= 0) {
      if (balanceValue <= 0) {
        addToast({
          type: 'error',
          title: 'Invalid amount',
          description: 'Please enter a valid amount greater than 0.',
        });
      }
      return;
    }

    setIsUpdatingBalance(true);
    try {
      const { playersApi } = await import('@/lib/api/users');
      
      const response = await playersApi.manualPayment({
        player_id: selectedPlayer.user_id,
        value: balanceValue,
        type: operation,
        balanceType: balanceType,
      });

      addToast({
        type: 'success',
        title: `Balance ${operation === 'increase' ? 'increased' : 'decreased'} successfully`,
        description: `${balanceType === 'main' ? 'Main' : 'Winning'} balance updated to ${formatCurrency(
          balanceType === 'main' ? response.player_bal : response.player_winning_bal
        )}`,
      });
      
      setIsEditBalanceModalOpen(false);
      setBalanceValue(0);
      
      // Update the selected player balance
      setSelectedPlayer(prev => prev ? {
        ...prev,
        balance: String(response.player_bal),
        winningBalance: String(response.player_winning_bal),
      } : null);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to update balance',
        description,
      });
    } finally {
      setIsUpdatingBalance(false);
    }
  }, [selectedPlayer, balanceValue, balanceType, isUpdatingBalance, addToast]);

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

  // Mark all messages as read when WebSocket connects and chat is opened
  useEffect(() => {
    if (isConnected && selectedPlayer) {
      !IS_PROD && console.log('📬 WebSocket connected, marking all messages as read for player:', selectedPlayer.username);
      // Use a small delay to ensure the WebSocket is fully ready
      const timeoutId = setTimeout(() => {
        markAllAsRead();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, selectedPlayer, markAllAsRead]);

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

    //  FIXED: Use displayedPlayers which has notes properly merged
    // Search allPlayers first (has notes), then activeChatsUsers as fallback
    const candidate = [...allPlayers, ...activeChatsUsers].find((player) => {
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

  // Removed auto-selection of first player - users should manually select a player to chat with

  useEffect(() => {
    if (!selectedPlayer) {
      previousPlayerIdRef.current = null;
      return;
    }

    //  FIXED: Check if we're actually switching to a different player
    // If it's the same player (e.g., remounting after navigation), preserve scroll position
    const isActualPlayerChange = previousPlayerIdRef.current !== selectedPlayer.user_id;

    !IS_PROD && console.log('👤 Player change effect fired:', {
      currentPlayerId: selectedPlayer.user_id,
      previousPlayerId: previousPlayerIdRef.current,
      isActualPlayerChange,
    });

    previousPlayerIdRef.current = selectedPlayer.user_id;

    if (!isActualPlayerChange) {
      !IS_PROD && console.log('⏭️  Same player detected, preserving scroll position');
      return;
    }

    !IS_PROD && console.log('🔄 Player changed - resetting scroll state');

    //  CLEAN RESET: Reset scroll-related state for new player
    latestMessageIdRef.current = null;
    wasHistoryLoadingRef.current = false; // Reset to allow initial history load
    hasScrolledToInitialLoadRef.current = false; // Reset for new player

    !IS_PROD && console.log('🔄 Scroll state reset complete:', {
      hasScrolledToInitial: hasScrolledToInitialLoadRef.current,
      latestMessageId: latestMessageIdRef.current,
      currentMessagesCount: wsMessages.length,
    });
  }, [selectedPlayer, wsMessages.length]);

  useEffect(() => {
    const lastMessage = wsMessages[wsMessages.length - 1];
    if (!lastMessage) {
      latestMessageIdRef.current = null;
      return;
    }

    const hasNewLatest = latestMessageIdRef.current !== lastMessage.id;

    !IS_PROD && console.log('📝 wsMessages effect:', {
      hasNewLatest,
      hasScrolledToInitial: hasScrolledToInitialLoadRef.current,
      messagesLength: wsMessages.length,
      isHistoryLoading: isHistoryLoadingMessages,
      lastMessageId: lastMessage.id,
      isRefreshing: isRefreshingMessagesRef.current,
    });

    //  FIX: If we're refreshing, just update the ref without scrolling
    // The ID changed from temporary to real, but it's not a "new" message
    if (isRefreshingMessagesRef.current) {
      !IS_PROD && console.log('⏭️ Refreshing in progress, updating ID ref without scroll');
      latestMessageIdRef.current = lastMessage.id;
      return;
    }

    latestMessageIdRef.current = lastMessage.id;

    if (!hasNewLatest) {
      return;
    }

    //  TARGETED LATEST MESSAGE: Enhanced initial load logic
    // Only use aggressive approach for initial load, preserve natural behavior otherwise
    if (!hasScrolledToInitialLoadRef.current && wsMessages.length > 0) {
      !IS_PROD && console.log('📍 Initial load condition met - scrolling to latest message');
      hasScrolledToInitialLoadRef.current = true;

      //  CLEAN INITIAL SCROLL: Single force + instant scroll for initial load only
      scrollToBottom(true, true); // Force + instant initial scroll

      //  LIGHTWEIGHT VERIFICATION: Single verification for async content
      setTimeout(() => {
        if (!isRefreshingMessagesRef.current) {
          scrollToBottom(true, true); // One verification scroll
        }
      }, 100);

      return;
    }

    //  ENHANCED NEW MESSAGE HANDLING: More aggressive about showing new messages
    // Multiple conditions to ensure new messages are visible
    const shouldAutoScroll =
      !isRefreshingMessagesRef.current && (
        // Condition 1: User is at bottom (original logic)
        isUserAtBottom ||
        // Condition 2: Very close to bottom (more generous threshold)
        (messagesContainerRef.current && (() => {
          const container = messagesContainerRef.current;
          const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
          return distanceFromBottom <= 150; // More generous threshold
        })())
      );

    if (shouldAutoScroll) {
      !IS_PROD && console.log(' Auto-scrolling to new message (enhanced detection)', {
        isUserAtBottom,
        messagesLength: wsMessages.length,
      });

      // Clear new message indicator since we're scrolling to bottom
      setHasNewMessagesWhileScrolled(false);

      // Immediate scroll with multiple verifications
      scrollToBottom(true, true); // Force + instant for immediate visibility

      // Multiple verification attempts to ensure we reach bottom with new content
      setTimeout(() => scrollToBottom(true, true), 50);
      setTimeout(() => scrollToBottom(true, true), 150);
      setTimeout(() => scrollToBottom(true, true), 300);
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
      !IS_PROD && console.log('📍 History loading complete - scrolling to latest message');

      // Only scroll to latest if we haven't already scrolled for this conversation
      hasScrolledToInitialLoadRef.current = true;

      //  CLEAN HISTORY SCROLL: Single force scroll
      scrollToBottom(true, true); // Force + instant scroll

      //  LIGHTWEIGHT VERIFICATION: Single verification for async content
      setTimeout(() => {
        if (!isRefreshingMessagesRef.current) {
          scrollToBottom(true, true); // One verification scroll
        }
      }, 100);
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
    <div className="h-full flex gap-0 md:gap-4 bg-background">
      {/* Left Column - Player List */}
      <PlayerListSidebar
        mobileView={mobileView}
        availability={availability}
        setAvailability={setAvailability}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        displayedPlayers={displayedPlayers}
        selectedPlayer={selectedPlayer}
        onlinePlayersCount={onlinePlayers.length}
        activeChatsCount={activeChatsUsers.length}
        isCurrentTabLoading={isCurrentTabLoading}
        isLoadingApiOnlinePlayers={isLoadingApiOnlinePlayers}
        isLoadingMore={isLoadingMore}
        hasMorePlayers={hasMorePlayers}
        usersError={usersError}
        onPlayerSelect={handlePlayerSelect}
        onRefreshOnlinePlayers={handleRefreshOnlinePlayers}
        onLoadMore={loadMorePlayers}
      />

      {/* Middle Column - Chat Conversation */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 min-w-0 flex-col border-r border-border bg-card w-full md:w-auto overflow-hidden`}>
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
              onOpenNotesDrawer={() => setIsNotesDrawerOpen(true)}
            />

            {/* Pinned Messages Section */}
            <PinnedMessagesSection
              messages={wsMessages}
              isExpanded={isPinnedMessagesExpanded}
              onToggleExpanded={() => setIsPinnedMessagesExpanded(!isPinnedMessagesExpanded)}
              onTogglePin={handleTogglePin}
              pendingPinMessageId={pendingPinMessageId}
            />

            {/* Messages / Purchase History */}
            <div
              ref={messagesContainerRef}
              className="relative flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-background/50 to-background scroll-smooth-optimized scrollbar-smooth"
              style={{
                //  SMOOTH SCROLL: Optimized for buttery smooth scrolling
                // Hardware acceleration and optimal scroll performance handled by CSS classes
                scrollBehavior: 'auto', // Let the hook handle smooth scrolling
              }}
              onScroll={handleScroll}
            >
              {/*  SCROLLBAR RESET: Content wrapper for transform during scrollbar reset */}
              <div 
                className="px-4 py-4 md:px-6 md:py-6 space-y-6"
                style={{
                  // This wrapper allows us to apply transform during scrollbar reset
                  // without affecting the scroll container itself
                }}
              >

              {/* Loading indicator for message history */}
              {isHistoryLoadingMessages && (
                <div className="space-y-4 py-3">
                  {/* User message skeleton (right side) */}
                  <div className="flex items-start justify-end gap-3">
                    <div className="flex flex-col items-end max-w-[70%]">
                      <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                    <Skeleton variant="circular" className="h-8 w-8" />
                  </div>

                  {/* Admin message skeleton (left side) */}
                  <div className="flex items-start gap-3">
                    <Skeleton variant="circular" className="h-8 w-8" />
                    <div className="flex flex-col max-w-[70%]">
                      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 space-y-2">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                  </div>

                  {/* Another user message skeleton */}
                  <div className="flex items-start justify-end gap-3">
                    <div className="flex flex-col items-end max-w-[70%]">
                      <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5">
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-3 w-16 mt-1" />
                    </div>
                    <Skeleton variant="circular" className="h-8 w-8" />
                  </div>
                </div>
              )}
              {/* Empty state when no messages - only show after WebSocket has connected and loading is complete */}
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
            const isAuto = isAutoMessage(message);
            const showAvatar = !isAuto && message.sender === 'player' && (
              !prevMessage || prevMessage.sender !== message.sender || 
              (prevMessage.time && message.time && 
               Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() - 
                        new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
            );
            const isConsecutive = !isAuto && prevMessage && !isAutoMessage(prevMessage) && prevMessage.sender === message.sender;
            const isAdmin = !isAuto && message.sender === 'admin';
            const isPinning = pendingPinMessageId === message.id;
            
            //  ANIMATION: Check if this is a new message (not seen before)
            const isNewMessage = !displayedMessageIdsRef.current.has(message.id);
            if (isNewMessage) {
              displayedMessageIdsRef.current.add(message.id);
            }

            return (
              <div
                key={message.id}
                className={`${isNewMessage && hasScrolledToInitialLoadRef.current ?
                  'animate-slide-in-from-bottom-2 message-animation-optimized' :
                  'message-animation-optimized'
                }`}
                style={{
                  //  SMOOTH SCROLL: Enhanced hardware acceleration for ultra-smooth animations
                  willChange: isNewMessage && hasScrolledToInitialLoadRef.current ? 'transform, opacity' : 'auto',
                  backfaceVisibility: 'hidden',
                }}
              >
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
        <div className="pointer-events-none sticky bottom-12 sm:bottom-16 z-20 flex justify-end pr-0">
          <div className="pointer-events-auto mr-2 sm:mr-4 animate-bounce-in-smooth">
            <button
              type="button"
              onClick={() => {
                scrollToBottom(true); // Rule 6: Force scroll (bypasses cooldown)
                setHasNewMessagesWhileScrolled(false); // Clear indicator
              }}
              aria-label="Jump to latest messages"
              className={`group relative flex w-12 flex-col items-center gap-1.5 px-0 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-x-0.5 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/40 animate-scroll-indicator ${
                hasNewMessagesWhileScrolled
                  ? 'text-primary animate-new-message-pulse'
                  : 'text-slate-700 dark:text-slate-100'
              }`}
            >
              <span className="absolute right-full mr-3 hidden translate-x-2 items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg opacity-0 transition-all duration-200 group-hover:flex group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:flex group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Jump to latest
              </span>
                    <span className="relative inline-flex h-20 w-14 items-center justify-center translate-x-12">
              <span 
                className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-xl opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:blur-2xl"
                aria-hidden="true"
              />

              {/* Pulsing ring */}
              <span 
                className="absolute inset-0 rounded-full border-2 border-primary/30 opacity-0 transition-all duration-500 group-hover:opacity-100 animate-ping"
                aria-hidden="true"
              />

              {/* Main content container */}
              {/* <span 
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-secondary opacity-0 group-hover:opacity-100 group-hover:animate-spin transition-opacity"
                style={{ animationDuration: '3s' }}
                aria-hidden="true"
              /> */}

              {/* Main circle */}
              <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-background via-card to-muted/40 border border-border/80 group-hover:border-primary/50 transition-colors">
                {/* Stacked chevrons */}
                <span className="flex flex-col -space-y-2 -translate-x-4">
               
                  <ArrowDownNarrowWide
                    className="h-4 w-4 text-slate-50 opacity-80 transition-all group-hover:translate-y-0.5"
                    strokeWidth={2.5}
                  />
                </span>
              </span>
            </span>
        
        {/* Label appears below on hover */}
       




            </button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {remoteTyping && (
        <div
          className="flex justify-start animate-fade-in-smooth message-animation-optimized"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="flex items-end gap-2 max-w-[85%] md:max-w-[75%]">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20 message-animation-optimized">
              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md shadow-blue-500/25 message-animation-optimized">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-white/80 rounded-full typing-indicator-smooth"></div>
                <div className="w-2 h-2 bg-white/80 rounded-full typing-indicator-smooth"></div>
                <div className="w-2 h-2 bg-white/80 rounded-full typing-indicator-smooth"></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Message Input */}
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
  </>
) : (
  <EmptyState onlinePlayersCount={displayedPlayers.filter(p => p.isOnline).length} />
)}
</div>

{/* Right Column - Player Info */}
{selectedPlayer && (
            <PlayerInfoSidebar
              selectedPlayer={selectedPlayer}
              isConnected={isConnected}
              mobileView={mobileView}
              setMobileView={setMobileView}
              notes={notes}
              onNavigateToPlayer={handleNavigateToPlayer}
              onOpenEditBalance={handleOpenEditBalance}
              onOpenEditProfile={handleOpenEditProfile}
              onOpenNotesDrawer={() => setIsNotesDrawerOpen(true)}
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
  balanceValue={balanceValue}
  setBalanceValue={setBalanceValue}
  balanceType={balanceType}
  setBalanceType={setBalanceType}
  isUpdating={isUpdatingBalance}
  onUpdate={handleUpdateBalance}
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
