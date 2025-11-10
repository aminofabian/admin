'use client';

import { Input } from '@/components/ui';
import type { ChatUser } from '@/types';

// Strip HTML tags for preview text
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const MAX_UNREAD_BADGE_COUNT = 99;

interface PlayerListSidebarProps {
  mobileView: 'list' | 'chat' | 'info';
  availability: boolean;
  setAvailability: (value: boolean) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  activeTab: 'online' | 'all-chats';
  setActiveTab: (tab: 'online' | 'all-chats') => void;
  displayedPlayers: ChatUser[];
  selectedPlayer: ChatUser | null;
  onlinePlayersCount: number;
  activeChatsCount: number;
  isCurrentTabLoading: boolean;
  isLoadingApiOnlinePlayers: boolean;
  usersError: string | null;
  onPlayerSelect: (player: ChatUser) => void;
  onRefreshOnlinePlayers: () => void;
}

export function PlayerListSidebar({
  mobileView,
  availability,
  setAvailability,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  displayedPlayers,
  selectedPlayer,
  onlinePlayersCount,
  activeChatsCount,
  isCurrentTabLoading,
  isLoadingApiOnlinePlayers,
  usersError,
  onPlayerSelect,
  onRefreshOnlinePlayers,
}: PlayerListSidebarProps) {
  return (
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
                {activeTab === 'online' ? displayedPlayers.length : onlinePlayersCount}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Online Players</p>
              <p className="text-[10px] text-muted-foreground">{activeChatsCount} with chats</p>
            </div>
          </div>
          <button
            onClick={onRefreshOnlinePlayers}
            disabled={isLoadingApiOnlinePlayers}
            className="p-2 hover:bg-muted rounded-lg transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Refresh online players"
            title="Refresh online players"
          >
            <svg
              className={`w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors ${
                isLoadingApiOnlinePlayers ? 'animate-spin' : ''
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
        {isCurrentTabLoading && displayedPlayers.length === 0 && !usersError ? (
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
                onClick={() => onPlayerSelect(player)}
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
  );
}
