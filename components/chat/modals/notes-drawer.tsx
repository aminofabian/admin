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
  onNotesSaved?: (savedNotes: string) => void;
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
  // Priority: selectedPlayer.notes > localStorage > notes prop (WebSocket)
  useEffect(() => {
    if (isOpen && selectedPlayer) {
      // First check selectedPlayer.notes (most up-to-date)
      let notesToUse = selectedPlayer.notes;
      
      // Fallback to localStorage if selectedPlayer doesn't have notes
      if (!notesToUse || !notesToUse.trim()) {
        const storageKey = `player_notes_${selectedPlayer.user_id}`;
        const storedNotes = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
        if (storedNotes) {
          notesToUse = storedNotes;
        }
      }
      
      // Final fallback to notes prop from WebSocket
      if (!notesToUse || !notesToUse.trim()) {
        notesToUse = notes;
      }
      
      setEditedNotes(notesToUse || '');
    }
  }, [isOpen, notes, selectedPlayer?.notes, selectedPlayer?.user_id]);

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
      
      // Store notes in localStorage as fallback (or remove if empty)
      if (selectedPlayer?.user_id) {
        const storageKey = `player_notes_${selectedPlayer.user_id}`;
        if (editedNotes.trim()) {
          storage.set(storageKey, editedNotes);
        } else {
          storage.remove(storageKey);
        }
      }

      // Notify parent component to refresh notes with the saved notes
      // This will update selectedPlayer.notes immediately
      if (onNotesSaved) {
        onNotesSaved(editedNotes);
      }

      // Force a re-sync of editedNotes to ensure UI reflects the saved state
      // This handles the case where selectedPlayer.notes hasn't updated yet
      setEditedNotes(editedNotes);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayer, editedNotes, addToast, onNotesSaved]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className="fixed inset-y-0 right-0 z-[60] w-full sm:max-w-lg bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl transition-transform duration-300 ease-in-out transform translate-x-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between z-10 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Player Notes</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Add private notes about this player</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-xl transition-all duration-200 hover:rotate-90 disabled:opacity-50"
              disabled={isSavingNotes}
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24 md:pb-6">
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
                  autoComplete="off"
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

          {/* Drawer Footer */}
          {selectedPlayer && (
            <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-end gap-3 shadow-lg">
              <Button
                variant="ghost"
                onClick={() => setEditedNotes('')}
                disabled={isSavingNotes}
                className="px-6 py-2.5 font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Clear
              </Button>
              <Button 
                variant="primary" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveNotes();
                }}
                disabled={isSavingNotes}
                isLoading={isSavingNotes}
                className="px-6 py-2.5 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
