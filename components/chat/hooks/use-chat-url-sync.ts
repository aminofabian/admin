'use client';

import { useCallback, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const CHAT_PATH = '/dashboard/chat';

/**
 * Owns the conversation URL for the chat console.
 *
 * The URL used to be read and then erased: nine separate call sites ran
 * `router.replace('/dashboard/chat')` shortly after selecting a player, and
 * nothing ever wrote the parameter. That made the URL unusable — it could not
 * describe the open conversation, could not be shared or bookmarked, and the
 * browser Back button left the console entirely rather than returning to the
 * previous conversation.
 *
 * The parameter is now *written* on selection and left in place, so:
 *  - the URL is a shareable description of the open conversation,
 *  - Back walks back through conversations the agent actually opened,
 *  - and the consuming effect still resolves a deep link on arrival.
 */
export function useChatUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  /** The conversation currently named by the URL, if any. */
  const urlPlayerId = useCallback((): number | null => {
    const raw = searchParams.get('playerId');
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  const urlUsername = useCallback((): string | null => {
    return searchParams.get('username')?.trim() || null;
  }, [searchParams]);

  /**
   * Record the open conversation in the URL.
   *
   * Uses `push` (not `replace`) so Back returns to the previous conversation,
   * which is what an operator expects when they are moving between players.
   */
  const writePlayerId = useCallback(
    (userId: number | null) => {
      const target = userId ? `${CHAT_PATH}?playerId=${userId}` : CHAT_PATH;

      // Skip the navigation when the URL already says this, so selecting the
      // same player twice does not stack history entries.
      if (pathname === CHAT_PATH && searchParams.toString() === (userId ? `playerId=${userId}` : '')) {
        return;
      }

      router.push(target, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  /**
   * Point the URL at a player the agent just clicked in the list.
   *
   * The selection effects below watch the URL, so an in-app selection has to
   * mark the id as already handled — otherwise the URL write would bounce back
   * through the deep-link resolver and re-fetch the same player.
   */
  const notePlayerSelectedInApp = useRef<number | null>(null);

  const selectPlayerInApp = useCallback(
    (userId: number) => {
      notePlayerSelectedInApp.current = userId;
      writePlayerId(userId);
    },
    [writePlayerId],
  );

  /**
   * True when the URL change that just landed was caused by an in-app
   * selection, so the deep-link effect can skip resolving it.
   */
  const consumeInAppSelection = useCallback((userId: number | null): boolean => {
    if (userId !== null && notePlayerSelectedInApp.current === userId) {
      notePlayerSelectedInApp.current = null;
      return true;
    }
    return false;
  }, []);

  return { urlPlayerId, urlUsername, writePlayerId, selectPlayerInApp, consumeInAppSelection };
}
