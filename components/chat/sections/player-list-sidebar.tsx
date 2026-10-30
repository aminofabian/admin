'use client';

import { memo, useRef, useEffect, useState, useMemo } from 'react';
import { Input } from '@/components/ui';
import { PlayerListSkeleton } from '../skeletons';
import { formatChatTimestampCompact } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';
import { conversationPreviewText } from '@/lib/chat/apply-chat-message-event';
import {
  prepareChatMessageHtmlForDisplay,
  stripHtml as stripHtmlForPreview,
} from '../utils/message-helpers';
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
  /** Cross-tab triage hint: this chat is still waiting for a human reply. */
  showUnrepliedDot?: boolean;
  onSelect: (player: ChatUser) => void;
}

const PlayerItem = memo(function PlayerItem({ player, isSelected, searchQuery, isDimmed = false, showUnrepliedDot = false, onSelect }: PlayerItemProps) {
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

  const previewClass = `truncate text-[12px] leading-snug transition-colors duration-200 ${
    isNewMessage ? 'font-medium text-foreground' : 'text-muted-foreground'
  }`;

  return (
    <button
      ref={itemRef}
      onClick={() => onSelect(player)}
      // Row of a single-select listbox (see PlayerListSidebar).
      role="option"
      aria-selected={isSelected}
      type="button"
      className={`group relative flex w-full min-w-0 items-start gap-2.5 rounded-xl px-2 py-2 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${isSelected
        ? 'bg-primary/[0.08] ring-1 ring-inset ring-primary/20'
        : 'hover:bg-background/80'
        } ${isNewMessage ? 'bg-primary/[0.06]' : ''} ${isDimmed ? 'opacity-60' : 'opacity-100'
        }`}
    >
      {/* New Message Indicator - Glowing bar on the left */}
      {isNewMessage && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-sm shadow-primary/40 animate-message-glow"
        />
      )}

      {/* Avatar + presence */}
      <div className="relative shrink-0">
        <PlayerAvatar
          avatarUrl={player.avatar}
          username={player.username}
          size={36}
          className="h-9 w-9 text-xs transition-transform duration-200 group-hover:scale-[1.03]"
        />
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
            player.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        />
      </div>

      {/* Player Info */}
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-baseline justify-between gap-2">
          <p
            className={`truncate text-[13px] font-semibold capitalize leading-tight ${
              isSelected ? 'text-primary' : 'text-foreground'
            }`}
          >
            {player.username && <HighlightedText text={player.username} query={searchQuery} />}
          </p>
          <span className="flex shrink-0 items-center gap-1.5">
            {showUnrepliedDot && player.isUnreplied ? (
              <span
                className="h-1.5 w-1.5 rounded-full bg-amber-500"
                title="Waiting for a reply"
                aria-label="Waiting for a reply"
              />
            ) : null}
            {player.lastMessageTime && (
              <span
                className={`text-[10px] font-medium leading-tight tabular-nums ${
                  isNewMessage ? 'text-primary' : 'text-muted-foreground/80'
                }`}
              >
                {formatChatTimestampCompact(player.lastMessageTime)}
              </span>
            )}
          </span>
        </div>

        <div className="mt-1 flex min-h-4 items-center gap-2">
          <div className="min-w-0 flex-1">
            {player.lastMessage && (() => {
              const plainText = conversationPreviewText({
                id: player.id,
                text: stripHtml(prepareChatMessageHtmlForDisplay(player.lastMessage)),
                timestamp: player.lastMessageTime || '',
              });
              if (!plainText) return null;
              return <p className={previewClass}>{plainText}</p>;
            })()}
          </div>

          {unreadCount > 0 && (
            <span
              className={`inline-flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold leading-none text-primary-foreground shadow-sm shadow-primary/25 ${
                isNewMessage ? 'animate-badge-pop' : ''
              }`}
              aria-label={`${unreadCount} unread`}
            >
              {unreadBadgeValue}
            </span>
          )}
        </div>
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
    prevProps.player.isUnreplied === nextProps.player.isUnreplied &&
    prevProps.showUnrepliedDot === nextProps.showUnrepliedDot &&
    prevProps.player.lastMessage === nextProps.player.lastMessage &&
    prevProps.player.lastMessageTime === nextProps.player.lastMessageTime &&
    prevProps.player.username === nextProps.player.username &&
    prevProps.player.avatar === nextProps.player.avatar
  );
});

function TabCount({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span
        className="inline-block h-3.5 w-5 animate-pulse rounded bg-current opacity-30"
        aria-hidden
      />
    );
  }
  return (
    <span className="text-[13px] font-bold leading-none tabular-nums">{value}</span>
  );
}

interface PlayerListSidebarProps {
  mobileView: 'list' | 'chat' | 'info';
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  activeTab: 'online' | 'all-chats' | 'unreplied';
  /** Clears search when the tab actually changes so filters do not leak across lists. */
  setActiveTab: (tab: 'online' | 'all-chats' | 'unreplied') => void;
  displayedPlayers: ChatUser[];
  selectedPlayer: ChatUser | null;
  onlinePlayersCount: number | null;
  activeChatsCount: number | null;
  /** Chats the server flags `is_unreplied` (socket-driven). */
  unrepliedCount?: number | null;
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
  /** True while the active tab's manual refresh is in flight. */
  isRefreshingPlayers: boolean;
  /** Unreplied is socket-driven, so it has no REST source to refresh. */
  refreshDisabled?: boolean;
  /** Tooltip / accessible name for the refresh button, per active tab. */
  refreshTitle: string;
  isLoadingMore: boolean;
  hasMorePlayers: boolean;
  usersError: string | null;
  onPlayerSelect: (player: ChatUser) => void;
  onRefreshPlayers: () => void;
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
  unrepliedCount = null,
  directoryAllPlayersCount = null,
  playersWithChatsTotalCount,
  isCurrentTabLoading,
  isPlayerSearchLoading = false,
  isPlayerSearchStale = false,
  searchCharactersRemaining = 0,
  searchQueryNormalized = '',
  isRefreshingPlayers,
  refreshDisabled = false,
  refreshTitle,
  isLoadingMore,
  hasMorePlayers,
  usersError,
  onPlayerSelect,
  onRefreshPlayers,
  onLoadMore,
}: PlayerListSidebarProps) {
  const withChatsDisplayCount =
    playersWithChatsTotalCount ??
    directoryAllPlayersCount ??
    (activeChatsCount != null && activeChatsCount > 0 ? activeChatsCount : null);

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

  // The three tabs share one scroller. Keeping the offset from a longer list
  // dropped agents into the middle (or past the end) of the next one.
  useEffect(() => {
    scrollContainerRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Deep links / Back / tab switches can leave the open row off-screen (or
  // newly prepended at the top). Bring it into view without yanking when it is
  // already visible.
  const selectedUserId = selectedPlayer?.user_id;
  useEffect(() => {
    if (!selectedUserId) return;
    const container = scrollContainerRef.current;
    const row = container?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    if (!container || !row) return;
    // Scroll only this list. scrollIntoView also scrolls the page, which
    // makes the highlight travel upward and then stop.
    const c = container.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < c.top) {
      container.scrollTop -= c.top - r.top;
    } else if (r.bottom > c.bottom) {
      container.scrollTop += r.bottom - c.bottom;
    }
  }, [selectedUserId, activeTab]);

  /** Move DOM focus to a row and keep it in view. */
  const focusRowAt = (index: number) => {
    const container = scrollContainerRef.current;
    if (!container) return false;
    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    );
    if (options.length === 0) return false;
    const target = options[Math.max(0, Math.min(index, options.length - 1))];
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ block: 'nearest' });
    return true;
  };

  /**
   * Arrow-key roving focus over the player rows.
   *
   * Opening a conversation spins up a chat socket, so arrows only move focus;
   * Enter/Space on the focused row is the deliberate "open" action. Without
   * this, reaching the 30th player meant 30 Tab presses.
   */
  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    );
    if (options.length === 0) return;

    const current = options.indexOf(document.activeElement as HTMLButtonElement);

    let next: number;
    switch (event.key) {
      case 'ArrowDown':
        next = current < 0 ? 0 : current + 1;
        break;
      case 'ArrowUp':
        next = current < 0 ? options.length - 1 : current - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    focusRowAt(next);
  };

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
      className={`${mobileView === 'list' ? 'flex' : 'hidden'} md:flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-r border-border/50 bg-muted/[0.18] md:w-60 lg:w-72`}
    >
      {/* Search Bar */}
      <div className="shrink-0 px-2 pb-1 pt-2 md:px-3 md:pt-3">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70"
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
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                focusRowAt(0);
              }
            }}
            autoComplete="off"
            spellCheck={false}
            className={`h-9 rounded-lg border-transparent bg-background/80 py-1.5 pl-9 text-[13px] shadow-sm transition-all focus:border-primary/50 focus:bg-background ${
              isPlayerSearchLoading ? 'pr-14' : hasSearchQuery ? 'pr-8' : 'pr-3'
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
            <p className="px-0.5 pt-1.5 text-[10px] text-muted-foreground">
              Type {searchCharactersRemaining} more character{searchCharactersRemaining > 1 ? 's' : ''} to search
            </p>
          ) : isPlayerSearchLoading ? (
            <p className="px-0.5 pt-1.5 text-[10px] text-muted-foreground">Searching all players…</p>
          ) : isPlayerSearchStale ? (
            <p className="px-0.5 pt-1.5 text-[10px] text-muted-foreground">Updating results…</p>
          ) : hasSearchQuery ? (
            <p className="px-0.5 pt-1.5 text-[10px] text-muted-foreground">
              {displayedPlayers.length} {displayedPlayers.length === 1 ? 'match' : 'matches'}
            </p>
          ) : null}
        </div>
      </div>

      {/* Tabs: counts only (no icons); refresh beside strip */}
      <div className="shrink-0 px-2 pb-2 md:px-3">
        <div className="flex items-stretch gap-1.5">
          <div
            role="tablist"
            aria-label="Player list filter"
            className="flex min-w-0 flex-1 items-stretch gap-1 rounded-xl bg-muted/60 p-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'online'}
              onClick={() => setActiveTab('online')}
              title="Players connected right now"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTab === 'online'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                }`}
            >
              <TabCount value={onlinePlayersCount} />
              <span
                className={`truncate text-[9px] font-semibold uppercase leading-none tracking-normal ${activeTab === 'online' ? 'text-primary-foreground/90' : ''
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
              title={
                withChatsDisplayCount == null
                  ? 'All players'
                  : `${withChatsDisplayCount} players have an active chat in the directory`
              }
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTab === 'all-chats'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                }`}
            >
              <TabCount value={withChatsDisplayCount} />
              <span
                className={`truncate text-[9px] font-semibold uppercase leading-none tracking-normal ${activeTab === 'all-chats' ? 'text-primary-foreground/90' : ''
                  }`}
              >
                All Players
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'unreplied'}
              onClick={() => setActiveTab('unreplied')}
              title="Players waiting for a human reply"
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${activeTab === 'unreplied'
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:bg-background/70 hover:text-foreground'
                }`}
            >
              <TabCount value={unrepliedCount} />
              <span
                className={`truncate text-[9px] font-semibold uppercase leading-none tracking-normal ${activeTab === 'unreplied' ? 'text-primary-foreground/90' : ''
                  }`}
              >
                Unreplied
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={onRefreshPlayers}
            disabled={refreshDisabled || isRefreshingPlayers}
            className="flex w-9 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-background/70 text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-background hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={refreshTitle}
            title={refreshTitle}
          >
            <svg
              className={`h-4 w-4 ${isRefreshingPlayers ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* A dropped socket should not blank the list the agent is working in. */}
      {usersError && displayedPlayers.length > 0 ? (
        <div className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-medium leading-snug text-amber-700 dark:text-amber-400">
          {usersError}
        </div>
      ) : null}

      {/* Player List */}
      <div
        // `overflow-anchor:none` is the safety net behind the ordering rules:
        // if a row ever does move to the top, the browser must not follow it
        // and yank the list back to the start while the agent is reading.
        className="scrollbar-smooth min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-y-contain [overflow-anchor:none]"
        ref={scrollContainerRef}
        // The rows are a single-select list: announcing N anonymous buttons with
        // no selected state gave a screen reader no way to know who was open.
        role="listbox"
        aria-label="Players"
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >
        {isCurrentTabLoading &&
        !usersError &&
        !hasSearchQuery &&
        (displayedPlayers.length === 0 || activeTab === "all-chats") ? (
          <div className="p-2" aria-busy="true" aria-live="polite">
            <PlayerListSkeleton count={6} />
            <span className="sr-only">Loading players</span>
          </div>
        ) : usersError && displayedPlayers.length === 0 ? (
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
          <div className="space-y-1.5 p-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex animate-pulse items-center gap-2.5 rounded-xl px-2 py-2"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="min-w-0 flex-1 space-y-1.5">
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
        ) : displayedPlayers.length === 0 &&
          activeTab === 'unreplied' &&
          !hasSearchQuery ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/30">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">All caught up</p>
            <p className="max-w-[14rem] text-xs text-muted-foreground">
              No player is waiting for a reply.
            </p>
          </div>
        ) : displayedPlayers.length === 0 &&
          activeTab === 'online' &&
          !hasSearchQuery ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
              <svg className="h-8 w-8 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M8.464 15.536a5 5 0 010-7.072m7.072 0a5 5 0 010 7.072M12 12h.01" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">No one is online</p>
            <p className="max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
              Players appear here as soon as they connect. Browse All Players for the full directory.
            </p>
          </div>
        ) : displayedPlayers.length === 0 && !hasSearchQuery ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted/40">
              <svg className="h-8 w-8 text-muted-foreground/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
              </svg>
            </div>
            <p className="mb-1 text-sm font-medium text-foreground">No players yet</p>
            <p className="max-w-[14rem] text-xs leading-relaxed text-muted-foreground">
              Players show up here once they start a conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {displayedPlayers.map((player) => (
              <PlayerItem
                key={player.user_id}
                player={player}
                isSelected={selectedPlayer?.user_id === player.user_id}
                isDimmed={isPlayerSearchStale}
                searchQuery={hasSearchQuery ? searchQueryNormalized : ''}
                showUnrepliedDot={activeTab !== 'unreplied'}
                onSelect={onPlayerSelect}
              />
            ))}

            {/* Infinite scroll trigger */}
            {activeTab === 'all-chats' && hasMorePlayers && (
              <div ref={loadMoreTriggerRef} className="py-1">
                {isLoadingMore && (
                  <div aria-busy="true" aria-live="polite">
                    <PlayerListSkeleton count={3} />
                    <span className="sr-only">Loading more players</span>
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
