import { useCallback, useRef, useEffect, useState } from 'react';

const SCROLL_BOTTOM_THRESHOLD = 100; // Distance from bottom to consider "at bottom"
const COOLDOWN_MS = 2000; // 2-second cooldown after user scrolls away
const SCROLL_THROTTLE_MS = 16; // ~60fps - optimized for performance with long histories
const SPACER_HEIGHT = 500; // Top spacer height for buffer
const TOP_BUFFER = 200; // Minimum buffer space at top when loading older messages
const MOMENTUM_SCROLL_DETECTION_MS = 150; // Time to wait after scroll ends to detect momentum
const INCREMENTAL_LOAD_DELAY_MS = 16; // One frame - near-instant next batch for seamless scroll
const VIEWPORT_FILL_THRESHOLD = 1.0; // Load until viewport is 100% filled with content above
const SCROLLBAR_RESET_THRESHOLD = 50; // When scrollTop <= this, reset scrollbar to buffer
const SCROLLBAR_BUFFER_POSITION = SPACER_HEIGHT + TOP_BUFFER; // Position to reset scrollbar to

//  SMOOTH SCROLL OPTIMIZATIONS
const SCROLL_ANIMATION_DURATION = 250; // Shorter duration for snappier feel
const JUMP_DETECTION_THRESHOLD = 300; // Detect if user jumped (vs gradual scroll)
const VELOCITY_SMOOTHING = 0.15; // Smooth velocity calculations

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
  scrollToBottom: (force?: boolean, instant?: boolean) => void;
  handleScroll: () => void;
  //  SMOOTH SCROLL: Expose smooth scroll functionality for external use
  smoothScrollToPosition: (targetScrollTop: number, duration?: number) => void;
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

  //  USER CONTROL: Track if user has manually scrolled (takes full control)
  const hasUserManuallyScrolledRef = useRef(false);

  //  SMOOTH SCROLL: Enhanced scroll tracking for buttery smoothness
  const scrollVelocityRef = useRef<number>(0);
  const lastScrollTopRef = useRef<number>(0);
  const scrollAccelerationRef = useRef<number>(0);
  const isSmoothScrollingRef = useRef(false);
  const scrollAnimationFrameRef = useRef<number | null>(null);
  const scrollTargetRef = useRef<number | null>(null);
  const scrollStartTimeRef = useRef<number>(0);
  const scrollStartTopRef = useRef<number>(0);
  
  // Load management - tuned for seamless infinite scroll (user can't tell they're on next page)
  const lastLoadTimeRef = useRef<number>(0);
  const LOAD_COOLDOWN_MS = 350; // Short cooldown so fast scrollers get continuous loading
  const LOAD_DEBOUNCE_MS = 80; // Quick reaction when user scrolls toward top
  const loadDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasShownEndOfHistoryToastRef = useRef(false);
  
  //  INCREMENTAL LOADING: Track incremental loading state
  const isIncrementalLoadingRef = useRef(false);
  const incrementalLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  //  SCROLLBAR RESET: Track if we're resetting scrollbar (to prevent visual jump)
  const isResettingScrollbarRef = useRef(false);
  const lastScrollTopBeforeResetRef = useRef<number>(0);
  const contentTransformRef = useRef<number>(0); // Track content transform offset
  
  //  INITIAL LOAD: Track if user has scrolled to initial load
  const hasScrolledToInitialLoadRef = useRef(false);
  
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    //  USER CONTROL: Track manual scrolling behavior
    if (!isAutoScrollingRef.current) {
      // User manually scrolled (not programmatic)
      if (!isAtBottom) {
        // User scrolled away from bottom → disable auto-scroll
        hasUserManuallyScrolledRef.current = true;
      } else {
        // User manually scrolled back to bottom → re-enable auto-scroll
        // They want to see new messages, so allow auto-scroll again
        hasUserManuallyScrolledRef.current = false;
      }
    }

    // Rule 5: User returning to bottom → Clear cooldown
    if (isAtBottom) {
      clearCooldown();
    } else {
      // Rule 3: User scrolls up/away from bottom → Start 2-second cooldown and disable auto-scroll
      if (!isCooldownActiveRef.current) {
        startCooldown();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIfAtBottom, clearCooldown, startCooldown]);

  //  SMOOTH SCROLL: Smooth animation to target position
  const smoothScrollToPosition = useCallback((targetScrollTop: number, duration: number = SCROLL_ANIMATION_DURATION) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Cancel any existing smooth scroll animation
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
    }

    isSmoothScrollingRef.current = true;
    scrollTargetRef.current = targetScrollTop;
    scrollStartTimeRef.current = performance.now();
    scrollStartTopRef.current = container.scrollTop;

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - scrollStartTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Use ease-out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentScrollTop = scrollStartTopRef.current + (targetScrollTop - scrollStartTopRef.current) * easeProgress;
      container.scrollTop = currentScrollTop;

      if (progress < 1) {
        scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
      } else {
        // Animation complete
        isSmoothScrollingRef.current = false;
        scrollAnimationFrameRef.current = null;
        scrollTargetRef.current = null;

        // Ensure final position is exact
        container.scrollTop = targetScrollTop;
      }
    };

    scrollAnimationFrameRef.current = requestAnimationFrame(animateScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback((force = false, instant = false) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    //  USER CONTROL: If user has manually scrolled, only allow forced scrolls
    // Forced scrolls are: user clicks button, user sends message, initial load
    // Non-forced scrolls (auto-scroll for new messages) are blocked
    if (!force && hasUserManuallyScrolledRef.current) {
      // User has taken control - don't auto-scroll
      return;
    }

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
      //  USER CONTROL: When user explicitly scrolls to bottom (button click, sends message),
      // reset the manual scroll flag so new messages can auto-scroll again
      // This means: "User wants to be at bottom, so show new messages automatically"
      hasUserManuallyScrolledRef.current = false;
    }

    isAutoScrollingRef.current = true;

    //  TARGETED LATEST MESSAGE: Only use aggressive approach for specific cases
    if (instant && (force || !hasScrolledToInitialLoadRef.current)) {
      //  ONLY for initial load and player switching - use aggressive approach
      const targetScrollTop = container.scrollHeight;

      // Multiple approaches for guaranteed latest message visibility
      container.scrollTop = targetScrollTop;
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'instant' as ScrollBehavior
      });
      void container.offsetHeight; // Force reflow
      container.scrollTop = targetScrollTop;

      // RequestAnimationFrame verification
      requestAnimationFrame(() => {
        container.scrollTop = targetScrollTop;
      });

      // Mark that we've scrolled to initial load
      hasScrolledToInitialLoadRef.current = true;
      
      // Reset flag quickly
      setTimeout(() => {
        isAutoScrollingRef.current = false;
        evaluateScrollPosition();
      }, 10);
    } else {
      //  NATURAL SCROLL: Use smooth scrolling for normal interactions
      const targetScrollTop = container.scrollHeight;

      if (instant) {
        // Direct instant scroll for other cases
        container.scrollTop = targetScrollTop;
        setTimeout(() => {
          isAutoScrollingRef.current = false;
          evaluateScrollPosition();
        }, 0);
      } else {
        //  SMOOTH SCROLL: Use custom smooth animation for regular use
        smoothScrollToPosition(targetScrollTop, SCROLL_ANIMATION_DURATION);

        // Reset auto-scroll flag after animation
        setTimeout(() => {
          isAutoScrollingRef.current = false;
          evaluateScrollPosition();
        }, SCROLL_ANIMATION_DURATION + 50);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkIfAtBottom, checkCooldown, clearCooldown, evaluateScrollPosition, smoothScrollToPosition]);

  //  INCREMENTAL LOADING: Check if viewport needs more content above
  const checkIfViewportNeedsMoreContent = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;

    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    // Calculate how much content is visible above current scroll position
    // Account for transform offset if scrollbar was reset
    const effectiveScrollTop = scrollTop - contentTransformRef.current;
    const contentAbove = Math.max(0, effectiveScrollTop);
    
    // Check if we have enough content above to fill the viewport
    // We want at least VIEWPORT_FILL_THRESHOLD (80%) of viewport height as content above
    const minContentAbove = viewportHeight * VIEWPORT_FILL_THRESHOLD;
    
    // Preload 1.5 viewports before top - content ready before user scrolls there (seamless page transition)
    const LOAD_THRESHOLD = SPACER_HEIGHT + Math.round(viewportHeight * 1.5);
    const isNearTop = effectiveScrollTop <= LOAD_THRESHOLD;
    
    // Need more content if: near top AND not enough content above
    return isNearTop && contentAbove < minContentAbove;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //  INCREMENTAL LOADING: Load a single batch and check if more is needed
  const loadSingleBatch = useCallback(async (): Promise<{ added: number; needsMore: boolean }> => {
    const container = messagesContainerRef.current;
    if (!container) return { added: 0, needsMore: false };

    // Check loading state
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current) {
      return { added: 0, needsMore: false };
    }

    // Enforce cooldown (but shorter for incremental loading)
    const now = performance.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;
    if (timeSinceLastLoad < LOAD_COOLDOWN_MS) {
      return { added: 0, needsMore: false };
    }

    if (!hasMoreHistory) {
      return { added: 0, needsMore: false };
    }

    isLoadingOlderMessagesRef.current = true;
    lastLoadTimeRef.current = now;

    const beforeLoad = {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    };

    const originalBehavior = container.style.scrollBehavior;
    container.style.scrollBehavior = 'auto';

    try {
      const result = await loadOlderMessages();

      if (result.added === 0) {
        isLoadingOlderMessagesRef.current = false;
        container.style.scrollBehavior = originalBehavior;
        return { added: 0, needsMore: false };
      }

      // Wait for DOM to update and adjust scroll position
      // Synchronous scroll in same frame as content - user never sees a "jump" between pages
      return new Promise<{ added: number; needsMore: boolean }>((resolve) => {
        let resolved = false;
        let pendingHeight = 0;

        const applyScrollAndFinalize = (currentContainer: HTMLDivElement, stillNeedsMore: boolean) => {
          if (resolved) return;
          resolved = true;
          if (messagesContainerRef.current) {
            messagesContainerRef.current.style.scrollBehavior = originalBehavior;
          }
          isLoadingOlderMessagesRef.current = false;
          resolve({ added: result.added, needsMore: stillNeedsMore });
        };

        const tryApplyScroll = () => {
          const currentContainer = messagesContainerRef.current;
          if (!currentContainer || resolved) return;

          const finalHeight = currentContainer.scrollHeight;
          const finalDelta = finalHeight - beforeLoad.scrollHeight;

          if (finalDelta <= 0) return;

          // Pixel-perfect scroll preservation - round to avoid sub-pixel bounce
          let newScrollTop = Math.round(beforeLoad.scrollTop + finalDelta);

          const wasAtTop = beforeLoad.scrollTop <= SPACER_HEIGHT + 50;
          if (wasAtTop) {
            const minScrollTop = SPACER_HEIGHT + TOP_BUFFER;
            if (newScrollTop < minScrollTop) {
              newScrollTop = minScrollTop;
            }
          }

          const maxScrollTop = finalHeight - currentContainer.clientHeight;
          if (newScrollTop > maxScrollTop) {
            newScrollTop = Math.max(Math.round(maxScrollTop) - 100, 0);
          }

          // Apply scroll - use scrollTop directly for zero perceived latency
          currentContainer.scrollTop = newScrollTop;
          void currentContainer.offsetHeight; // Force layout before next paint

          const stillNeedsMore = checkIfViewportNeedsMoreContent() && hasMoreHistory;
          applyScrollAndFinalize(currentContainer, stillNeedsMore);
        };

        const mutationObserver = new MutationObserver(() => {
          if (resolved) return;
          const currentContainer = messagesContainerRef.current;
          if (!currentContainer) return;

          const newHeight = currentContainer.scrollHeight;
          if (newHeight <= beforeLoad.scrollHeight) return;

          // Double rAF: wait for layout to fully settle (images, fonts) - prevents bounce from async layout
          if (newHeight !== pendingHeight) {
            pendingHeight = newHeight;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (!resolved) tryApplyScroll();
              });
            });
          }
        });

        mutationObserver.observe(container, {
          childList: true,
          subtree: true,
        });

        // Fallback: rAF in case microtask runs before layout is complete
        requestAnimationFrame(() => {
          if (!resolved) tryApplyScroll();
        });

        // Timeout fallback - ensure we never hang
        setTimeout(() => {
          if (!resolved) {
            mutationObserver.disconnect();
            const updatedContainer = messagesContainerRef.current;
            if (updatedContainer && updatedContainer.scrollHeight > beforeLoad.scrollHeight) {
              tryApplyScroll();
            } else {
              resolved = true;
              if (messagesContainerRef.current) {
                messagesContainerRef.current.style.scrollBehavior = originalBehavior;
              }
              isLoadingOlderMessagesRef.current = false;
              resolve({ added: result.added, needsMore: false });
            }
          }
        }, 1200);
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
      container.style.scrollBehavior = originalBehavior;
      return { added: 0, needsMore: false };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOlderMessages, hasMoreHistory, isHistoryLoadingMessages, checkIfViewportNeedsMoreContent]);

  //  INCREMENTAL LOADING: Progressive loading that fills viewport incrementally
  const loadIncrementally = useCallback(async () => {
    if (isIncrementalLoadingRef.current) {
      return; // Already loading incrementally
    }

    isIncrementalLoadingRef.current = true;

    const loadNext = async (): Promise<void> => {
      // Check if we still need more content (continue even while scrolling)
      const needsMore = checkIfViewportNeedsMoreContent() && hasMoreHistory;
      
      if (!needsMore) {
        isIncrementalLoadingRef.current = false;
        return;
      }

      // Load one batch
      const result = await loadSingleBatch();

      // Continue loading if viewport still needs more content
      const stillNeedsMore = checkIfViewportNeedsMoreContent() && hasMoreHistory && result.needsMore;

      if (stillNeedsMore) {
        // Wait a bit before loading next batch for smooth effect
        incrementalLoadTimeoutRef.current = setTimeout(() => {
          void loadNext();
        }, INCREMENTAL_LOAD_DELAY_MS);
      } else {
        isIncrementalLoadingRef.current = false;
      }
    };

    await loadNext();
  }, [checkIfViewportNeedsMoreContent, loadSingleBatch, hasMoreHistory]);

  // Load older messages
  const maybeLoadOlderMessages = useCallback(async () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;
    
    // Account for transform offset if scrollbar was reset
    const effectiveScrollTop = scrollTop - contentTransformRef.current;

    // Check loading state
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current || isIncrementalLoadingRef.current) {
      return;
    }

    // Preload 1.5 viewports before top - same as checkIfViewportNeedsMoreContent
    const viewportHeight = container.clientHeight;
    const LOAD_THRESHOLD = SPACER_HEIGHT + Math.round(viewportHeight * 1.5);
    const shouldLoad = effectiveScrollTop <= LOAD_THRESHOLD && hasMoreHistory;

    if (!shouldLoad) {
      return;
    }

    if (!hasMoreHistory) {
      // Show end of history toast once
      if (!hasShownEndOfHistoryToastRef.current && effectiveScrollTop <= SPACER_HEIGHT + 250 && addToast) {
        hasShownEndOfHistoryToastRef.current = true;
        addToast({
          type: 'info',
          title: 'End of conversation',
          description: "You've scrolled to the beginning of the conversation history.",
        });
      }
      return;
    }

    //  INCREMENTAL LOADING: Use progressive loading to fill viewport incrementally
    void loadIncrementally();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreHistory, loadIncrementally, addToast, isHistoryLoadingMessages]);

  //  SCROLLBAR RESET: Reset scrollbar to buffer position when reaching top
  // Only the scrollbar moves - content stays visually in place using CSS transform
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const resetScrollbarToBuffer = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || isResettingScrollbarRef.current) {
      return;
    }

    const scrollTop = container.scrollTop;

    // Only reset if we're at or very near the top
    if (scrollTop > SCROLLBAR_RESET_THRESHOLD) {
      return;
    }

    // Mark as resetting to prevent recursive calls
    isResettingScrollbarRef.current = true;
    lastScrollTopBeforeResetRef.current = scrollTop;

    //  CRITICAL: Calculate offset needed to keep content visually in place
    // When we reset scrollbar from scrollTop to SCROLLBAR_BUFFER_POSITION,
    // the browser would move content DOWN by (SCROLLBAR_BUFFER_POSITION - scrollTop)
    // To prevent this, we offset content UP by the same amount
    // Example: scrollTop=0, buffer=700 → content would move down 700px, so we move it up 700px
    const scrollDelta = SCROLLBAR_BUFFER_POSITION - scrollTop; // How much scrollbar will move
    const contentOffset = -scrollDelta; // Negative = move content up to compensate
    contentTransformRef.current = contentOffset;

    // Get content wrapper
    const contentWrapper = container.firstElementChild as HTMLElement;
    if (!contentWrapper) {
      isResettingScrollbarRef.current = false;
      return;
    }

    //  CRITICAL: Apply hardware-accelerated transform synchronously
    // Use translate3d for hardware acceleration and ensure atomic operation
    // Step 1: Apply transform with hardware acceleration (translate3d)
    contentWrapper.style.transition = 'none';
    contentWrapper.style.willChange = 'transform';
    contentWrapper.style.transform = `translate3d(0, ${contentOffset}px, 0)`;
    contentWrapper.style.backfaceVisibility = 'hidden'; // Force hardware acceleration
    
    // Step 2: Force synchronous reflow to apply transform
    // This MUST happen before scrollTop changes
    void contentWrapper.offsetHeight;
    
    // Step 3: Reset scrollbar IMMEDIATELY in same execution context
    // Content is already offset via transform, so it stays visually in place
    container.scrollTop = SCROLLBAR_BUFFER_POSITION;
    
    // Step 4: Force reflow to lock both transform and scroll position
    // Both are now locked synchronously before any paint
    void container.offsetHeight;
    void contentWrapper.offsetHeight;
    
    // Step 5: Mark as complete (non-blocking)
    // Transform stays applied to keep content in place
    requestAnimationFrame(() => {
      isResettingScrollbarRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    // Rule 9: Never auto-scroll while user is actively scrolling or in momentum scrolling
    if (isAutoScrollingRef.current || isResettingScrollbarRef.current || isSmoothScrollingRef.current) {
      return;
    }

    // Throttle scroll events for higher frame rate
    const now = performance.now();
    if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) {
      return;
    }
    lastScrollTimeRef.current = now;

    const container = messagesContainerRef.current;
    if (!container) return;

    const scrollTop = container.scrollTop;

    //  SMOOTH SCROLL: Enhanced velocity and acceleration tracking
    const deltaTime = now - lastScrollTimeRef.current;
    const deltaScroll = scrollTop - lastScrollTopRef.current;
    const currentVelocity = Math.abs(deltaScroll) / Math.max(deltaTime, 1);

    // Smooth velocity using exponential moving average for buttery feel
    scrollVelocityRef.current = scrollVelocityRef.current * (1 - VELOCITY_SMOOTHING) + currentVelocity * VELOCITY_SMOOTHING;

    // Calculate acceleration for predictive scroll behavior
    scrollAccelerationRef.current = currentVelocity - scrollVelocityRef.current;

    // Detect scroll jumps vs gradual scrolling
    const isScrollJump = Math.abs(deltaScroll) > JUMP_DETECTION_THRESHOLD;

    // Update tracking refs
    lastScrollTopRef.current = scrollTop;

    //  SCROLLBAR RESET: Remove transform if user scrolls away from buffer position
    // When user scrolls, we need to remove the transform that was keeping content in place
    if (contentTransformRef.current !== 0 && scrollTop > SCROLLBAR_BUFFER_POSITION + 50) {
      const contentWrapper = container.firstElementChild as HTMLElement;
      if (contentWrapper) {
        // User has scrolled away - remove transform smoothly
        contentWrapper.style.transition = 'transform 0.2s ease-out';
        contentWrapper.style.transform = 'translate3d(0, 0, 0)';
        setTimeout(() => {
          const finalWrapper = container.firstElementChild as HTMLElement;
          if (finalWrapper) {
            finalWrapper.style.transform = '';
            finalWrapper.style.transition = '';
            finalWrapper.style.willChange = '';
            finalWrapper.style.backfaceVisibility = '';
          }
          contentTransformRef.current = 0;
        }, 200);
      }
    }

    // Mark user as scrolling
    isUserScrollingRef.current = true;

    // Clear any existing scroll end timer
    if (scrollEndTimerRef.current !== null) {
      clearTimeout(scrollEndTimerRef.current);
    }

    // Adaptive momentum detection based on velocity
    // Faster scrolling = longer momentum detection time
    const adaptiveMomentumTime = Math.min(
      MOMENTUM_SCROLL_DETECTION_MS + (scrollVelocityRef.current * 10),
      300
    );

    // Set timer to detect when scrolling ends (momentum scrolling)
    scrollEndTimerRef.current = setTimeout(() => {
      isUserScrollingRef.current = false;
      scrollVelocityRef.current = 0; // Reset velocity when scrolling stops
      scrollAccelerationRef.current = 0; // Reset acceleration
      scrollEndTimerRef.current = null;
    }, adaptiveMomentumTime);

    // Evaluate scroll position
    evaluateScrollPosition();

    // Debounce load check - shorter delay for better responsiveness
    if (loadDebounceTimerRef.current !== null) {
      clearTimeout(loadDebounceTimerRef.current);
    }

    // Adaptive debounce based on scroll velocity
    // Faster scrolling = shorter debounce for immediate loading
    const adaptiveDebounce = isScrollJump ? 50 : Math.max(LOAD_DEBOUNCE_MS - (scrollVelocityRef.current * 5), 100);

    loadDebounceTimerRef.current = setTimeout(() => {
      loadDebounceTimerRef.current = null;
      void maybeLoadOlderMessages();
    }, adaptiveDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

  //  OPTIMIZED: Reset state when player changes and scroll to latest message
  useEffect(() => {
    if (selectedPlayerId !== previousPlayerIdRef.current) {
      clearCooldown();
      setIsUserAtBottom(true);
      hasShownEndOfHistoryToastRef.current = false;
      //  USER CONTROL: Reset manual scroll flag when switching players
      // New conversation = fresh start, allow auto-scroll initially
      hasUserManuallyScrolledRef.current = false;
      //  INITIAL LOAD: Reset initial load flag for new player
      hasScrolledToInitialLoadRef.current = false;
      previousPlayerIdRef.current = selectedPlayerId;

      //  TARGETED LATEST MESSAGE: Only scroll to bottom for player switching
      // Use a single, clean approach that preserves natural scroll behavior
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const container = messagesContainerRef.current;
          if (container) {
            // Single instant scroll to bottom - clean and predictable
            container.scrollTop = container.scrollHeight;

            // One verification after a brief delay for async content
            setTimeout(() => {
              const currentContainer = messagesContainerRef.current;
              if (currentContainer) {
                currentContainer.scrollTop = currentContainer.scrollHeight;
              }
            }, 100);
          }
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlayerId, clearCooldown]);

  //  SMOOTH SCROLL: Cleanup function for animation frames and timers
  const cleanupAnimations = useCallback(() => {
    // Cancel any ongoing smooth scroll animation
    if (scrollAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrollAnimationFrameRef.current);
      scrollAnimationFrameRef.current = null;
    }
    isSmoothScrollingRef.current = false;
    scrollTargetRef.current = null;

    // Clear all timers
    if (scrollEndTimerRef.current !== null) {
      clearTimeout(scrollEndTimerRef.current);
      scrollEndTimerRef.current = null;
    }
    if (loadDebounceTimerRef.current !== null) {
      clearTimeout(loadDebounceTimerRef.current);
      loadDebounceTimerRef.current = null;
    }
    if (incrementalLoadTimeoutRef.current !== null) {
      clearTimeout(incrementalLoadTimeoutRef.current);
      incrementalLoadTimeoutRef.current = null;
    }

    // Reset scroll state
    isUserScrollingRef.current = false;
    scrollVelocityRef.current = 0;
    scrollAccelerationRef.current = 0;
    isIncrementalLoadingRef.current = false;
  }, []);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    //  SMOOTH SCROLL: Optimize container for hardware acceleration
    container.style.scrollBehavior = 'auto'; // We'll handle smooth scrolling ourselves
    container.style.willChange = 'scroll-position';
    container.style.transform = 'translateZ(0)'; // Force hardware acceleration
    container.style.backfaceVisibility = 'hidden'; // Prevent flicker

    //  SMOOTH SCROLL: Use passive listener for better performance
    const scrollListener = () => handleScroll();
    container.addEventListener('scroll', scrollListener, { passive: true, capture: false });

    // Initialize scroll tracking
    lastScrollTopRef.current = container.scrollTop;

    return () => {
      container.removeEventListener('scroll', scrollListener);

      //  SMOOTH SCROLL: Clean up all animations and timers
      cleanupAnimations();

      // Reset container styles
      container.style.scrollBehavior = '';
      container.style.willChange = '';
      container.style.transform = '';
      container.style.backfaceVisibility = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScroll, cleanupAnimations]);

  return {
    isUserAtBottom,
    scrollToBottom,
    handleScroll,
    smoothScrollToPosition,
  };
}

