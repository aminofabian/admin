'use client';

import type { ChatUser } from '@/types';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: ChatUser | null;
}

export function NotesDrawer({
  isOpen,
  onClose,
  selectedPlayer,
}: NotesDrawerProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9998] bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <h3 className="text-lg font-semibold">Player Notes</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {selectedPlayer ? (
            <div className="space-y-4">
              {/* Player Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {selectedPlayer.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{selectedPlayer.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedPlayer.email}</p>
                </div>
              </div>

              {/* Notes Content */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Notes
                </label>
                {selectedPlayer.notes ? (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {selectedPlayer.notes}
                    </p>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <svg className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-muted-foreground">No notes available for this player</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="w-16 h-16 text-muted-foreground/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <p className="text-sm text-muted-foreground">No player selected</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
