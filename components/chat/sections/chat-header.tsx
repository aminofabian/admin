'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { IdentityVerifiedTick } from '@/components/chat/components/identity-verified-tick';
import { Skeleton } from '@/components/ui';
import { TOKEN_KEY } from '@/lib/constants/api';
import { isPlayerIdentityVerified } from '@/lib/players/player-verification';
import { formatChatTimestampCompact } from '@/lib/utils/formatters';
import { storage } from '@/lib/utils/storage';
import type { ChatUser, Player } from '@/types';
import { PlayerAvatar } from '../components/player-avatar';

interface ChatHeaderProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  connectionError: string | null;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  /** Returns to the list and removes this conversation from the URL. */
  onCloseConversation: () => void;
  onOpenNotesDrawer: () => void;
  playerLastSeenAt?: string | null;
  /** Live socket membership: this chat is waiting for a human reply. */
  isUnreplied?: boolean;
  /** Called when identity status is resolved from player details (list API may omit it). */
  onIdentityVerifiedResolved?: (userId: number, isIdentityVerified: boolean) => void;
}

export const ChatHeader = memo(function ChatHeader({
  selectedPlayer,
  isConnected,
  connectionError,
  setMobileView,
  onCloseConversation,
  onOpenNotesDrawer,
  playerLastSeenAt,
  isUnreplied = false,
  onIdentityVerifiedResolved,
}: ChatHeaderProps) {
  // Use only actual last-seen data; do not show last message time as "last seen"
  const lastSeenTime = playerLastSeenAt ?? selectedPlayer.playerLastSeenAt ?? null;
  const [fetchedVerified, setFetchedVerified] = useState<boolean | null>(null);

  // Check for notes in selectedPlayer or localStorage as fallback
  const hasNotes = useMemo(() => {
    if (selectedPlayer?.notes && selectedPlayer.notes.trim()) {
      return true;
    }
    // Fallback: check localStorage
    if (selectedPlayer?.user_id && typeof window !== 'undefined') {
      const storageKey = `player_notes_${selectedPlayer.user_id}`;
      const storedNotes = localStorage.getItem(storageKey);
      return !!(storedNotes && storedNotes.trim());
    }
    return false;
  }, [selectedPlayer?.notes, selectedPlayer?.user_id]);

  useEffect(() => {
    setFetchedVerified(null);

    if (selectedPlayer.isIdentityVerified === true || selectedPlayer.isIdentityVerified === false) {
      return;
    }

    const userId = selectedPlayer.user_id;
    if (!userId) return;

    let cancelled = false;

    const enrichIdentity = async () => {
      try {
        const token = storage.get(TOKEN_KEY);
        const response = await fetch(`/api/player-details/${userId}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        if (!response.ok || cancelled) return;

        const data = (await response.json()) as { player?: Player } & Player;
        const player = (data.player ?? data) as Player;
        const verified = isPlayerIdentityVerified(player);
        if (cancelled) return;

        setFetchedVerified(verified);
        onIdentityVerifiedResolved?.(userId, verified);
      } catch {
        // Leave badge hidden if enrichment fails
      }
    };

    void enrichIdentity();

    return () => {
      cancelled = true;
    };
  }, [
    selectedPlayer.user_id,
    selectedPlayer.isIdentityVerified,
    onIdentityVerifiedResolved,
  ]);

  const isIdentityVerified =
    selectedPlayer.isIdentityVerified === true || fetchedVerified === true;

  return (
    <div className="flex shrink-0 items-center gap-1.5 border-b border-border/50 bg-card/90 px-2 py-2 backdrop-blur-md md:gap-2 md:px-4 md:py-3">
      {/* Back button for mobile */}
      <button
        onClick={onCloseConversation}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 md:hidden"
        aria-label="Back to list"
        type="button"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setMobileView('info')}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1 text-left transition-colors hover:bg-muted/50 md:min-h-0"
        aria-label="Open player info"
        title="Player info"
      >
        <div className="relative shrink-0">
          <PlayerAvatar
            avatarUrl={selectedPlayer.avatar}
            username={selectedPlayer.username}
            size={40}
            className="h-10 w-10 text-sm ring-2 ring-background shadow-sm"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
              selectedPlayer.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="block min-w-0 truncate text-left text-[15px] font-semibold capitalize leading-tight text-foreground">
                {selectedPlayer.username}
              </span>
              {isIdentityVerified ? <IdentityVerifiedTick /> : null}
            </span>
            {isUnreplied ? (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unreplied
              </span>
            ) : null}
            {isConnected ? (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live
              </span>
            ) : (
              <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-amber-600 dark:text-amber-400 sm:inline-flex">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                Connecting
              </span>
            )}
          </div>

          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] leading-tight">
            {connectionError?.includes('Session expired') ? (
              <span className="truncate font-medium text-red-600 dark:text-red-400">Session expired, please log in again</span>
            ) : connectionError?.includes('Connection lost') ? (
              <span className="truncate font-medium text-amber-600 dark:text-amber-400">Connection lost, reconnecting…</span>
            ) : !isConnected ? (
              <span className="truncate text-muted-foreground">Loading chats…</span>
            ) : selectedPlayer.isOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                <span className="truncate font-medium text-emerald-600 dark:text-emerald-400">Active now</span>
              </>
            ) : lastSeenTime != null ? (
              <span className="truncate text-muted-foreground">
                Last seen {formatChatTimestampCompact(lastSeenTime)}
              </span>
            ) : (
              <Skeleton className="h-3 w-24" />
            )}
          </div>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-0.5 md:gap-1">
        <button
          type="button"
          onClick={onOpenNotesDrawer}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95"
          aria-label="View Notes"
          title="View player notes"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {hasNotes && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border border-card bg-red-500" />
          )}
        </button>
        <button
          type="button"
          onClick={onCloseConversation}
          className="hidden h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 md:inline-flex"
          aria-label="Close conversation"
          title="Close conversation"
        >
          <svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
});
