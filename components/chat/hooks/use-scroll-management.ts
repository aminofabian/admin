import { useCallback, useRef, useEffect, useState } from 'react';

const LOAD_MORE_SCROLL_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 64;
const IS_PROD = process.env.NODE_ENV === 'production';
const SCROLL_THROTTLE_MS = 16; // ~60fps

interface UseScrollManagementProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isHistoryLoadingMessages: boolean;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  selectedPlayerId: number | null;
  addToast?: (toast: { type: 'info' | 'success' | 'error' | 'warning'; title: string; description?: string }) => void;
  // Refresh functionality
  refreshMessages?: () => Promise<void>;
  isConnected?: boolean;
  messagesCount?: number;
  isRefreshingMessagesRef?: React.MutableRefObject<boolean>;
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
  refreshMessages,
  isConnected,
  messagesCount = 0,
  isRefreshingMessagesRef,
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
  const hasUserScrolledRef = useRef(false); // Track if user has manually scrolled
  const hasRefreshedForPlayerRef = useRef<number | null>(null); // Track refresh per player

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

    // ✅ OPTIMIZED: Direct DOM manipulation for all scrolls - let CSS handle smooth behavior
    // This is more performant than RAF and respects browser optimizations
    isAutoScrollingRef.current = true;
    !IS_PROD && console.log('✅ Scrolling to bottom', { behavior });
    
    // Use scrollTo with behavior option - browser optimized
    container.scrollTo({ 
      top: container.scrollHeight, 
      behavior: isTransitioningRef.current || behavior === 'auto' ? 'auto' : 'smooth' 
    });
    
    // Batch state updates to reduce re-renders - use single microtask
    Promise.resolve().then(() => {
      setIsUserAtLatest(true);
      setAutoScrollEnabled(true);
      setUnseenMessageCount(0);
      isAutoScrollingRef.current = false;
    });
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

    // ✅ OPTIMIZED: More aggressive pagination - load when within 100px of top
    const isNearTop = scrollTop <= LOAD_MORE_SCROLL_THRESHOLD * 1.5;

    // ✅ CRITICAL: Set pagination mode as soon as user is near the top
    // This prevents auto-scroll from triggering before we start loading
    if (isNearTop && hasMoreHistory) {
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
      isNearTop,
      isHistoryLoading: isHistoryLoadingMessages,
      hasMoreHistory,
      isLoadingOlder: isLoadingOlderMessagesRef.current,
      isTransitioning: isTransitioningRef.current,
      isPaginationMode: isPaginationModeRef.current,
    });

    // ✅ OPTIMIZED: More aggressive threshold - load when within 100px of top
    if (scrollTop > LOAD_MORE_SCROLL_THRESHOLD * 1.5) {
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

      // Show toast only if user has manually scrolled (not on initial load)
      if (!hasShownEndOfHistoryToastRef.current && hasUserScrolledRef.current && scrollTop <= LOAD_MORE_SCROLL_THRESHOLD && addToast) {
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

      // ✅ OPTIMIZED: Single RAF for scroll position restoration (no double RAF needed)
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

          // Direct scroll position restoration - instant, no animation needed
          updatedContainer.scrollTop = newScrollTop;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }

        // ✅ OPTIMIZED: Use microtask instead of setTimeout for faster flag clearing
        Promise.resolve().then(() => {
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
            if (pendingContainer && pendingContainer.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD * 1.5) {
              !IS_PROD && console.log('🔄 Executing pending load request...');
              pendingLoadRequestRef.current = false;

              // Use microtask for immediate execution
              Promise.resolve().then(() => {
                const pendingScrollContainer = messagesContainerRef.current;
                if (pendingScrollContainer) {
                  pendingScrollContainer.dispatchEvent(new Event('scroll', { bubbles: false }));
                }
              });
            } else {
              pendingLoadRequestRef.current = false;
            }
          }
        });
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
      isPaginationModeRef.current = false; // Clear pagination mode on error
      !IS_PROD && console.log('🔓 Cleared isLoadingOlder flag (error)');
    }
  }, [hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, addToast]);

  // ✅ OPTIMIZED: Throttle scroll events with RAF for 60fps performance
  const scrollRafRef = useRef<number | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  
  const handleScroll = useCallback(() => {
    // Skip if auto-scrolling to prevent feedback loop
    if (isAutoScrollingRef.current) {
      return;
    }

    // Cancel existing RAF if any (throttling)
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    // Use RAF for smooth, frame-synced scroll handling
    scrollRafRef.current = requestAnimationFrame(() => {
      const now = performance.now();
      
      // Throttle to ~60fps max
      if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
        scrollRafRef.current = null;
        return;
      }
      
      lastScrollTimeRef.current = now;
      const container = messagesContainerRef.current;
      if (container) {
        !IS_PROD && console.log('📜 Scroll event:', {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
        });
        
        // Only mark as user-scrolled when scrolling UP (away from bottom)
        // This prevents programmatic scrolls to bottom from triggering the flag
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom > SCROLL_BOTTOM_THRESHOLD) {
          hasUserScrolledRef.current = true;
        }
      }
      
      evaluateScrollPosition();
      
      // ✅ CRITICAL: Call load immediately - no debouncing for pagination
      // Debouncing would prevent loading when user scrolls to top
      void maybeLoadOlderMessages();
      
      scrollRafRef.current = null;
    });
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

  // Reset scroll state when player changes
  const resetScrollState = useCallback(() => {
    hasShownEndOfHistoryToastRef.current = false;
    isPaginationModeRef.current = false;
    isLoadingOlderMessagesRef.current = false;
    pendingLoadRequestRef.current = false;
    isTransitioningRef.current = false;
    isAutoScrollingRef.current = false;
    lastScrollTimeRef.current = 0;
    hasUserScrolledRef.current = false; // Reset scroll tracking
    
    // Cancel scroll RAF
    if (scrollRafRef.current !== null) {
      cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = null;
    }
  }, []);

  // Track player changes to reset state
  useEffect(() => {
    if (selectedPlayerId !== previousPlayerIdRef.current) {
      resetScrollState();
      hasRefreshedForPlayerRef.current = null; // Reset to allow refresh for new player
      previousPlayerIdRef.current = selectedPlayerId;
      
      !IS_PROD && console.log('🔄 [useScrollManagement] Player changed, reset complete', {
        newPlayerId: selectedPlayerId,
        hasRefreshedReset: hasRefreshedForPlayerRef.current === null,
      });
    }
  }, [selectedPlayerId, resetScrollState]);

  // ✅ FIX: Refresh messages after WebSocket connects and loads initial messages for a new player
  // This ensures we always have the absolute latest chat history
  useEffect(() => {
    // Skip if refresh function not provided
    if (!refreshMessages || !isRefreshingMessagesRef) {
      return;
    }

    // Debug: Always log the evaluation
    !IS_PROD && console.log('🔍 [useScrollManagement] Refresh effect evaluating:', {
      hasSelectedPlayer: !!selectedPlayerId,
      selectedPlayerId,
      isConnected,
      messagesCount,
      isHistoryLoading: isHistoryLoadingMessages,
      hasRefreshedForPlayer: hasRefreshedForPlayerRef.current,
      shouldRefresh: selectedPlayerId && 
        isConnected && 
        messagesCount > 0 && 
        !isHistoryLoadingMessages &&
        hasRefreshedForPlayerRef.current !== selectedPlayerId
    });
    
    // Only refresh if all conditions are met
    if (
      selectedPlayerId && 
      isConnected && 
      messagesCount > 0 && 
      !isHistoryLoadingMessages &&
      hasRefreshedForPlayerRef.current !== selectedPlayerId
    ) {
      !IS_PROD && console.log('✅ [useScrollManagement] Conditions met! Refreshing messages for player:', selectedPlayerId);
      hasRefreshedForPlayerRef.current = selectedPlayerId;
      
      // Small delay to ensure initial messages are fully rendered
      const refreshTimer = setTimeout(() => {
        isRefreshingMessagesRef.current = true;
        refreshMessages().catch((error) => {
          !IS_PROD && console.warn('⚠️ [useScrollManagement] Failed to refresh messages:', error);
        }).finally(() => {
          // Use microtask for immediate execution
          Promise.resolve().then(() => {
            isRefreshingMessagesRef.current = false;
            !IS_PROD && console.log('✅ [useScrollManagement] Refresh complete for player:', selectedPlayerId);
          });
        });
      }, 300);
      
      return () => clearTimeout(refreshTimer);
    }
  }, [selectedPlayerId, isConnected, messagesCount, isHistoryLoadingMessages, refreshMessages, isRefreshingMessagesRef]);

  // Set up scroll listener with passive option for better performance
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // ✅ OPTIMIZED: Use passive listener for better scroll performance
    // Passive listeners don't block scrolling while JS runs
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      // Clean up any pending operations
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
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

