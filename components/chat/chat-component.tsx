'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button, Input, useToast } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { useOnlinePlayers } from '@/hooks/use-online-players';
import { usePlayerGames } from '@/hooks/use-player-games';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser, ChatMessage } from '@/types';
import { EditProfileDrawer, EditBalanceDrawer, NotesDrawer, ExpandedImageModal, AddGameDrawer } from './modals';
import { PlayerListSidebar, ChatHeader, PlayerInfoSidebar, EmptyState, PinnedMessagesSection, MessageInputArea } from './sections';
import { MessageBubble } from './components/message-bubble';

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
  const [notes, setNotes] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [pendingPinMessageId, setPendingPinMessageId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const [isPinnedMessagesExpanded, setIsPinnedMessagesExpanded] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
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
  const [isUserAtLatest, setIsUserAtLatest] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isNotesDrawerOpen, setIsNotesDrawerOpen] = useState(false);
  const [isAddGameDrawerOpen, setIsAddGameDrawerOpen] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const latestMessageIdRef = useRef<string | null>(null);
  const wasHistoryLoadingRef = useRef(false);
  const messageMenuRef = useRef<HTMLDivElement | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAutoScrollingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const hasScrolledToInitialLoadRef = useRef(false);
  const isLoadingOlderMessagesRef = useRef(false);
  const pendingLoadRequestRef = useRef(false);
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
    '🔥', '⭐', '✨', '💫', '🌟', '💥', '💯', '✅',
    '❌', '⚠️', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇'
  ];

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

  // ✨ OPTIMIZED: Fetch online players using hybrid REST + WebSocket approach
  const {
    onlinePlayers: apiOnlinePlayers,
    isLoading: isLoadingApiOnlinePlayers,
    error: onlinePlayersError,
    refetch: refetchOnlinePlayers,
    isConnected: isOnlinePlayersWSConnected,
  } = useOnlinePlayers({
    adminId: adminUserId,
    enabled: hasValidAdminUser && activeTab === 'online', // Only fetch when online tab is active
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
      // ✨ OPTIMIZED: Use hybrid REST + WebSocket online players
      // apiOnlinePlayers already combines REST API data with real-time WebSocket updates
      const seenUserIds = new Map<number, Player>();
      
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
            // Merge: keep online player data but update with chat info
            seenUserIds.set(player.user_id, {
              ...existing,
              lastMessage: player.lastMessage || existing.lastMessage,
              lastMessageTime: player.lastMessageTime || existing.lastMessageTime,
              unreadCount: player.unreadCount ?? existing.unreadCount ?? 0,
            });
          } else {
            // Add player from active chats if not in online list
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
      activeChatsUsers.forEach((player: Player) => {
        if (player.user_id && !seenUserIds.has(player.user_id)) {
          seenUserIds.add(player.user_id);
          combinedPlayers.push(player);
        }
      });
      
      // Then, add players from allPlayers that aren't in active chats
      allPlayers.forEach((player: Player) => {
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
        !IS_PROD && console.log('✅ Image uploaded successfully:', result);
        
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
  }, [messageInput, selectedImage, selectedPlayer, wsSendMessage, updateChatLastMessage, adminUserId, addToast]);

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

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    // Don't scroll if user is loading older messages (near the top)
    if (isLoadingOlderMessagesRef.current) {
      return;
    }

    // Check if user is near the top - if so, don't auto-scroll
    const distanceFromTop = container.scrollTop;
    if (distanceFromTop < LOAD_MORE_SCROLL_THRESHOLD * 2) {
      // User is near top, likely loading older messages - don't interfere
      return;
    }

    // During transitions, always use instant scroll to prevent jitter
    if (isTransitioningRef.current || behavior !== 'smooth') {
      container.scrollTop = container.scrollHeight;
      setIsUserAtLatest(true);
      setAutoScrollEnabled(true);
      setUnseenMessageCount(0);
    } else {
      // Only use smooth scrolling for user-initiated scrolls when not transitioning
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      // Reset unseen count immediately since we're scrolling to bottom
      setUnseenMessageCount(0);
      // Other states will be updated by evaluateScrollPosition when scroll completes
    }
  }, []);

  const evaluateScrollPosition = useCallback(() => {
    // Don't evaluate if we're in the middle of an auto-scroll or loading older messages
    if (isAutoScrollingRef.current || isLoadingOlderMessagesRef.current) {
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
  }, []);

  const handlePlayerSelect = useCallback((player: Player, options?: { markAsRead?: boolean }) => {
    const { markAsRead } = options ?? {};
    const shouldMarkAsRead = markAsRead ?? DEFAULT_MARK_AS_READ;

    // Debug: Log player selection to verify IDs
    !IS_PROD && console.log('👤 [Player Select]', {
      username: player.username,
      chatId: player.id,
      userId: player.user_id,
      tab: activeTab,
    });

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
    setNotes(''); // Clear notes when switching players
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

  const handleSaveNotes = useCallback(async () => {
    if (!selectedPlayer || isSavingNotes) {
      return;
    }

    const token = storage.get(TOKEN_KEY);
    if (!token) {
      addToast({
        type: 'error',
        title: 'Authentication required',
        description: 'Please sign in again to save notes.',
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      const response = await fetch('/api/admin/save-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: notes,
          player_id: selectedPlayer.user_id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          (result && (result.message || result.detail)) ||
          'Unable to save notes right now.';
        throw new Error(errorMessage);
      }

      addToast({
        type: 'success',
        title: result?.message || 'Notes saved successfully',
      });
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to save notes',
        description,
      });
    } finally {
      setIsSavingNotes(false);
    }
  }, [selectedPlayer, notes, isSavingNotes, addToast]);

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

  const handleOpenAddGame = useCallback(() => {
    if (!selectedPlayer) return;
    setIsAddGameDrawerOpen(true);
  }, [selectedPlayer]);

  const handleAddGame = useCallback(async (data: { username: string; password: string; code: string; user_id: number }) => {
    if (!selectedPlayer || isAddingGame) {
      return;
    }

    setIsAddingGame(true);
    try {
      const { playersApi } = await import('@/lib/api/users');
      const result = await playersApi.createGame(data);

      addToast({
        type: 'success',
        title: 'Game added successfully',
        description: `${result.game_name} account created for ${result.username}`,
      });
      
      setIsAddGameDrawerOpen(false);
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to add game',
        description,
      });
    } finally {
      setIsAddingGame(false);
    }
  }, [selectedPlayer, isAddingGame, addToast]);

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

  const maybeLoadOlderMessages = useCallback(async () => {
    if (!selectedPlayer) return;

    const container = messagesContainerRef.current;
    if (!container) return;
    
    const scrollTop = container.scrollTop;
    
    // Debug logging
    !IS_PROD && console.log('📜 maybeLoadOlderMessages check:', {
      scrollTop,
      threshold: LOAD_MORE_SCROLL_THRESHOLD,
      isHistoryLoading: isHistoryLoadingMessages,
      hasMoreHistory,
      isLoadingOlder: isLoadingOlderMessagesRef.current,
      isTransitioning: isTransitioningRef.current,
      willLoad: scrollTop <= LOAD_MORE_SCROLL_THRESHOLD && !isHistoryLoadingMessages && hasMoreHistory && !isLoadingOlderMessagesRef.current && !isTransitioningRef.current,
    });
    
    if (scrollTop > LOAD_MORE_SCROLL_THRESHOLD) {
      pendingLoadRequestRef.current = false;
      return;
    }
    
    // If we can't load right now but user is at the top, remember the request
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current || isTransitioningRef.current) {
      if (hasMoreHistory) {
        pendingLoadRequestRef.current = true;
        !IS_PROD && console.log('⏳ Load blocked, marking as pending');
      }
      return;
    }
    
    if (!hasMoreHistory) {
      pendingLoadRequestRef.current = false;
      return;
    }
    
    // Clear pending flag since we're about to load
    pendingLoadRequestRef.current = false;

    !IS_PROD && console.log('🚀 Loading older messages...');

    // Mark that we're loading older messages to prevent auto-scroll
    isLoadingOlderMessagesRef.current = true;
    const previousScrollTop = scrollTop;
    const previousScrollHeight = container.scrollHeight;

    try {
      const result = await loadOlderMessages();

      !IS_PROD && console.log('✅ Loaded older messages:', {
        added: result.added,
        previousScrollTop,
        previousScrollHeight,
      });

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) {
          isLoadingOlderMessagesRef.current = false;
          return;
        }

        if (result.added > 0) {
          const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
          const newScrollTop = previousScrollTop + heightDelta;
          
          !IS_PROD && console.log('📍 Restoring scroll position:', {
            heightDelta,
            oldScrollTop: previousScrollTop,
            newScrollTop,
            currentScrollHeight: updatedContainer.scrollHeight,
          });
          
          updatedContainer.scrollTop = newScrollTop;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }
        
        // Reset flag after scroll position is restored
        // Use a longer delay to ensure scroll position is stable
        setTimeout(() => {
          isLoadingOlderMessagesRef.current = false;
          !IS_PROD && console.log('🔓 Cleared isLoadingOlder flag');
          
          // Check if there's a pending load request
          if (pendingLoadRequestRef.current) {
            const currentContainer = messagesContainerRef.current;
            if (currentContainer && currentContainer.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD) {
              !IS_PROD && console.log('🔄 Executing pending load request...');
              pendingLoadRequestRef.current = false;
              
              // Trigger the scroll handler to check and load
              setTimeout(() => {
                handleScroll();
              }, 50);
            } else {
              pendingLoadRequestRef.current = false;
            }
          }
        }, 200);
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
      !IS_PROD && console.log('🔓 Cleared isLoadingOlder flag (error)');
    }
  }, [hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, selectedPlayer]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      !IS_PROD && console.log('📜 Scroll event:', {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
      });
    }
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
    if (!selectedPlayer) {
      return;
    }

    latestMessageIdRef.current = null;
    wasHistoryLoadingRef.current = false; // Reset to allow initial history load
    setUnseenMessageCount(0);
    hasScrolledToInitialLoadRef.current = false; // Reset for new player
    isLoadingOlderMessagesRef.current = false; // Reset for new player
    pendingLoadRequestRef.current = false; // Reset for new player

    // Mark that we're transitioning and auto-scrolling
    isTransitioningRef.current = true;
    isAutoScrollingRef.current = true;

    // If messages are already loaded, scroll immediately
    // Otherwise, wait for messages to load (handled in other useEffects)
    if (wsMessages.length > 0) {
      // Use requestAnimationFrame for better synchronization with DOM rendering
      // Double RAF ensures layout is complete before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            // Temporarily disable smooth scrolling for instant positioning
            const originalScrollBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            container.scrollTop = container.scrollHeight;
            container.style.scrollBehavior = originalScrollBehavior;
            
            // Set states after scroll is complete
            setAutoScrollEnabled(true);
            setIsUserAtLatest(true);
            hasScrolledToInitialLoadRef.current = true;
            
            // Allow position evaluation and re-enable animations after transition
            setTimeout(() => {
              isAutoScrollingRef.current = false;
              isTransitioningRef.current = false;
              !IS_PROD && console.log('🔓 Cleared transition flags');
            }, 300);
          }
        });
      });
    } else {
      // Messages not loaded yet - will be handled when messages load
      // Clear transition flags sooner when no messages to scroll
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        isTransitioningRef.current = false;
        !IS_PROD && console.log('🔓 Cleared transition flags (no messages)');
      }, 100);
    }

    return () => {
      isAutoScrollingRef.current = false;
      isTransitioningRef.current = false;
    };
  }, [selectedPlayer, wsMessages.length]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const handleContainerScroll = () => {
      handleScroll();
    };

    container.addEventListener('scroll', handleContainerScroll);

    // Delay evaluation after player change to let auto-scroll and transition complete
    const timeoutId = setTimeout(() => {
      // Only evaluate if we're not in the middle of a transition
      if (!isTransitioningRef.current) {
        evaluateScrollPosition();
      }
    }, 350);

    return () => {
      container.removeEventListener('scroll', handleContainerScroll);
      clearTimeout(timeoutId);
    };
  }, [handleScroll, evaluateScrollPosition, selectedPlayer]);

  useEffect(() => {
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

    // On initial load when messages first appear, scroll to bottom immediately
    // But only if user is not loading older messages
    if (!hasScrolledToInitialLoadRef.current && wsMessages.length > 0 && !isHistoryLoadingMessages && !isLoadingOlderMessagesRef.current) {
      const container = messagesContainerRef.current;
      const isNearTop = container && container.scrollTop < LOAD_MORE_SCROLL_THRESHOLD * 2;
      
      if (!isNearTop) {
        hasScrolledToInitialLoadRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToLatest('auto');
            setAutoScrollEnabled(true);
            setIsUserAtLatest(true);
          });
        });
        return;
      }
    }

    // Don't auto-scroll if user is loading older messages
    if (isLoadingOlderMessagesRef.current) {
      !IS_PROD && console.log('⛔ Skipping auto-scroll: loading older messages');
      return;
    }

    // Don't auto-scroll if user is viewing history (not at bottom)
    const container = messagesContainerRef.current;
    if (container) {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const isAtBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
      
      // Only auto-scroll if user is at or near the bottom
      if (!isAtBottom) {
        !IS_PROD && console.log('⛔ Skipping auto-scroll: user not at bottom', {
          distanceFromBottom,
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
        });
        setUnseenMessageCount((prev) => Math.min(prev + 1, 99));
        return;
      }
    }

    if (autoScrollEnabled) {
      !IS_PROD && console.log('✅ Auto-scrolling to new message');
      requestAnimationFrame(() => {
        scrollToLatest('smooth');
      });
    } else {
      setUnseenMessageCount((prev) => Math.min(prev + 1, 99));
    }
  }, [wsMessages, autoScrollEnabled, scrollToLatest, isHistoryLoadingMessages]);

  useEffect(() => {
    const wasLoading = wasHistoryLoadingRef.current;
    wasHistoryLoadingRef.current = isHistoryLoadingMessages;

    // On initial load (when history finishes loading and we haven't scrolled yet), scroll to latest
    // But only if user is not loading older messages
    if (wasLoading && !isHistoryLoadingMessages && !hasScrolledToInitialLoadRef.current && wsMessages.length > 0 && !isLoadingOlderMessagesRef.current) {
      const container = messagesContainerRef.current;
      
      // Check if user has scrolled up to view history
      let shouldScrollToBottom = true;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        const isAtBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
        shouldScrollToBottom = isAtBottom || container.scrollTop === 0; // At bottom or at very top (not yet scrolled)
      }
      
      // Only scroll to bottom if user is at the bottom or hasn't scrolled yet
      if (shouldScrollToBottom) {
        hasScrolledToInitialLoadRef.current = true;
        !IS_PROD && console.log('📍 Initial history load complete, scrolling to latest');
        // Use double RAF to ensure messages are rendered
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToLatest('auto');
            setAutoScrollEnabled(true);
            setIsUserAtLatest(true);
          });
        });
      } else {
        !IS_PROD && console.log('⛔ Initial history load complete, but user has scrolled - not auto-scrolling');
        hasScrolledToInitialLoadRef.current = true; // Mark as scrolled so we don't try again
      }
    }
  }, [isHistoryLoadingMessages, wsMessages.length, scrollToLatest]);


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
        usersError={usersError}
        onPlayerSelect={handlePlayerSelect}
        onRefreshOnlinePlayers={handleRefreshOnlinePlayers}
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
            />

            {/* Messages / Purchase History */}
            <div 
              ref={messagesContainerRef}
              className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6 space-y-6 bg-gradient-to-b from-background/50 to-background"
            >
              {/* Loading indicator for message history */}
              {isHistoryLoadingMessages && (
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
            const showAvatar = message.sender === 'player' && (
              !prevMessage || prevMessage.sender !== message.sender || 
              (prevMessage.time && message.time && 
               Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() - 
                        new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
            );
            const isConsecutive = prevMessage && prevMessage.sender === message.sender;
            const isAdmin = message.sender === 'admin';
            const isPinning = pendingPinMessageId === message.id;

            return (
              <MessageBubble
                key={message.id}
                message={message}
                selectedPlayer={selectedPlayer}
                isAdmin={isAdmin}
                showAvatar={Boolean(showAvatar)}
                isConsecutive={Boolean(isConsecutive)}
                isPinning={isPinning}
                messageMenuOpen={messageMenuOpen}
                messageMenuRef={messageMenuRef}
                onExpandImage={setExpandedImage}
                onToggleMenu={setMessageMenuOpen}
                onTogglePin={handleTogglePin}
              />
            );
          })}
        </div>
      ))}

      {!isUserAtLatest && (
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
              </span>
              {unseenMessageCount > 0 && (
                <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-lg ring-2 ring-background">
                  {unseenMessageCount > 99 ? '99+' : unseenMessageCount}
                </div>
              )}
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Typing Indicator */}
      {remoteTyping && (
        <div
          className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{ willChange: 'transform, opacity' }}
        >
          <div className="flex items-end gap-2 max-w-[85%] md:max-w-[75%]">
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20">
              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl rounded-bl-sm px-4 py-3 shadow-md shadow-blue-500/25">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-2 h-2 bg-white/80 rounded-full animate-bounce"></div>
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
    setNotes={setNotes}
    isSavingNotes={isSavingNotes}
    onNavigateToPlayer={handleNavigateToPlayer}
    onOpenEditBalance={handleOpenEditBalance}
    onOpenEditProfile={handleOpenEditProfile}
    onOpenAddGame={handleOpenAddGame}
    onSaveNotes={handleSaveNotes}
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
/>

{selectedPlayer && (
  <AddGameDrawer
    isOpen={isAddGameDrawerOpen}
    onClose={() => setIsAddGameDrawerOpen(false)}
    playerId={selectedPlayer.user_id}
    playerUsername={selectedPlayer.username}
    playerGames={playerGames}
    onGameAdded={() => {}}
    onSubmit={handleAddGame}
    isSubmitting={isAddingGame}
  />
)}

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
