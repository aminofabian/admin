'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';
import { useChatUsers } from '@/hooks/use-chat-users';
import { useChatWebSocket } from '@/hooks/use-chat-websocket';
import { storage } from '@/lib/utils/storage';
import type { ChatUser, ChatMessage } from '@/types';

type Player = ChatUser;
type Message = ChatMessage;

// Production mode check
const IS_PROD = process.env.NODE_ENV === 'production';

// Get admin user ID from storage
const getAdminUserId = (): number => {
  try {
    // User data is stored under 'user' key (not 'user_data')
    const userDataStr = storage.get('user');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      const userId = userData.id || userData.user_id || 2;
      !IS_PROD && console.log('📍 Admin User ID:', userId);
      return userId;
    }
  } catch (error) {
    console.error('❌ Failed to parse user data from localStorage:', error);
  }
  !IS_PROD && console.warn('⚠️ User not found in localStorage, using default admin user ID: 2');
  return 2; // Default admin user ID
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
  const [adminUserId] = useState(() => getAdminUserId());
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'online' | 'active-chats' | 'all-players'>('online');
  const [chatViewMode, setChatViewMode] = useState<'messages' | 'purchases'>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [availability, setAvailability] = useState(true);
  const [notes, setNotes] = useState('');
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const skipAutoScrollRef = useRef(false);

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
  } = useChatUsers({
    adminId: adminUserId,
    enabled: true,
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
  } = useChatWebSocket({
    userId: selectedPlayer?.user_id ?? null,
    chatId: selectedPlayer?.id ?? null, // id field contains chat_id
    adminId: adminUserId,
    enabled: !!selectedPlayer,
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
    let players: ChatUser[];
    if (activeTab === 'online') {
      players = onlinePlayers;
    } else if (activeTab === 'active-chats') {
      players = activeChatsUsers; // ✅ Users with active conversations (WebSocket)
    } else {
      // 'all-players' - All players from REST API
      players = allPlayers; // ✅ All players (REST API)
    }
    
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(
      p => p.username.toLowerCase().includes(query) || p.email.toLowerCase().includes(query)
    );
  }, [activeTab, onlinePlayers, activeChatsUsers, allPlayers, searchQuery]);

  // Determine which loading state to show based on active tab
  const isCurrentTabLoading = useMemo(() => {
    if (activeTab === 'all-players') {
      !IS_PROD && console.log('🔍 All Players tab - isLoadingAllPlayers:', isLoadingAllPlayers, 'allPlayers.length:', allPlayers.length);
      return isLoadingAllPlayers;
    }
    !IS_PROD && console.log('🔍 Other tab - isLoadingUsers:', isLoadingUsers);
    return isLoadingUsers;
  }, [activeTab, isLoadingUsers, isLoadingAllPlayers, allPlayers.length]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (skipAutoScrollRef.current) return;
    scrollToBottom();
  }, [wsMessages, scrollToBottom]);

  useEffect(() => {
    if (selectedPlayer) {
      scrollToBottom();
    }
  }, [selectedPlayer, scrollToBottom]);

  // Fetch all players from HTTP endpoint when switching to 'all-players' tab
  useEffect(() => {
    if (activeTab === 'all-players') {
      !IS_PROD && console.log('🔄 Switching to all-players tab, fetching...');
      fetchAllPlayers();
    }
  }, [activeTab, fetchAllPlayers]);

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
    scrollToBottom();
  }, [messageInput, selectedPlayer, wsSendMessage, scrollToBottom, updateChatLastMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handlePlayerSelect = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setMessageMenuOpen(null);
    setMobileView('chat');
    setTimeout(scrollToBottom, 100);
  }, [scrollToBottom]);

  const maybeLoadOlderMessages = useCallback(async () => {
    if (chatViewMode !== 'messages') return;
    if (!selectedPlayer) return;
    if (skipAutoScrollRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop > LOAD_MORE_SCROLL_THRESHOLD) return;
    if (isHistoryLoadingMessages) return;
    if (!hasMoreHistory) return;

    const previousScrollTop = container.scrollTop;
    const previousScrollHeight = container.scrollHeight;

    skipAutoScrollRef.current = true;

    try {
      const result = await loadOlderMessages();

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) {
          skipAutoScrollRef.current = false;
          return;
        }

        if (result.added > 0) {
          const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
          updatedContainer.scrollTop = previousScrollTop + heightDelta;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }

        skipAutoScrollRef.current = false;
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      skipAutoScrollRef.current = false;
    }
  }, [chatViewMode, hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, selectedPlayer]);

  // Auto-select first player if none selected
  useEffect(() => {
    if (!selectedPlayer && activeChatsUsers.length > 0) {
      setSelectedPlayer(activeChatsUsers[0]);
      setMobileView('chat');
    }
  }, [selectedPlayer, activeChatsUsers]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      void maybeLoadOlderMessages();
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [maybeLoadOlderMessages]);

  return (
    <div className="h-full flex gap-0 md:gap-4 bg-background">
      {/* Left Column - Player List */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border/50 bg-gradient-to-b from-card to-card/50 flex-col`}>
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
              onClick={() => setActiveTab('active-chats')}
              className={`flex-1 px-2 md:px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'active-chats'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Active Chats
            </button>
            <button
              onClick={() => setActiveTab('all-players')}
              className={`flex-1 px-2 md:px-3 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'all-players'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              All Players
            </button>
          </div>
        </div>

        {/* Player Count */}
        <div className="px-4 md:px-5 py-3 border-b border-border/50 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-sm font-bold text-green-600 dark:text-green-400">{onlinePlayers.length}</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Online Players</p>
                <p className="text-[10px] text-muted-foreground">{activeChatsUsers.length} with chats</p>
              </div>
            </div>
            <button className="p-2 hover:bg-muted rounded-lg transition-colors group">
              <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto">
          {(() => {
            const shouldShowSkeleton = isCurrentTabLoading || (activeTab === 'all-players' && allPlayers.length === 0 && !usersError);
            !IS_PROD && console.log('💀 Should show skeleton?', shouldShowSkeleton, {
              isCurrentTabLoading,
              activeTab,
              allPlayersLength: allPlayers.length,
              usersError
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
              {displayedPlayers.map((player, index) => (
                <button
                  key={player.id}
                  onClick={() => handlePlayerSelect(player)}
                  className={`w-full p-3 md:p-3.5 rounded-xl mb-2 transition-all duration-200 group ${
                    selectedPlayer?.id === player.id 
                      ? 'bg-primary/10 shadow-md ring-2 ring-primary/20' 
                      : 'hover:bg-muted/50 active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-md transition-all duration-200 ${
                        selectedPlayer?.id === player.id 
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
                    
                    {/* Unread Badge (optional) */}
                    {selectedPlayer?.id !== player.id && index === 0 && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary-foreground">3</span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Column - Chat Conversation */}
      <div className={`${mobileView === 'chat' ? 'flex' : 'hidden'} md:flex flex-1 flex-col border-r border-border bg-card w-full md:w-auto`}>
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
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-sm md:text-base font-bold shadow-md ring-2 ring-primary/10">
                {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
              </div>
                  {selectedPlayer.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{selectedPlayer.username}</h3>
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
              className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6 scroll-smooth bg-gradient-to-b from-background/50 to-background"
            >
              {/* Loading state for purchase history */}
              {chatViewMode === 'purchases' && isPurchaseHistoryLoading && (
                <div className="space-y-4">
                  {/* Skeleton loaders for purchase history */}
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="flex justify-start animate-pulse">
                      <div className="flex items-start gap-2 md:gap-3 w-full max-w-[85%] md:max-w-[75%]">
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

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200 ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                          {/* Avatar */}
                          {showAvatar ? (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20">
                              {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-7 md:w-8 shrink-0" />
                          )}
                          
                          {/* Message Bubble */}
                          <div className="relative group flex flex-col">
                            <div
                              className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md transition-all duration-200 ${
                                isAdmin
                                  ? 'bg-card border border-border/50 text-foreground shadow-black/5 dark:shadow-black/20'
                                  : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25'
                              } ${
                                isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
                              }`}
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
                    <div className="flex items-start gap-2 md:gap-3 w-full max-w-[85%] md:max-w-[75%]">
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
              
              <div ref={messagesEndRef} className="h-1" />
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
          <div className="p-4 md:p-6 border-b border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
            {/* Back button for mobile */}
            <button
              onClick={() => setMobileView('chat')}
              className="md:hidden mb-4 p-2 hover:bg-muted rounded-lg transition-colors inline-flex items-center gap-2 text-muted-foreground"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to chat</span>
            </button>
            
            <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg ring-4 ring-primary/20">
                    {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                  </div>
                  {isConnected && (
                    <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-card animate-pulse shadow-lg" />
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">{selectedPlayer.username}</h3>
                <p className="text-sm text-muted-foreground">@{selectedPlayer.username.toLowerCase().replace(/\s+/g, '')}</p>
                {isConnected ? (
                  <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    Connecting...
                  </span>
                )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-5">
            {/* Financial Summary */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground">Balance</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">Total Balance</span>
                  <span className="text-lg font-bold text-foreground">{formatCurrency(selectedPlayer.balance || '0')}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-foreground font-medium">Winnings</span>
                  </div>
                  <span className="text-base font-bold text-yellow-600 dark:text-yellow-500">{formatCurrency(selectedPlayer.winningBalance || '0')}</span>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="rounded-xl bg-card border border-border p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground">Contact Info</h4>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-2.5 hover:bg-muted/50 rounded-lg transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                    <p className="text-sm text-foreground font-medium truncate">{selectedPlayer.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2.5 hover:bg-muted/50 rounded-lg transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 transition-colors">
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <p className="text-sm text-foreground font-medium">{selectedPlayer.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Game Statistics */}
            <div className="rounded-xl bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent border border-green-500/20 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground">Statistics</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Games Played</p>
                  <p className="text-2xl font-bold text-foreground">{selectedPlayer.gamesPlayed || 0}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedPlayer.winRate || 0}%</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="primary" className="w-full shadow-md hover:shadow-lg transition-shadow">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Edit Balance
              </Button>
              <Button variant="secondary" className="w-full hover:bg-muted/50">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Info
              </Button>
            </div>

            {/* Activity Sections */}
            <div className="rounded-xl bg-card border border-border p-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground">Activity</h4>
              </div>
              {[
                { name: 'Purchases', count: 0, icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
                { name: 'Cashouts', count: 0, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
                { name: 'Game Activities', count: 0, icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' },
                { name: 'Games', count: 0, icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' }
              ].map((section, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={section.icon} />
                      </svg>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{section.name}</p>
                      <p className="text-xs text-muted-foreground">{section.count} items</p>
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Add Game Button */}
            <Button variant="primary" className="w-full shadow-md hover:shadow-lg transition-shadow">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add New Game
            </Button>

            {/* Notes Section */}
            <div className="rounded-xl bg-card border border-border p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-foreground">Notes</h4>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add private notes about this player..."
                className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background dark:bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="primary" className="w-full">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Save
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => setNotes('')}>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

