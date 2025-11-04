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
      } md:flex w-full md:w-80 flex-shrink-0 border-r border-border bg-card flex-col`}>
        {/* Availability Toggle */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Availability</span>
            <button
              onClick={() => setAvailability(!availability)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                availability ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  availability ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${availability ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
              {availability ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-border">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
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
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('online')}
            className={`flex-1 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors ${
              activeTab === 'online'
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            Online
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            All Players
          </button>
        </div>

        {/* Player Count */}
        <div className="p-3 md:p-4 border-b border-border flex items-center justify-between">
          <span className="text-xs md:text-sm text-muted-foreground">
            Online Players: {onlinePlayers.length}
          </span>
          <Button variant="ghost" size="sm" className="text-xs md:text-sm text-blue-600 hover:text-blue-700">
            Refresh
          </Button>
        </div>

        {/* Player List */}
        <div className="flex-1 overflow-y-auto">
          {displayedPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <svg className="w-12 h-12 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-sm text-muted-foreground">No players found</p>
            </div>
          ) : (
            displayedPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handlePlayerSelect(player)}
                className={`w-full p-4 border-b border-border hover:bg-muted/50 transition-all duration-200 group ${
                  selectedPlayer?.id === player.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold transition-transform group-hover:scale-110 ${
                      selectedPlayer?.id === player.id ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}>
                      {player.avatar}
                    </div>
                    {player.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-foreground truncate">{player.username}</div>
                      {player.lastMessageTime && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {player.lastMessageTime}
                        </span>
                      )}
                    </div>
                    {player.lastMessage && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {player.lastMessage}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
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
            <div className="p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm sticky top-0 z-10">
              {/* Back button for mobile */}
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors mr-2"
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex items-center gap-3 flex-1">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                    {selectedPlayer.avatar}
                  </div>
                  {selectedPlayer.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-foreground">{selectedPlayer.username}</div>
                  {selectedPlayer.isOnline && (
                    <div className="text-xs text-green-600 dark:text-green-400">Online</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setMobileView('info')}
                  className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                <button className="hidden md:block p-2 hover:bg-muted rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
                <button className="hidden md:block p-2 hover:bg-muted rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4 md:space-y-6 scroll-smooth"
            >
              {Object.entries(groupedMessages).map(([date, dateMessages]) => (
                <div key={date} className="space-y-4">
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-muted/50 px-3 py-1 rounded-full text-xs text-muted-foreground font-medium">
                      {formatMessageDate(date)}
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
                        className={`flex ${message.sender === 'player' ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div className={`flex items-end gap-1.5 md:gap-2 max-w-[85%] md:max-w-[70%] ${message.sender === 'player' ? 'flex-row' : 'flex-row-reverse'}`}>
                          {showAvatar ? (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                              {selectedPlayer.avatar}
                            </div>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                          <div className="relative group">
                            <div
                              className={`rounded-2xl px-3 md:px-4 py-2 md:py-2.5 shadow-sm transition-all duration-200 hover:shadow-md ${
                                message.sender === 'player'
                                  ? 'bg-blue-500 text-white rounded-bl-md'
                                  : 'bg-gray-200 dark:bg-gray-700 text-foreground rounded-br-md'
                              } ${isConsecutive ? 'mt-1' : ''}`}
                            >
                              <div className="text-sm md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                {message.text}
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${
                                message.sender === 'player' ? 'justify-start' : 'justify-end'
                              }`}>
                                <span
                                  className={`text-xs ${
                                    message.sender === 'player'
                                      ? 'text-blue-100'
                                      : 'text-muted-foreground'
                                  }`}
                                >
                                  {message.time || message.timestamp}
                                </span>
                                {message.sender === 'company' && (
                                  <svg className={`w-3 h-3 ${message.isRead ? 'text-blue-400' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            </div>
                            {message.sender === 'company' && (
                              <button
                                onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                                className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded-lg"
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
                <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 rounded-2xl px-4 py-2.5 rounded-bl-md">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Message Input */}
            <div className="p-3 md:p-4 border-t border-border bg-card/50 backdrop-blur-sm sticky bottom-0">
              <div className="flex items-end gap-1 md:gap-2">
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
                  className="md:hidden p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all active:scale-95"
                  title="Attach"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Type a message..."
                    value={messageInput}
                    onChange={(e) => {
                      setMessageInput(e.target.value);
                      if (e.target.value.trim() && !isTyping) {
                        setIsTyping(true);
                        setTimeout(() => setIsTyping(false), 2000);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    className="pr-10 rounded-full bg-background border-2 focus:border-primary transition-colors text-sm md:text-base py-2 md:py-2.5"
                  />
                  {messageInput && (
                    <button
                      onClick={() => setMessageInput('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!messageInput.trim()}
                  className="rounded-full px-4 md:px-6 py-2 md:py-2.5 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span className="hidden md:inline">Send</span>
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-6 opacity-20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No conversation selected</h3>
            <p className="text-sm text-center max-w-sm">Select a player from the list to start chatting</p>
          </div>
        )}
      </div>

      {/* Right Column - Player Info */}
      {selectedPlayer && (
        <div className={`${
          mobileView === 'info' ? 'flex' : 'hidden'
        } md:flex w-full md:w-80 flex-shrink-0 bg-card flex-col`}>
          <div className="p-4 border-b border-border flex items-center gap-3">
            {/* Back button for mobile */}
            <button
              onClick={() => setMobileView('chat')}
              className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Personal Info</h3>
              <div className="text-sm text-muted-foreground mt-1">@{selectedPlayer.username}</div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Financial Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="font-semibold text-foreground">{formatCurrency(selectedPlayer.balance)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">Win: {formatCurrency(selectedPlayer.winningBalance)}</span>
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-foreground">{selectedPlayer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-sm text-foreground">{selectedPlayer.phone || 'None'}</span>
              </div>
            </div>

            {/* Game Statistics */}
            <div className="space-y-2">
              <div className="text-sm text-foreground">
                Games Played: <span className="font-semibold">{selectedPlayer.gamesPlayed}</span>
              </div>
              <div className="text-sm text-foreground">
                Win Rate: <span className="font-semibold">{selectedPlayer.winRate}%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="default" className="flex-1">Edit Bal.</Button>
              <Button variant="outline" className="flex-1">Edit</Button>
            </div>

            {/* Collapsible Sections */}
            <div className="space-y-2">
              {['Purchases 0', 'Cashouts 0', 'Game Activities 0', 'Games'].map((section, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center justify-between p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{section}</span>
                    <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              ))}
            </div>

            {/* Add Game Button */}
            <Button variant="default" className="w-full">Add Game</Button>

            {/* Notes Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes here..."
                className="w-full min-h-[100px] p-3 border border-border rounded-lg bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-2">
                <Button variant="default" className="flex-1">Save</Button>
                <Button variant="outline" className="flex-1" onClick={() => setNotes('')}>Clear</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

