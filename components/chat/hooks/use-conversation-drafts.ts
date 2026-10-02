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
export function useConversationDrafts() {
  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ConversationDraft>(EMPTY_DRAFT);

  /** Drafts for conversations that are not currently open. */
  const draftsRef = useRef<Map<number, ConversationDraft>>(new Map());

  /**
   * Point the composer at a conversation.
   *
   * The current draft is written back under the conversation being left, and
   * the incoming conversation's saved draft is restored (or cleared).
   */
  const openConversation = useCallback((userId: number | null) => {
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
        return draftsRef.current.get(userId) ?? EMPTY_DRAFT;
      });

      return userId;
    });
  }, []);

  const setText = useCallback((text: string) => {
    setDraft((prev) => ({ ...prev, text }));
  }, []);

  const setFile = useCallback((file: File | null, previewUrl: string | null) => {
    setDraft((prev) => ({ ...prev, file, previewUrl }));
  }, []);

  /** Clear the composer, for the conversation currently open. */
  const clearDraft = useCallback(() => {
    setDraft(EMPTY_DRAFT);
  }, []);

  /** Remove every saved draft (used when a conversation is closed for good). */
  const discardDraft = useCallback((userId: number) => {
    draftsRef.current.delete(userId);
  }, []);

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
