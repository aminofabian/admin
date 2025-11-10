'use client';

import type { ChatUser } from '@/types';

interface ChatHeaderProps {
  selectedPlayer: ChatUser;
  isConnected: boolean;
  connectionError: string | null;
  mobileView: 'list' | 'chat' | 'info';
  setMobileView: (view: 'list' | 'chat' | 'info') => void;
  onNavigateToPlayer: () => void;
  onOpenNotesDrawer: () => void;
}

export function ChatHeader({
  selectedPlayer,
  isConnected,
  connectionError,
  mobileView,
  setMobileView,
  onNavigateToPlayer,
  onOpenNotesDrawer,
}: ChatHeaderProps) {
  return (
    <div className="px-4 py-3 md:px-6 md:py-4 border-b border-border/50 flex items-center justify-between bg-gradient-to-r from-card via-card/95 to-card/90 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
      {/* Back button for mobile */}
      <button
        onClick={() => setMobileView('list')}
        className="md:hidden p-2 -ml-2 hover:bg-muted rounded-lg transition-colors mr-1"
        aria-label="Back to list"
      >
        <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <button
            onClick={onNavigateToPlayer}
            className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-sm md:text-base font-bold shadow-md ring-2 ring-primary/10 hover:ring-4 hover:ring-primary/20 transition-all cursor-pointer"
            title="View player profile"
          >
            {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
          </button>
          {selectedPlayer.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-card animate-pulse shadow-sm" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToPlayer}
              className="font-semibold text-foreground text-sm md:text-base truncate hover:text-primary transition-colors cursor-pointer"
              title="View player profile"
            >
              {selectedPlayer.username}
            </button>
            {isConnected ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Connected
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-medium">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                Connecting...
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {connectionError ? `Error: ${connectionError}` : selectedPlayer.isOnline ? 'Active now' : `Last seen ${selectedPlayer.lastMessageTime || 'recently'}`}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        <button 
          onClick={() => setMobileView('info')}
          className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label="View info"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button 
          onClick={onOpenNotesDrawer}
          className="hidden md:flex p-2 hover:bg-muted rounded-lg transition-colors" 
          aria-label="View Notes"
          title="View player notes"
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button className="hidden md:flex p-2 hover:bg-muted rounded-lg transition-colors" aria-label="More options">
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
