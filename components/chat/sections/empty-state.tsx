'use client';

import { memo } from 'react';

interface EmptyStateProps {
  onlinePlayersCount: number;
}

export const EmptyState = memo(function EmptyState({ onlinePlayersCount }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-muted/20 via-transparent to-background">
      <div className="relative mb-6">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-br from-primary/15 via-primary/8 to-primary/5 flex items-center justify-center ring-8 ring-primary/5 shadow-inner">
          <svg className="w-12 h-12 md:w-14 md:h-14 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>
      <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">No Conversation Selected</h3>
      <p className="text-sm md:text-base text-muted-foreground max-w-sm mb-6 leading-relaxed">
        Choose a player from the list to start messaging and provide support
      </p>
      <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span>{onlinePlayersCount} PLAYERS ONLINE</span>
      </div>
    </div>
  );
});
