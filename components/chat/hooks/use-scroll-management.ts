import { useCallback, useRef, useEffect, useState } from 'react';

const LOAD_MORE_SCROLL_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 64;
const IS_PROD = process.env.NODE_ENV === 'production';

interface UseScrollManagementProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isHistoryLoadingMessages: boolean;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  selectedPlayerId: number | null;
  addToast?: (toast: { type: 'info' | 'success' | 'error' | 'warning'; title: string; description?: string }) => void;
}

interface UseScrollManagementReturn {
  isUserAtLatest: boolean;
  autoScrollEnabled: boolean;
  unseenMessageCount: number;
  scrollToLatest: (behavior?: ScrollBehavior) => void;
  setIsUserAtLatest: (value: boolean) => void;
  setAutoScrollEnabled: (value: boolean) => void;
  setUnseenMessageCount: (value: number | ((prev: number) => number)) => void;
  resetScrollState: () => void;
  handleScroll: () => void;
}

export function useScrollManagement({
  messagesContainerRef,
  isHistoryLoadingMessages,
  hasMoreHistory,
  loadOlderMessages,
  selectedPlayerId,
  addToast,
}: UseScrollManagementProps): UseScrollManagementReturn {
  const [isUserAtLatest, setIsUserAtLatest] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  
  const isAutoScrollingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isLoadingOlderMessagesRef = useRef(false);
  const pendingLoadRequestRef = useRef(false);
  const hasShownEndOfHistoryToastRef = useRef(false);
  const isPaginationModeRef = useRef(false); // Track if we're loading older messages via pagination
  const previousPlayerIdRef = useRef<number | null>(null);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) {
      !IS_PROD && console.log('⛔ scrollToLatest blocked: no container');
      return;
    }

    !IS_PROD && console.log('🎯 scrollToLatest called', {
      behavior,
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      isPaginationMode: isPaginationModeRef.current,
      isLoadingOlder: isLoadingOlderMessagesRef.current,
    });

    // ✅ CRITICAL: If called with 'auto' behavior, it's an intentional scroll to bottom
    // Clear pagination mode to allow the scroll
    if (behavior === 'auto' && isPaginationModeRef.current) {
      !IS_PROD && console.log('🔓 Clearing pagination mode for intentional scroll');
      isPaginationModeRef.current = false;
    }

    // Don't scroll if we're in pagination mode (loading older messages) for smooth scrolls
    if (isPaginationModeRef.current && behavior === 'smooth') {
      !IS_PROD && console.log('⛔ scrollToLatest blocked: in pagination mode');
      return;
    }

    // Don't scroll if user is loading older messages (near the top)
    if (isLoadingOlderMessagesRef.current) {
      !IS_PROD && console.log('⛔ scrollToLatest blocked: loading older messages');
      return;
    }

    // Check if user is near the top BUT not at the very top (scrollTop > 0)
    // If at very top (scrollTop === 0), allow scroll (initial state)
    // If near top but not at top (0 < scrollTop < threshold), prevent scroll (viewing older messages)
    const distanceFromTop = container.scrollTop;
    if (distanceFromTop > 0 && distanceFromTop < LOAD_MORE_SCROLL_THRESHOLD * 2) {
      // User is near top (but not at top), likely viewing older messages - don't interfere
      !IS_PROD && console.log('⛔ scrollToLatest blocked: user viewing older messages', { scrollTop: distanceFromTop });
      return;
    }

    // During transitions, always use instant scroll to prevent jitter
    if (isTransitioningRef.current || behavior !== 'smooth') {
      !IS_PROD && console.log('✅ Scrolling to bottom (instant)', { newScrollTop: container.scrollHeight });
      container.scrollTop = container.scrollHeight;
      setIsUserAtLatest(true);
      setAutoScrollEnabled(true);
      setUnseenMessageCount(0);
    } else {
      // Only use smooth scrolling for user-initiated scrolls when not transitioning
      !IS_PROD && console.log('✅ Scrolling to bottom (smooth)', { target: container.scrollHeight });
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      // Reset unseen count immediately since we're scrolling to bottom
      setUnseenMessageCount(0);
      // Other states will be updated by evaluateScrollPosition when scroll completes
    }
  }, []);

  const evaluateScrollPosition = useCallback(() => {
    // ✅ CRITICAL: Don't evaluate if we're in pagination mode
    if (isPaginationModeRef.current) {
      return;
    }

    // Don't evaluate if we're in the middle of an auto-scroll or loading older messages
    if (isAutoScrollingRef.current || isLoadingOlderMessagesRef.current) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;

    setIsUserAtLatest(isAtBottom);
    setAutoScrollEnabled(isAtBottom);
    if (isAtBottom) {
      setUnseenMessageCount(0);
    }
  }, []);

  const maybeLoadOlderMessages = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // ✅ CRITICAL: Set pagination mode as soon as user is near the top
    // This prevents auto-scroll from triggering before we start loading
    if (scrollTop <= LOAD_MORE_SCROLL_THRESHOLD * 2 && hasMoreHistory) {
      isPaginationModeRef.current = true;
      !IS_PROD && console.log('🔒 Entered pagination mode: user near top');
    } else if (scrollTop > LOAD_MORE_SCROLL_THRESHOLD * 3) {
      // User has scrolled away from top - clear pagination mode
      isPaginationModeRef.current = false;
      !IS_PROD && console.log('🔓 Exited pagination mode: user scrolled away');
    }

    // Debug logging
    !IS_PROD && console.log('📜 maybeLoadOlderMessages check:', {
      scrollTop,
      threshold: LOAD_MORE_SCROLL_THRESHOLD,
      isHistoryLoading: isHistoryLoadingMessages,
      hasMoreHistory,
      isLoadingOlder: isLoadingOlderMessagesRef.current,
      isTransitioning: isTransitioningRef.current,
      isPaginationMode: isPaginationModeRef.current,
    });

    if (scrollTop > LOAD_MORE_SCROLL_THRESHOLD) {
      pendingLoadRequestRef.current = false;
      return;
    }

    // If we can't load right now but user is at the top, remember the request
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current || isTransitioningRef.current) {
      if (hasMoreHistory) {
        pendingLoadRequestRef.current = true;
        !IS_PROD && console.log('⏳ Load blocked, marking as pending');
      }
      return;
    }

    if (!hasMoreHistory) {
      pendingLoadRequestRef.current = false;

      // Show toast once per player session when user reaches the end of history
      if (!hasShownEndOfHistoryToastRef.current && scrollTop <= LOAD_MORE_SCROLL_THRESHOLD && addToast) {
        hasShownEndOfHistoryToastRef.current = true;
        addToast({
          type: 'info',
          title: 'End of conversation',
          description: "You've scrolled to the beginning of the conversation history ... No more messages to load.",
        });
        !IS_PROD && console.log('📢 Showed end of history toast');
      }

      return;
    }

    // Clear pending flag since we're about to load
    pendingLoadRequestRef.current = false;

    !IS_PROD && console.log('🚀 Loading older messages...');

    // ✅ CRITICAL: Set flags SYNCHRONOUSLY before any async operations
    isLoadingOlderMessagesRef.current = true;
    isPaginationModeRef.current = true; // ✅ Mark that we're in pagination mode

    const previousScrollTop = scrollTop;
    const previousScrollHeight = container.scrollHeight;

    try {
      const result = await loadOlderMessages();

      !IS_PROD && console.log('✅ Loaded older messages:', {
        added: result.added,
        previousScrollTop,
        previousScrollHeight,
      });

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) {
          isLoadingOlderMessagesRef.current = false;
          return;
        }

        if (result.added > 0) {
          const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
          const newScrollTop = previousScrollTop + heightDelta;

          !IS_PROD && console.log('📍 Restoring scroll position:', {
            heightDelta,
            oldScrollTop: previousScrollTop,
            newScrollTop,
            currentScrollHeight: updatedContainer.scrollHeight,
          });

          updatedContainer.scrollTop = newScrollTop;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }

        // Reset flag after scroll position is restored
        // ✅ FIXED: Use a longer delay (500ms) to ensure scroll position is stable
        setTimeout(() => {
          isLoadingOlderMessagesRef.current = false;
          !IS_PROD && console.log('🔓 Cleared isLoadingOlder flag');

          // ✅ Clear pagination mode only if user has scrolled away from top
          const currentContainer = messagesContainerRef.current;
          if (currentContainer && currentContainer.scrollTop > LOAD_MORE_SCROLL_THRESHOLD * 3) {
            isPaginationModeRef.current = false;
            !IS_PROD && console.log('🔓 Cleared pagination mode flag: user scrolled away');
          } else {
            !IS_PROD && console.log('🔒 Keeping pagination mode: user still near top');
          }

          // Check if there's a pending load request
          if (pendingLoadRequestRef.current) {
            const pendingContainer = messagesContainerRef.current;
            if (pendingContainer && pendingContainer.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD) {
              !IS_PROD && console.log('🔄 Executing pending load request...');
              pendingLoadRequestRef.current = false;

              // Trigger the scroll handler to check and load
              setTimeout(() => {
                handleScroll();
              }, 50);
            } else {
              pendingLoadRequestRef.current = false;
            }
          }
        }, 500);
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
      isPaginationModeRef.current = false; // Clear pagination mode on error
      !IS_PROD && console.log('🔓 Cleared isLoadingOlder flag (error)');
    }
  }, [hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, addToast]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      !IS_PROD && console.log('📜 Scroll event:', {
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
      });
    }
    evaluateScrollPosition();
    void maybeLoadOlderMessages();
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

  // Reset scroll state when player changes
  const resetScrollState = useCallback(() => {
    hasShownEndOfHistoryToastRef.current = false;
    isPaginationModeRef.current = false;
    isLoadingOlderMessagesRef.current = false;
    pendingLoadRequestRef.current = false;
    isTransitioningRef.current = false;
    isAutoScrollingRef.current = false;
  }, []);

  // Track player changes to reset state
  useEffect(() => {
    if (selectedPlayerId !== previousPlayerIdRef.current) {
      resetScrollState();
      previousPlayerIdRef.current = selectedPlayerId;
    }
  }, [selectedPlayerId, resetScrollState]);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    isUserAtLatest,
    autoScrollEnabled,
    unseenMessageCount,
    scrollToLatest,
    setIsUserAtLatest,
    setAutoScrollEnabled,
    setUnseenMessageCount,
    resetScrollState,
    handleScroll,
  };
}

