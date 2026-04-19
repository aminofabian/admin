'use client';

import { memo, useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui';
import { PlayerListSkeleton } from '../skeletons';
import { formatChatTimestampCompact } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';
import {
  isAutoMessage,
  isPurchaseNotification,
  isKycVerificationMessage,
  formatTransactionMessage,
  prepareChatMessageHtmlForDisplay,
} from '../utils/message-helpers';

// Strip HTML tags for preview text
const stripHtml = (html: string): string => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

const MAX_UNREAD_BADGE_COUNT = 99;

//  Memoized player item component to prevent unnecessary re-renders
interface PlayerItemProps {
  player: ChatUser;
  isSelected: boolean;
  onSelect: (player: ChatUser) => void;
}

const PlayerItem = memo(function PlayerItem({ player, isSelected, onSelect }: PlayerItemProps) {
  const unreadCount = player.unreadCount ?? 0;
  const prevUnreadCountRef = useRef(unreadCount);
  const [isNewMessage, setIsNewMessage] = useState(false);
  const itemRef = useRef<HTMLButtonElement>(null);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize badge value to prevent unnecessary calculations
  const unreadBadgeValue = useMemo(() => {
    return unreadCount > MAX_UNREAD_BADGE_COUNT
      ? `${MAX_UNREAD_BADGE_COUNT}+`
      : String(unreadCount);
  }, [unreadCount]);

  // Detect when unread count increases (new message)
  useEffect(() => {
    const currentCount = unreadCount;
    const prevCount = prevUnreadCountRef.current;

    // Only trigger animation if count actually increased
    if (currentCount > prevCount && prevCount >= 0) {
      // New message arrived! Trigger anticipation animation
      setIsNewMessage(true);

      // Clear any existing timer
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }

      // Reset animation state after animation completes
      animationTimerRef.current = setTimeout(() => {
        setIsNewMessage(false);
        animationTimerRef.current = null;
      }, 1500);
    }

    prevUnreadCountRef.current = currentCount;

    // Cleanup timer on unmount
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, [unreadCount]);

  return (
    <button
      ref={itemRef}
      onClick={() => onSelect(player)}
      className={`w-full p-1.5 md:p-2 transition-all duration-200 ease-out group relative border-b border-border/30 last:border-b-0 dark:border-transparent cursor-pointer ${isSelected
        ? 'bg-primary/10 border-l-2 border-l-primary'
        : 'border-l-2 border-l-transparent hover:bg-muted/60 hover:border-l-primary/30 active:scale-[0.998] dark:hover:bg-muted/40'
        } ${isNewMessage ? 'bg-primary/5 animate-new-message-pulse' : ''
        }`}
    >
      {/* New Message Indicator - Glowing bar on the left */}
      {isNewMessage && (
        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full animate-message-glow shadow-lg shadow-primary/50" />
      )}

      <div className="flex items-center gap-1.5">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className={`w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[9px] font-bold shadow-md shadow-blue-500/20 transition-all duration-200 ${isSelected
            ? 'ring-2 ring-primary/40 ring-offset-2 ring-offset-background scale-[1.02]'
            : 'group-hover:scale-[1.02] group-hover:shadow-lg group-hover:shadow-blue-500/25'
            } ${isNewMessage ? 'ring-2 ring-primary/50 scale-105' : ''
            }`}>
            {player.avatar || player.username.charAt(0).toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background shadow-sm ${player.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] md:text-xs font-semibold truncate transition-colors duration-200 capitalize ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary/80'
              } ${isNewMessage ? 'text-primary font-bold' : ''
              }`}>
              {player.username}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-label={`${unreadCount} unread`} />
              )}
              {player.lastMessageTime && (
                <span className={`text-[7px] transition-colors duration-200 capitalize tabular-nums ${isNewMessage ? 'text-primary font-semibold' : 'text-muted-foreground group-hover:text-muted-foreground/90'
                  }`}>
                  {formatChatTimestampCompact(player.lastMessageTime)}
                </span>
              )}
            </div>
          </div>

          {player.lastMessage && (() => {
            const mockMessage = { text: player.lastMessage };
            const isAuto = isAutoMessage(mockMessage);
            const isPurchase = isPurchaseNotification(mockMessage);
            const isKyc = isKycVerificationMessage(mockMessage);

            if (isKyc) {
              return (
                <p
                  className={`text-[10px] truncate mt-0 transition-all duration-200 ${isNewMessage ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-muted-foreground/90'
                    }`}
                >
                  Binpay
                </p>
              );
            }
            if (isAuto || isPurchase) {
              // Format the transaction message
              const formatted = formatTransactionMessage(mockMessage as { text: string; type?: string });

              // For preview, we only want the first line (the action itself)
              // Split by newline or <br> tags to be safe
              const previewText = formatted.split(/\n|<br\s*\/?>/i)[0];

              return (
                <p
                  className={`text-[10px] truncate mt-0 transition-all duration-200 ${isNewMessage ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-muted-foreground/90'
                    }`}
                  dangerouslySetInnerHTML={{ __html: previewText }}
                />
              );
            }

            const plainText = stripHtml(prepareChatMessageHtmlForDisplay(player.lastMessage));
            return (
              <p className={`text-[10px] truncate mt-0 transition-all duration-200 ${isNewMessage
                ? 'text-foreground font-medium'
                : 'text-muted-foreground group-hover:text-muted-foreground/90'
                }`}>
                {plainText}
              </p>
            );
          })()}
        </div>

        {/* Unread Badge - show count when > 1, dot handles single unread */}
        {unreadCount > 1 && (
          <div className="flex-shrink-0 ml-auto">
            <span
              className={`inline-flex items-center justify-center min-w-[14px] h-3 px-1 bg-primary text-primary-foreground text-[7px] font-bold rounded-full transition-all duration-300 ${isNewMessage ? 'animate-badge-pop' : ''
                }`}
            >
              {unreadBadgeValue}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}, (prevProps, nextProps) => {
  // Enhanced comparison: only re-render if critical fields changed
  return (
    prevProps.player.user_id === nextProps.player.user_id &&
    prevProps.player.unreadCount === nextProps.player.unreadCount &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.player.isOnline === nextProps.player.isOnline &&
    prevProps.player.lastMessage === nextProps.player.lastMessage &&
    prevProps.player.lastMessageTime === nextProps.player.lastMessageTime &&
    prevProps.player.username === nextProps.player.username &&
    prevProps.player.avatar === nextProps.player.avatar
  );
});

interface PlayerListSidebarProps {
  mobileView: 'list' | 'chat' | 'info';
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  activeTab: 'online' | 'all-chats';
  setActiveTab: (tab: 'online' | 'all-chats') => void;
  displayedPlayers: ChatUser[];
  selectedPlayer: ChatUser | null;
  onlinePlayersCount: number;
  activeChatsCount: number;
  /** From chat APIs `counts.all_players_count` when present; improves “with chats” when pagination total is missing. */
  directoryAllPlayersCount?: number | null;
  /** From chat list API `pagination.total_count` when present; subtitle falls back to `activeChatsCount`. */
  playersWithChatsTotalCount: number | null;
  isCurrentTabLoading: boolean;
  /** True while server-side player search request is in flight */
  isPlayerSearchLoading?: boolean;
  isLoadingApiOnlinePlayers: boolean;
  isLoadingMore: boolean;
  hasMorePlayers: boolean;
  usersError: string | null;
  onPlayerSelect: (player: ChatUser) => void;
  onRefreshOnlinePlayers: () => void;
  onLoadMore: () => void;
}

export const PlayerListSidebar = memo(function PlayerListSidebar({
  mobileView,
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab,
  displayedPlayers,
  selectedPlayer,
  onlinePlayersCount,
  activeChatsCount,
  directoryAllPlayersCount = null,
  playersWithChatsTotalCount,
  isCurrentTabLoading,
  isPlayerSearchLoading = false,
  isLoadingApiOnlinePlayers,
  isLoadingMore,
  hasMorePlayers,
  usersError,
  onPlayerSelect,
  onRefreshOnlinePlayers,
  onLoadMore,
}: PlayerListSidebarProps) {
  const withChatsDisplayCount =
    playersWithChatsTotalCount ?? directoryAllPlayersCount ?? activeChatsCount;

  const onlinePlayersBadgeCount =
    activeTab === 'online' && searchQuery.trim().length > 0
      ? displayedPlayers.length
      : onlinePlayersCount;

  // Refs for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    // Only observe when on all-chats tab and there's more to load
    if (
      activeTab !== 'all-chats' ||
      !hasMorePlayers ||
      isLoadingMore ||
      isCurrentTabLoading ||
      searchQuery.trim().length > 0
    ) {
      return;
    }

    const trigger = loadMoreTriggerRef.current;
    if (!trigger) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMorePlayers && !isLoadingMore) {
          console.log('📜 Trigger visible - loading more players...');
          onLoadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: '100px', // Start loading 100px before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(trigger);

    return () => {
      observer.disconnect();
    };
  }, [activeTab, hasMorePlayers, isLoadingMore, isCurrentTabLoading, searchQuery, onLoadMore]);
  return (
    <div
      className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-r border-border/40 bg-card/95 md:w-48 lg:w-56`}
    >
      {/* Search Bar */}
      <div className="p-1.5 md:p-2 border-b border-border/50">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground"
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
            className="pl-8 pr-2 py-1 text-sm rounded-md bg-muted/50 dark:bg-muted/30 border-transparent focus:border-primary focus:bg-background transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Tabs: counts only (no icons); refresh beside strip */}
      <div className="border-b border-border/40 px-1.5 pb-1 pt-1 md:px-2">
        <div className="flex items-stretch gap-0.5">
          <div className="flex min-w-0 flex-1 gap-0.5 rounded-md bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('online')}
              title="Players connected right now"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded px-0.5 py-1 leading-none transition-all duration-200 ${activeTab === 'online'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
            >
              <span className="text-[11px] font-bold tabular-nums md:text-xs">{onlinePlayersBadgeCount}</span>
              <span
                className={`mt-0.5 text-[6px] font-semibold uppercase tracking-wide md:text-[7px] ${activeTab === 'online' ? 'text-primary-foreground/90' : ''
                  }`}
              >
                Online
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all-chats')}
              title={`${withChatsDisplayCount} players have an active chat in the directory`}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded px-0.5 py-1 leading-none transition-all duration-200 ${activeTab === 'all-chats'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
            >
              <span className="text-[11px] font-bold tabular-nums md:text-xs">{withChatsDisplayCount}</span>
              <span
                className={`mt-0.5 text-[6px] font-semibold uppercase tracking-wide md:text-[7px] ${activeTab === 'all-chats' ? 'text-primary-foreground/90' : ''
                  }`}
              >
                All chats
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onRefreshOnlinePlayers}
            disabled={isLoadingApiOnlinePlayers}
            className="flex w-8 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-border/50 dark:bg-muted/20"
            aria-label="Refresh online players"
            title="Refresh online players"
          >
            <svg
              className={`h-4 w-4 ${isLoadingApiOnlinePlayers ? 'animate-spin' : ''}`}
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
      <div
        className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain"
        ref={scrollContainerRef}
      >
        {isCurrentTabLoading && displayedPlayers.length === 0 && !usersError ? (
          <div className="p-2">
            <PlayerListSkeleton count={5} />
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
              {usersError}
            </p>
          </div>
        ) : displayedPlayers.length === 0 && searchQuery.trim() && isPlayerSearchLoading ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-muted-foreground animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Searching players…</p>
            <p className="text-xs text-muted-foreground">Looking up matches on the server</p>
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
          <div className="p-1 space-y-1">
            {displayedPlayers.map((player, index) => (
              <div
                key={`${player.user_id}-${player.id}-${index}`}
                className="transition-all duration-500 ease-out"
                style={{
                  animationDelay: `${index * 20}ms`,
                }}
              >
                <PlayerItem
                  player={player}
                  isSelected={selectedPlayer?.user_id === player.user_id}
                  onSelect={onPlayerSelect}
                />
              </div>
            ))}

            {/* Infinite scroll trigger */}
            {activeTab === 'all-chats' && hasMorePlayers && (
              <div ref={loadMoreTriggerRef} className="py-4">
                {isLoadingMore && (
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-xs">Loading more...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
