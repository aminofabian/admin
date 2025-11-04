'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Button, Input } from '@/components/ui';
import { formatCurrency } from '@/lib/utils/formatters';

interface Message {
  id: string;
  text: string;
  sender: 'player' | 'company';
  timestamp: string;
  date: string;
  time?: string;
  isRead?: boolean;
}

interface Player {
  id: string;
  username: string;
  email: string;
  avatar: string;
  isOnline: boolean;
  lastMessage?: string;
  lastMessageTime?: string;
  balance: string;
  winningBalance: string;
  gamesPlayed: number;
  winRate: number;
  phone?: string;
}

const MOCK_PLAYERS: Player[] = [
  {
    id: '1',
    username: 'Player 2',
    email: 'aminofab@gmail.com',
    avatar: 'P',
    isOnline: true,
    lastMessage: 'You successfully purchased $10.0...',
    lastMessageTime: '1 day ago',
    balance: '506.28',
    winningBalance: '90.00',
    gamesPlayed: 16,
    winRate: 17.78,
  },
  {
    id: '2',
    username: 'Player 3',
    email: 'player3@example.com',
    avatar: 'P',
    isOnline: true,
    lastMessage: 'Hey, can you help me?',
    lastMessageTime: '2 hours ago',
    balance: '250.50',
    winningBalance: '45.00',
    gamesPlayed: 8,
    winRate: 12.5,
  },
  {
    id: '3',
    username: 'Player 4',
    email: 'player4@example.com',
    avatar: 'P',
    isOnline: false,
    lastMessage: 'Thanks for the support!',
    lastMessageTime: '3 days ago',
    balance: '1200.00',
    winningBalance: '200.00',
    gamesPlayed: 24,
    winRate: 25.0,
  },
];

const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    text: 'hhhhhhh ffff gggg ttttt',
    sender: 'player',
    timestamp: '9/18 13:08',
    date: '2024-09-18',
    time: '13:08',
    isRead: true,
  },
  {
    id: '2',
    text: 'ffffffffffxxxxxxxxzz',
    sender: 'company',
    timestamp: '9/18 13:09',
    date: '2024-09-18',
    time: '13:09',
    isRead: true,
  },
  {
    id: '3',
    text: 'ffffffffffxxxxxxxxzz',
    sender: 'company',
    timestamp: '9/18 13:09',
    date: '2024-09-18',
    time: '13:09',
    isRead: true,
  },
  {
    id: '4',
    text: 'gggggdd',
    sender: 'company',
    timestamp: '9/18 13:09',
    date: '2024-09-18',
    time: '13:09',
    isRead: true,
  },
  {
    id: '5',
    text: 'hhhhhhhhvbbb',
    sender: 'player',
    timestamp: '10/26 11:24',
    date: '2024-10-26',
    time: '11:24',
    isRead: true,
  },
  {
    id: '6',
    text: 'You successfully purchased $10.0 credit. Credits: $506.28 Winnings: $90.00',
    sender: 'company',
    timestamp: '11/2 11:56',
    date: '2024-11-02',
    time: '11:56',
    isRead: true,
  },
];

const groupMessagesByDate = (messages: Message[]) => {
  const grouped: { [key: string]: Message[] } = {};
  messages.forEach((msg) => {
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

export function ChatComponent() {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(MOCK_PLAYERS[0] || null);
  const [activeTab, setActiveTab] = useState<'online' | 'all'>('online');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [availability, setAvailability] = useState(true);
  const [notes, setNotes] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messageMenuOpen, setMessageMenuOpen] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [mobileView, setMobileView] = useState<'list' | 'chat' | 'info'>(
    MOCK_PLAYERS[0] ? 'chat' : 'list'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const onlinePlayers = useMemo(() => MOCK_PLAYERS.filter(p => p.isOnline), []);
  const allPlayers = useMemo(() => MOCK_PLAYERS, []);
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages]);

  const displayedPlayers = useMemo(() => {
    const players = activeTab === 'online' ? onlinePlayers : allPlayers;
    if (!searchQuery.trim()) return players;
    const query = searchQuery.toLowerCase();
    return players.filter(
      p => p.username.toLowerCase().includes(query) || p.email.toLowerCase().includes(query)
    );
  }, [activeTab, onlinePlayers, allPlayers, searchQuery]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (selectedPlayer) {
      scrollToBottom();
    }
  }, [selectedPlayer, scrollToBottom]);

  const handleSendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedPlayer) return;
    
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageInput.trim(),
      sender: 'company',
      timestamp: new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isRead: false,
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessageInput('');
    scrollToBottom();
  }, [messageInput, selectedPlayer, scrollToBottom]);

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

  return (
    <div className="h-full flex gap-0 md:gap-4 bg-background">
      {/* Left Column - Player List */}
      <div className={`${
        mobileView === 'list' ? 'flex' : 'hidden'
      } md:flex w-full md:w-80 lg:w-96 flex-shrink-0 border-r border-border/50 bg-gradient-to-b from-card to-card/50 flex-col`}>
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
              className={`flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
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
              onClick={() => setActiveTab('all')}
              className={`flex-1 px-3 md:px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === 'all'
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
                <p className="text-[10px] text-muted-foreground">{allPlayers.length} total</p>
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
          {displayedPlayers.length === 0 ? (
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
                        {player.avatar}
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
                          {player.lastMessage}
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
      <div className={`${
        mobileView === 'chat' ? 'flex' : 'hidden'
      } md:flex flex-1 flex-col border-r border-border bg-card w-full md:w-auto`}>
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
                    {selectedPlayer.avatar}
                  </div>
                  {selectedPlayer.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm md:text-base truncate">{selectedPlayer.username}</h3>
                    {selectedPlayer.isOnline && (
                      <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Online
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedPlayer.isOnline ? 'Active now' : `Last seen ${selectedPlayer.lastMessageTime}`}
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

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-6 space-y-6 scroll-smooth bg-gradient-to-b from-background/50 to-background"
            >
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

                    return (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'player' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-200 ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                      >
                        <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] ${message.sender === 'player' ? 'flex-row' : 'flex-row-reverse'}`}>
                          {/* Avatar */}
                          {showAvatar ? (
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20">
                              {selectedPlayer.avatar}
                            </div>
                          ) : (
                            <div className="w-7 md:w-8 shrink-0" />
                          )}
                          
                          {/* Message Bubble */}
                          <div className="relative group flex flex-col">
                            <div
                              className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md transition-all duration-200 ${
                                message.sender === 'player'
                                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25'
                                  : 'bg-card border border-border/50 text-foreground shadow-black/5 dark:shadow-black/20'
                              } ${
                                message.sender === 'player' ? 'rounded-bl-sm' : 'rounded-br-sm'
                              }`}
                            >
                              <p className="text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.text}
                              </p>
                            </div>
                            
                            {/* Message Meta */}
                            <div className={`flex items-center gap-1.5 mt-1 px-1 ${
                              message.sender === 'player' ? 'justify-start' : 'justify-end'
                            }`}>
                              <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                                {message.time || message.timestamp}
                              </span>
                              {message.sender === 'company' && (
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
                            {message.sender === 'company' && (
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
              
              {/* Typing Indicator */}
              {isTyping && (
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

            {/* Message Input */}
            <div className="px-4 py-3 md:px-6 md:py-4 border-t border-border/50 bg-gradient-to-t from-card via-card/95 to-card/90 backdrop-blur-sm sticky bottom-0 shadow-lg">
              <div className="flex items-center gap-2 md:gap-3">
                <div className="hidden md:flex items-center gap-1">
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Attach image"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                  <button 
                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
                    title="Emoji"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
                {/* Mobile: Show attach button */}
                <button 
                  className="md:hidden p-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95 flex-shrink-0"
                  title="Attach"
                  aria-label="Attach file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                
                {/* Input Container */}
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (e.target.value.trim() && !isTyping) {
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 2000);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    className="pr-10 rounded-2xl bg-muted/50 dark:bg-muted/30 border-2 border-transparent focus:border-primary focus:bg-background transition-all text-sm md:text-base py-2.5 md:py-3 px-4 shadow-sm"
                  />
                  {messageInput && (
                    <button
                      onClick={() => setMessageInput('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors active:scale-95"
                      aria-label="Clear message"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Send Button */}
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!messageInput.trim()}
                  className="rounded-2xl px-4 md:px-6 py-2.5 md:py-3 transition-all duration-200 hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] shadow-md flex-shrink-0"
                >
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden md:inline font-medium">Send</span>
                </Button>
              </div>
            </div>
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
        <div className={`${
          mobileView === 'info' ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 lg:w-96 flex-shrink-0 bg-gradient-to-b from-card to-card/50 flex-col border-l border-border/50`}>
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
                  {selectedPlayer.avatar}
                </div>
                {selectedPlayer.isOnline && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-card animate-pulse shadow-lg" />
                )}
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1">{selectedPlayer.username}</h3>
              <p className="text-sm text-muted-foreground">@{selectedPlayer.username.toLowerCase().replace(/\s+/g, '')}</p>
              {selectedPlayer.isOnline && (
                <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Online Now
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
                  <span className="text-lg font-bold text-foreground">{formatCurrency(selectedPlayer.balance)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-foreground font-medium">Winnings</span>
                  </div>
                  <span className="text-base font-bold text-yellow-600 dark:text-yellow-500">{formatCurrency(selectedPlayer.winningBalance)}</span>
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
                  <p className="text-2xl font-bold text-foreground">{selectedPlayer.gamesPlayed}</p>
                </div>
                <div className="p-3 bg-background/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedPlayer.winRate}%</p>
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

