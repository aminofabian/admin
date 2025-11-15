'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, useToast } from '@/components/ui';
import { storage } from '@/lib/utils/storage';
import { TOKEN_KEY } from '@/lib/constants/api';
import type { ChatUser } from '@/types';

interface NotesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayer: ChatUser | null;
  notes: string;
  onNotesSaved?: () => void;
}

export function NotesDrawer({
  isOpen,
  onClose,
  selectedPlayer,
  notes,
  onNotesSaved,
}: NotesDrawerProps) {
  const [editedNotes, setEditedNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const { addToast } = useToast();
  const isSavingRef = useRef(false);
  const lastToastRef = useRef<{ type: string; title: string; timestamp: number } | null>(null);

  // Sync editedNotes with notes from props when drawer opens or notes change
  useEffect(() => {
    if (isOpen) {
      setEditedNotes(notes);
    }
  }, [isOpen, notes]);

  const handleSaveNotes = useCallback(async () => {
    // Prevent double calls
    if (!selectedPlayer || isSavingNotes || isSavingRef.current) {
      return;
    }

    isSavingRef.current = true;

    const token = storage.get(TOKEN_KEY);
    if (!token) {
      isSavingRef.current = false;
      addToast({
        type: 'error',
        title: 'Authentication required',
        description: 'Please sign in again to save notes.',
      });
      return;
    }

    setIsSavingNotes(true);
    try {
      const response = await fetch('/api/admin/save-notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: editedNotes,
          player_id: selectedPlayer.user_id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMessage =
          (result && (result.message || result.detail)) ||
          'Unable to save notes right now.';
        throw new Error(errorMessage);
      }

      // Show success toast notification (prevent duplicates)
      const toastKey = 'success-notes-saved';
      const now = Date.now();
      const lastToast = lastToastRef.current;
      
      // Only show toast if it's been more than 1 second since the last identical toast
      if (!lastToast || lastToast.type !== toastKey || now - lastToast.timestamp > 1000) {
        addToast({
          type: 'success',
          title: 'NOTE SUCCESSFULLY SAVED',
          description: result?.message || 'Your notes have been saved.',
        });
        lastToastRef.current = { type: toastKey, title: 'You have successfully saved your note', timestamp: now };
      }
      
      // Notify parent component to refresh notes
      if (onNotesSaved) {
        onNotesSaved();
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to save notes',
        description,
      });
    } finally {
      setIsSavingNotes(false);
      isSavingRef.current = false;
    }
  }, [selectedPlayer, editedNotes, addToast, onNotesSaved]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9998] bg-black/50 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="absolute right-0 top-0 h-full w-full max-w-md bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-border/50 p-4 flex items-center justify-between flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto p-6">
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

              {/* Notes Editor */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-2">
                  Notes
                </label>
                <textarea
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                      e.preventDefault();
                      handleSaveNotes();
                    }
                  }}
                  placeholder="Add private notes about this player..."
                  className="w-full min-h-[200px] p-3 border border-border rounded-lg bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-muted-foreground"
                />
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

        {/* Footer with Action Buttons */}
        {selectedPlayer && (
          <div className="border-t border-border/50 p-4 flex-shrink-0">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="primary" 
                className="w-full text-sm py-2.5" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveNotes();
                }}
                disabled={isSavingNotes}
                type="button"
              >
                {isSavingNotes ? (
                  <span className="flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 mr-2 animate-spin" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path 
                        className="opacity-75" 
                        d="M4 12a8 8 0 018-8" 
                        strokeWidth="4" 
                        strokeLinecap="round"
                      />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <svg 
                      className="w-4 h-4 mr-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M5 13l4 4L19 7" 
                      />
                    </svg>
                    Save
                  </span>
                )}
              </Button>
              <Button 
                variant="secondary" 
                className="w-full text-sm py-2.5" 
                onClick={() => setEditedNotes('')}
                disabled={isSavingNotes}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
