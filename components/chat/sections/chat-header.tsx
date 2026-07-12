'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { IdentityVerifiedTick } from '@/components/chat/components/identity-verified-tick';
import { Skeleton } from '@/components/ui';
import { TOKEN_KEY } from '@/lib/constants/api';
import { isPlayerIdentityVerified } from '@/lib/players/player-verification';
import { formatChatTimestampCompact } from '@/lib/utils/formatters';
import { storage } from '@/lib/utils/storage';
import type { ChatUser, Player } from '@/types';

interface ChatHeaderProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  connectionError: string | null;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  onOpenNotesDrawer: () => void;
  playerLastSeenAt?: string | null;
  /** Called when identity status is resolved from player details (list API may omit it). */
  onIdentityVerifiedResolved?: (userId: number, isIdentityVerified: boolean) => void;
}

export const ChatHeader = memo(function ChatHeader({
  selectedPlayer,
  isConnected,
  connectionError,
  setMobileView,
  onOpenNotesDrawer,
  playerLastSeenAt,
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
    <div className="flex shrink-0 items-center justify-between border-b border-border/40 bg-card/80 px-3 py-2 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] backdrop-blur-md dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)] md:px-4 md:py-3">
      {/* Back button for mobile */}
      <button
        onClick={() => setMobileView('list')}
        className="md:hidden p-2 -ml-2 hover:bg-muted/80 rounded-lg transition-colors duration-200 mr-1 active:scale-95"
        aria-label="Back to list"
      >
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        type="button"
        onClick={() => setMobileView('info')}
        className="flex min-h-[44px] w-full min-w-0 flex-1 items-center gap-2 rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/50 dark:border-transparent dark:bg-transparent md:min-h-0"
        aria-label="Open player info"
        title="Player info"
      >
        <div className="relative shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-[10px] font-bold text-white shadow-md shadow-blue-500/20 ring-2 ring-white/20 dark:ring-white/10 md:h-8 md:w-8 md:text-xs">
            {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-card shadow-sm ${selectedPlayer.isOnline ? 'animate-pulse bg-green-500' : 'bg-red-500'}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-1">
              <span className="block min-w-0 truncate text-left font-semibold capitalize text-foreground text-xs md:text-sm">
                {selectedPlayer.username}
              </span>
              {isIdentityVerified ? <IdentityVerifiedTick /> : null}
            </span>
            {isConnected ? (
              <span className="hidden shrink-0 sm:inline-flex items-center gap-0.5 px-1.5 py-px bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[8px] font-semibold uppercase tracking-wide">
                <span className="h-1 w-1 shrink-0 rounded-full bg-green-500" />
                CONNECTED
              </span>
            ) : (
              <span className="hidden shrink-0 sm:inline-flex items-center gap-0.5 px-1.5 py-px bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[8px] font-semibold uppercase tracking-wide">
                <span className="h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                CONNECTING
              </span>
            )}
          </div>
          <div className="flex min-h-[1rem] items-center truncate text-[10px] text-muted-foreground">
            {connectionError
              ? `Error: ${connectionError}`
              : selectedPlayer.isOnline
                ? 'Active now'
                : lastSeenTime != null
                  ? `Last seen ${formatChatTimestampCompact(lastSeenTime)}`
                  : <Skeleton className="h-3 w-24" />}
          </div>
        </div>
      </button>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={onOpenNotesDrawer}
          className="relative p-2 hover:bg-muted/80 rounded-lg transition-colors duration-200 active:scale-95" 
          aria-label="View Notes"
          title="View player notes"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {hasNotes && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-card shadow-sm" />
          )}
        </button>
      </div>
    </div>
  );
});
