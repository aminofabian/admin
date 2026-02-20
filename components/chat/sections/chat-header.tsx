'use client';

import { memo, useMemo } from 'react';
import { Skeleton } from '@/components/ui';
import { formatChatTimestamp } from '@/lib/utils/formatters';
import type { ChatUser } from '@/types';

interface ChatHeaderProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  connectionError: string | null;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  onNavigateToPlayer: () => void;
  onOpenNotesDrawer: () => void;
  playerLastSeenAt?: string | null;
}

export const ChatHeader = memo(function ChatHeader({
  selectedPlayer,
  isConnected,
  connectionError,
  setMobileView,
  onNavigateToPlayer,
  onOpenNotesDrawer,
  playerLastSeenAt,
}: ChatHeaderProps) {
  // Use only actual last-seen data; do not show last message time as "last seen"
  const lastSeenTime = playerLastSeenAt ?? selectedPlayer.playerLastSeenAt ?? null;

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
  return (
    <div className="px-3 py-2 md:px-4 md:py-3 border-b border-border/40 flex items-center justify-between bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_0_0_rgba(255,255,255,0.05)]">
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
      
      <div className="flex items-center gap-2 flex-1 min-w-0 rounded-lg border border-border/70 dark:border-transparent bg-muted/20 dark:bg-transparent px-2 py-1.5">
        <div className="relative flex-shrink-0">
          <button
            onClick={onNavigateToPlayer}
            className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] md:text-xs font-bold shadow-md shadow-blue-500/20 ring-2 ring-white/20 dark:ring-white/10 hover:ring-2 hover:ring-primary/40 transition-all duration-200 cursor-pointer active:scale-95"
            title="View player profile"
          >
            {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
          </button>
          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-card shadow-sm ${selectedPlayer.isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToPlayer}
              className="font-semibold text-foreground text-xs md:text-sm truncate hover:text-primary transition-colors cursor-pointer"
              title="View player profile"
            >
              <span className="capitalize">{selectedPlayer.username}</span>
            </button>
            {isConnected ? (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-px bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[8px] font-semibold uppercase tracking-wide">
                <span className="w-1 h-1 bg-green-500 rounded-full shrink-0" />
                CONNECTED
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-px bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-[8px] font-semibold uppercase tracking-wide">
                <span className="w-1 h-1 bg-amber-500 rounded-full shrink-0" />
                CONNECTING
              </span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate min-h-[1rem] flex items-center">
            {connectionError
              ? `Error: ${connectionError}`
              : selectedPlayer.isOnline
                ? 'Active now'
                : lastSeenTime != null
                  ? `Last seen ${formatChatTimestamp(lastSeenTime)}`
                  : <Skeleton className="h-3 w-24" />}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={() => setMobileView('info')}
          className="md:hidden p-2 hover:bg-muted/80 rounded-lg transition-colors duration-200 active:scale-95"
          aria-label="View info"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
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
