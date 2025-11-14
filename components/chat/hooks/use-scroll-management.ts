import { useCallback, useRef, useEffect, useState } from 'react';

const SCROLL_BOTTOM_THRESHOLD = 100; // Distance from bottom to consider "at bottom"
const COOLDOWN_MS = 2000; // 2-second cooldown after user scrolls away
const SCROLL_THROTTLE_MS = 16; // ~60fps
const SPACER_HEIGHT = 500; // Top spacer height for buffer
const TOP_BUFFER = 200; // Minimum buffer space at top when loading older messages
const MOMENTUM_SCROLL_DETECTION_MS = 150; // Time to wait after scroll ends to detect momentum

interface UseScrollManagementProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isHistoryLoadingMessages: boolean;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  selectedPlayerId: number | null;
  addToast?: (toast: { type: 'info' | 'success' | 'error' | 'warning'; title: string; description?: string }) => void;
}

interface UseScrollManagementReturn {
  isUserAtBottom: boolean;
  scrollToBottom: (force?: boolean) => void;
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
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  
  // Cooldown management
  const cooldownEndTimeRef = useRef<number>(0);
  const isCooldownActiveRef = useRef(false);
  
  // Scroll state tracking
  const isAutoScrollingRef = useRef(false);
  const isUserScrollingRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollEndTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingOlderMessagesRef = useRef(false);
  
  // Load management
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_COOLDOWN_MS = 1000;
  const LOAD_DEBOUNCE_MS = 300;
  const loadDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownEndOfHistoryToastRef = useRef(false);
  
  // Previous player tracking
  const previousPlayerIdRef = useRef<number | null>(null);

  // Check if cooldown is active
  const checkCooldown = useCallback(() => {
    const now = Date.now();
    const isActive = now < cooldownEndTimeRef.current;
    isCooldownActiveRef.current = isActive;
    return isActive;
  }, []);

  // Start cooldown
  const startCooldown = useCallback(() => {
    cooldownEndTimeRef.current = Date.now() + COOLDOWN_MS;
    isCooldownActiveRef.current = true;
  }, []);

  // Clear cooldown
  const clearCooldown = useCallback(() => {
    cooldownEndTimeRef.current = 0;
    isCooldownActiveRef.current = false;
  }, []);

  // Check if user is at bottom
  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom <= SCROLL_BOTTOM_THRESHOLD;
  }, []);

  // Evaluate scroll position and update state
  const evaluateScrollPosition = useCallback(() => {
    if (isAutoScrollingRef.current || isLoadingOlderMessagesRef.current) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) return;

    const isAtBottom = checkIfAtBottom();
    setIsUserAtBottom(isAtBottom);

    // Rule 5: User returning to bottom → Immediately clear cooldown and re-enable auto-scroll
    if (isAtBottom) {
      clearCooldown();
    } else {
      // Rule 3: User scrolls up/away from bottom → Start 2-second cooldown and disable auto-scroll
      if (!isCooldownActiveRef.current) {
        startCooldown();
      }
    }
  }, [checkIfAtBottom, clearCooldown, startCooldown]);

  // Scroll to bottom function
  const scrollToBottom = useCallback((force = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Rule 12: Auto-scroll should never trigger if user is reading history (cooldown active or far from bottom)
    if (!force) {
      const isAtBottom = checkIfAtBottom();
      if (!isAtBottom && checkCooldown()) {
        return; // Don't auto-scroll if cooldown is active and user is away from bottom
      }
    }

    // Rule 1, 2, 6: Force scroll bypasses cooldown
    if (force) {
      clearCooldown();
    }

    isAutoScrollingRef.current = true;
    // Always use smooth scroll for better UX, but force bypasses cooldown
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    });

    // Reset auto-scroll flag after animation
    requestAnimationFrame(() => {
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        evaluateScrollPosition();
      }, 300);
    });
  }, [checkIfAtBottom, checkCooldown, clearCooldown, evaluateScrollPosition]);

  // Load older messages
  const maybeLoadOlderMessages = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    // Check loading state
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current) {
      return;
    }

    // Enforce cooldown
    const now = performance.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    if (timeSinceLastLoad < LOAD_COOLDOWN_MS) {
      return;
    }

    // Load when near top (accounting for spacer)
    const LOAD_THRESHOLD = SPACER_HEIGHT + 500;
    const shouldLoad = scrollTop <= LOAD_THRESHOLD && hasMoreHistory;

    if (!shouldLoad) {
      return;
    }

    if (!hasMoreHistory) {
      // Show end of history toast once
      if (!hasShownEndOfHistoryToastRef.current && scrollTop <= SPACER_HEIGHT + 250 && addToast) {
        hasShownEndOfHistoryToastRef.current = true;
        addToast({
          type: 'info',
          title: 'End of conversation',
          description: "You've scrolled to the beginning of the conversation history.",
        });
      }
      return;
    }

    isLoadingOlderMessagesRef.current = true;
    lastLoadTimeRef.current = now;

    // Rule 7: Loading older messages (prepend) → Preserve exact scroll position (no jump)
    const beforeLoad = {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    };

    // Disable smooth scroll during load
    const originalBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';

    try {
      const result = await loadOlderMessages();

      // Wait for DOM update
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const updatedContainer = messagesContainerRef.current;
          if (!updatedContainer) {
            isLoadingOlderMessagesRef.current = false;
            return;
          }

          if (result.added > 0) {
            const afterLoad = {
              scrollHeight: updatedContainer.scrollHeight,
              clientHeight: updatedContainer.clientHeight,
            };

            // Calculate height added
            const heightDelta = afterLoad.scrollHeight - beforeLoad.scrollHeight;

            // Rule 7 & 8: Preserve exact visual position of messages
            // The messages should stay in the same place on screen
            // Only adjust scroll position to account for new content above
            let newScrollTop = beforeLoad.scrollTop + heightDelta;

            // Only add buffer space if user was at the very top (within spacer area)
            // This creates scrollable space without moving visible messages
            const wasAtTop = beforeLoad.scrollTop <= SPACER_HEIGHT + 50;
            if (wasAtTop) {
              // User was at top, add buffer space for comfortable scrolling
              const minScrollTop = SPACER_HEIGHT + TOP_BUFFER;
              if (newScrollTop < minScrollTop) {
                newScrollTop = minScrollTop;
              }
            }
            // If user wasn't at top, keep exact position (messages stay in place)

            // Safety check: don't exceed max scroll
            const maxScrollTop = afterLoad.scrollHeight - afterLoad.clientHeight;
            if (newScrollTop > maxScrollTop) {
              newScrollTop = Math.max(maxScrollTop - 100, 0);
            }

            // Restore position instantly (messages stay visually in same place)
            updatedContainer.scrollTop = newScrollTop;

            // Verify position sticks (browsers sometimes reset it)
            requestAnimationFrame(() => {
              if (Math.abs(updatedContainer.scrollTop - newScrollTop) > 5) {
                updatedContainer.scrollTop = newScrollTop;
              }
            });
          }

          // Restore smooth scrolling
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.style.scrollBehavior = originalBehavior;
            }
          }, 150);

          isLoadingOlderMessagesRef.current = false;
        });
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
      container.style.scrollBehavior = originalBehavior;
    }
  }, [hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages, addToast]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    // Rule 9: Never auto-scroll while user is actively scrolling or in momentum scrolling
    if (isAutoScrollingRef.current) {
      return;
    }

    // Throttle scroll events
    const now = performance.now();
    if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
      return;
    }
    lastScrollTimeRef.current = now;

    // Mark user as scrolling
    isUserScrollingRef.current = true;

    // Clear any existing scroll end timer
    if (scrollEndTimerRef.current !== null) {
      clearTimeout(scrollEndTimerRef.current);
    }

    // Set timer to detect when scrolling ends (momentum scrolling)
    scrollEndTimerRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      scrollEndTimerRef.current = null;
    }, MOMENTUM_SCROLL_DETECTION_MS);

    // Evaluate scroll position
    evaluateScrollPosition();

    // Debounce load check
    if (loadDebounceTimerRef.current !== null) {
      clearTimeout(loadDebounceTimerRef.current);
    }

    loadDebounceTimerRef.current = setTimeout(() => {
      loadDebounceTimerRef.current = null;
      void maybeLoadOlderMessages();
    }, LOAD_DEBOUNCE_MS);
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

  // Reset state when player changes
  useEffect(() => {
    if (selectedPlayerId !== previousPlayerIdRef.current) {
      clearCooldown();
      setIsUserAtBottom(true);
      hasShownEndOfHistoryToastRef.current = false;
      previousPlayerIdRef.current = selectedPlayerId;
    }
  }, [selectedPlayerId, clearCooldown]);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.style.scrollBehavior = 'smooth';
    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollEndTimerRef.current !== null) {
        clearTimeout(scrollEndTimerRef.current);
      }
      if (loadDebounceTimerRef.current !== null) {
        clearTimeout(loadDebounceTimerRef.current);
      }
    };
  }, [handleScroll]);

  return {
    isUserAtBottom,
    scrollToBottom,
    handleScroll,
  };
}

