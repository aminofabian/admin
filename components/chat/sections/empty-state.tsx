'use client';

import { memo } from 'react';

interface EmptyStateProps {
  onlinePlayersCount: number | null;
}

export const EmptyState = memo(function EmptyState({ onlinePlayersCount }: EmptyStateProps) {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center bg-gradient-to-b from-muted/25 via-transparent to-background p-6 text-center sm:p-10">
      <div className="relative mb-7">
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 via-primary/[0.08] to-transparent shadow-inner ring-1 ring-inset ring-primary/15 md:h-28 md:w-28">
          <svg className="h-11 w-11 text-primary/60 md:h-12 md:w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <div className="absolute -right-1.5 -top-1.5 flex h-9 w-9 items-center justify-center rounded-full border border-card bg-primary/10 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      <h3 className="mb-2 text-[19px] font-semibold tracking-tight text-foreground md:text-xl">
        Select a conversation
      </h3>
      <p className="mb-7 max-w-[21rem] text-[13.5px] leading-relaxed text-muted-foreground">
        Pick a player from the list to view their history and reply. Unreplied chats are waiting in the
        <span className="font-medium text-foreground"> Unreplied </span> tab.
      </p>

      {onlinePlayersCount != null ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground shadow-sm backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          {onlinePlayersCount} {onlinePlayersCount === 1 ? 'player' : 'players'} online
        </div>
      ) : null}
    </div>
  );
});
