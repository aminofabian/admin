'use client';

import { useCallback, useRef, useState } from 'react';

export interface ConversationDraft {
  text: string;
  file: File | null;
  previewUrl: string | null;
}

const EMPTY_DRAFT: ConversationDraft = { text: '', file: null, previewUrl: null };

const isEmpty = (draft: ConversationDraft) =>
  !draft.text && !draft.file && !draft.previewUrl;

/**
 * Text drafts are mirrored into `sessionStorage` so an accidental refresh does
 * not lose half a reply. Session scope (not local) keeps stale drafts from
 * resurfacing days later and from leaking between operators on a shared
 * machine; the namespace is the signed-in admin id. File attachments cannot be
 * serialised and stay in memory only.
 */
const storageKey = (scope: string, userId: number) =>
  `chat-draft:${scope}:${userId}`;

function readStoredText(scope: string, userId: number): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.sessionStorage.getItem(storageKey(scope, userId)) ?? '';
  } catch {
    return '';
  }
}

function writeStoredText(scope: string, userId: number | null, text: string) {
  if (typeof window === 'undefined' || userId === null) return;
  try {
    if (text) {
      window.sessionStorage.setItem(storageKey(scope, userId), text);
    } else {
      window.sessionStorage.removeItem(storageKey(scope, userId));
    }
  } catch {
    // Private mode / quota: drafts still work in memory.
  }
}

/**
 * Per-conversation composer state.
 *
 * The composer used to hold one shared `messageInput` / `selectedImage` pair
 * that survived a conversation switch. An agent who typed half a refund
 * explanation to player A, clicked player B to check a balance, and hit Enter
 * sent A's context to B — in a tool that performs balance adjustments, that is
 * a serious mistake rather than a cosmetic one.
 *
 * Each conversation now keeps its own draft, restored when the agent returns to
 * it, and the outgoing draft is preserved on the way out.
 */
export function useConversationDrafts(namespace?: string | number) {
  const scope = namespace === undefined ? 'default' : String(namespace);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ConversationDraft>(EMPTY_DRAFT);

  /** Drafts for conversations that are not currently open. */
  const draftsRef = useRef<Map<number, ConversationDraft>>(new Map());
  /** Mirror of `activeUserId` so the stable callbacks can address storage. */
  const activeUserIdRef = useRef<number | null>(null);

  /**
   * Point the composer at a conversation.
   *
   * The current draft is written back under the conversation being left, and
   * the incoming conversation's saved draft is restored (or cleared).
   */
  const openConversation = useCallback((userId: number | null) => {
    activeUserIdRef.current = userId;
    setActiveUserId((previousId) => {
      if (previousId === userId) return previousId;

      setDraft((current) => {
        // Persist whatever is in the composer for the conversation we are leaving.
        if (previousId !== null && !isEmpty(current)) {
          draftsRef.current.set(previousId, current);
        } else if (previousId !== null) {
          draftsRef.current.delete(previousId);
        }

        if (userId === null) return EMPTY_DRAFT;
        const inMemory = draftsRef.current.get(userId);
        if (inMemory) return inMemory;

        // Restore a text draft from the previous page lifetime, if any.
        const stored = readStoredText(scope, userId);
        if (!stored) return EMPTY_DRAFT;
        const restored = { ...EMPTY_DRAFT, text: stored };
        draftsRef.current.set(userId, restored);
        return restored;
      });

      return userId;
    });
  }, [scope]);

  const setText = useCallback((text: string) => {
    setDraft((prev) => ({ ...prev, text }));
    writeStoredText(scope, activeUserIdRef.current, text);
  }, [scope]);

  const setFile = useCallback((file: File | null, previewUrl: string | null) => {
    setDraft((prev) => ({ ...prev, file, previewUrl }));
  }, []);

  /** Clear the composer, for the conversation currently open. */
  const clearDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
    writeStoredText(scope, activeUserIdRef.current, '');
  }, [scope]);

  /** Remove every saved draft (used when a conversation is closed for good). */
  const discardDraft = useCallback((userId: number) => {
    draftsRef.current.delete(userId);
    writeStoredText(scope, userId, '');
  }, [scope]);

  return {
    activeUserId,
    text: draft.text,
    file: draft.file,
    previewUrl: draft.previewUrl,
    openConversation,
    setText,
    setFile,
    clearDraft,
    discardDraft,
  };
}
