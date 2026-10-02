'use client';

import { memo, useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui';
import { PlayerListSkeleton } from '../skeletons';
import { formatChatTimestampCompact } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';
import { conversationPreviewText } from '@/lib/chat/apply-chat-message-event';
import {
  isAutoMessage,
  isPurchaseNotification,
  isPrizeWheelMessage,
  isKycVerificationMessage,
  formatTransactionMessage,
  prepareChatMessageHtmlForDisplay,
  stripHtml as stripHtmlForPreview,
} from '../utils/message-helpers';
import { sanitizeChatHtml } from '@/lib/chat/sanitize-chat-html';
import { PlayerAvatar } from '../components/player-avatar';

// Strip HTML for preview text. Shared implementation lives in
// `../utils/message-helpers` — see the note there on why it uses DOMParser
// rather than assigning `innerHTML`.
const stripHtml = stripHtmlForPreview;

const MAX_UNREAD_BADGE_COUNT = 99;

/** Renders the matched run of a search term in the primary colour. */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const index = text.toLowerCase().indexOf(query);
  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[2px] bg-primary/20 px-px font-bold text-primary">
        {text.slice(index, index + query.length)}
      </mark>
      {text.slice(index + query.length)}
    </>
  );
}

//  Memoized player item component to prevent unnecessary re-renders
interface PlayerItemProps {
  player: ChatUser;
  isSelected: boolean;
  searchQuery: string;
  /** True when this row belongs to a stale (in-flight) result set. */
  isDimmed?: boolean;
  onSelect: (player: ChatUser) => void;
}

const PlayerItem = memo(function PlayerItem({ player, isSelected, searchQuery, isDimmed = false, onSelect }: PlayerItemProps) {
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
      // Row of a single-select listbox (see PlayerListSidebar).
      role="option"
      aria-selected={isSelected}
      type="button"
      className={`w-full p-1.5 md:p-2 transition-all duration-200 ease-out group relative border-b border-border/30 last:border-b-0 dark:border-transparent cursor-pointer ${isSelected
        ? 'bg-primary/10 border-l-2 border-l-primary'
        : 'border-l-2 border-l-transparent hover:bg-muted/60 hover:border-l-primary/30 active:scale-[0.998] dark:hover:bg-muted/40'
        } ${isNewMessage ? 'bg-primary/5 animate-new-message-pulse' : ''
        } ${isDimmed ? 'opacity-60' : 'opacity-100'
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
            <PlayerAvatar avatarUrl={player.avatar} username={player.username} size={28} className="md:h-7 md:w-7" />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-background shadow-sm ${player.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>

        {/* Player Info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[11px] md:text-xs font-semibold truncate transition-colors duration-200 capitalize ${isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary/80'
              } ${isNewMessage ? 'text-primary font-bold' : ''
              }`}>
              {player.username && <HighlightedText text={player.username} query={searchQuery} />}
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
            const isPrizeWheel = isPrizeWheelMessage(mockMessage);
            const isKyc = isKycVerificationMessage(mockMessage);

            if (isKyc) {
              return (
                <p
                  className={`text-[10px] truncate mt-0 transition-all duration-200 ${isNewMessage ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-muted-foreground/90'
                    }`}
                >
                  Identity Verification
                </p>
              );
            }
            if (isAuto || isPurchase || isPrizeWheel) {
              // Format the transaction message
              const formatted = formatTransactionMessage(mockMessage as { text: string; type?: string });

              // For preview, we only want the first line (the action itself)
              // Split by newline or <br> tags to be safe
              const previewText = formatted.split(/\n|<br\s*\/?>/i)[0];

              return (
                <p
                  className={`text-[10px] truncate mt-0 transition-all duration-200 ${isNewMessage ? 'text-foreground font-medium' : 'text-muted-foreground group-hover:text-muted-foreground/90'
                    }`}
                  dangerouslySetInnerHTML={{ __html: sanitizeChatHtml(previewText) }}
                />
              );
            }

            const plainText = conversationPreviewText({
              id: player.id,
              text: stripHtml(prepareChatMessageHtmlForDisplay(player.lastMessage)),
              timestamp: player.lastMessageTime || '',
            });
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
    prevProps.isDimmed === nextProps.isDimmed &&
    prevProps.searchQuery === nextProps.searchQuery &&
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
  /**
   * True when the visible rows belong to an earlier query and a newer one is
   * still loading. The list is dimmed rather than emptied so it does not flash.
   */
  isPlayerSearchStale?: boolean;
  /** Characters still required before a search is sent (query too short). */
  searchCharactersRemaining?: number;
  /** Lowercased search text, used to highlight the matched run in each row. */
  searchQueryNormalized?: string;
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
  isPlayerSearchStale = false,
  searchCharactersRemaining = 0,
  searchQueryNormalized = '',
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

  // Refs for infinite scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const hasSearchQuery = searchQuery.trim().length > 0;
  const isQueryTooShort = hasSearchQuery && searchCharactersRemaining > 0;

  // "/" focuses search from anywhere in the panel, Escape clears it — the
  // keyboard path an operator uses dozens of times a shift.
  useEffect(() => {
    const container = scrollContainerRef.current?.parentElement;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'Escape' && document.activeElement === searchInputRef.current) {
        event.preventDefault();
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [setSearchQuery]);

  // A new query means the old scroll offset points at the wrong rows.
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [searchQueryNormalized]);

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
      <div className="border-b border-border/50 p-1.5 md:p-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search players…  ( / )"
            aria-label="Search players"
            aria-describedby="player-search-hint"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className={`rounded-md border-transparent bg-muted/50 py-1 pl-8 text-sm shadow-sm transition-all focus:border-primary focus:bg-background dark:bg-muted/30 ${
              isPlayerSearchLoading ? 'pr-14' : hasSearchQuery ? 'pr-7' : 'pr-2'
            }`}
          />

          {/* Spinner replaces the clear button while a request is in flight. */}
          {isPlayerSearchLoading ? (
            <span
              className="absolute right-2 top-1/2 -translate-y-1/2"
              role="status"
              aria-live="polite"
            >
              <svg
                className="h-3.5 w-3.5 animate-spin text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="sr-only">Searching players</span>
            </span>
          ) : hasSearchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              aria-label="Clear search"
              title="Clear search"
              className="absolute right-1.5 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <svg
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        {/* Live count / hint line. Reserves no height when idle to avoid
            shifting the list on every keystroke. */}
        <div id="player-search-hint" aria-live="polite" className="min-h-0">
          {isQueryTooShort ? (
            <p className="px-0.5 pt-1 text-[10px] text-muted-foreground">
              Type {searchCharactersRemaining} more character{searchCharactersRemaining > 1 ? 's' : ''} to search
            </p>
          ) : isPlayerSearchLoading ? (
            <p className="px-0.5 pt-1 text-[10px] text-muted-foreground">Searching all players…</p>
          ) : isPlayerSearchStale ? (
            <p className="px-0.5 pt-1 text-[10px] text-muted-foreground">Updating results…</p>
          ) : hasSearchQuery ? (
            <p className="px-0.5 pt-1 text-[10px] text-muted-foreground">
              {displayedPlayers.length} {displayedPlayers.length === 1 ? 'match' : 'matches'}
            </p>
          ) : null}
        </div>
      </div>

      {/* Tabs: counts only (no icons); refresh beside strip */}
      <div className="border-b border-border/40 px-1.5 pb-1 pt-1 md:px-2">
        <div className="flex items-stretch gap-0.5">
          <div
            role="tablist"
            aria-label="Player list filter"
            className="flex min-w-0 flex-1 gap-0.5 rounded-md bg-muted/40 p-0.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'online'}
              onClick={() => setActiveTab('online')}
              title="Players connected right now"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0 rounded px-0.5 py-1 leading-none transition-all duration-200 ${activeTab === 'online'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
            >
              <span className="text-[11px] font-bold tabular-nums md:text-xs">{onlinePlayersCount}</span>
              <span
                className={`mt-0.5 text-[6px] font-semibold uppercase tracking-wide md:text-[7px] ${activeTab === 'online' ? 'text-primary-foreground/90' : ''
                  }`}
              >
                Online
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'all-chats'}
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
        // The rows are a single-select list: announcing N anonymous buttons with
        // no selected state gave a screen reader no way to know who was open.
        role="listbox"
        aria-label="Players"
        tabIndex={0}
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
        ) : displayedPlayers.length === 0 && isQueryTooShort ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">Keep typing</p>
            <p className="max-w-[14rem] text-xs text-muted-foreground">
              Search matches on username, name, email, phone or player ID
            </p>
          </div>
        ) : displayedPlayers.length === 0 && hasSearchQuery && isPlayerSearchLoading ? (
          /* Skeleton rows rather than a full-panel spinner: the list keeps its
             shape, so nothing jumps when results land. */
          <div className="space-y-1 p-1" aria-busy="true" aria-live="polite">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-1.5 rounded-md p-1.5 md:p-2"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-muted md:h-7 md:w-7" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-4/5 animate-pulse rounded bg-muted/60" />
                </div>
              </div>
            ))}
            <span className="sr-only">Searching players</span>
          </div>
        ) : displayedPlayers.length === 0 && hasSearchQuery ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">No players found</p>
            <p className="max-w-[14rem] text-xs text-muted-foreground">
              No match for “{searchQuery.trim()}”. Try a different name, email or player ID.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-3 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {displayedPlayers.map((player) => (
              <PlayerItem
                key={`${player.user_id}-${player.id}`}
                player={player}
                isSelected={selectedPlayer?.user_id === player.user_id}
                isDimmed={isPlayerSearchStale}
                searchQuery={hasSearchQuery ? searchQueryNormalized : ''}
                onSelect={onPlayerSelect}
              />
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
