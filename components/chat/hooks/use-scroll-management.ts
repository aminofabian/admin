import { useCallback, useRef, useEffect, useState } from 'react';

const SCROLL_BOTTOM_THRESHOLD = 120;
const COOLDOWN_MS = 2000;
const SCROLL_THROTTLE_MS = 16;
const LOAD_MIN_INTERVAL_MS = 50;

interface UseScrollManagementProps {
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  isHistoryLoadingMessages: boolean;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  selectedPlayerId: number | null;
  addToast?: (toast: {
    type: 'info' | 'success' | 'error' | 'warning';
    title: string;
    description?: string;
  }) => void;
}

interface UseScrollManagementReturn {
  isUserAtBottom: boolean;
  isLoadingOlder: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
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
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const cooldownEndTimeRef = useRef<number>(0);
  const isAutoScrollingRef = useRef(false);
  const hasUserManuallyScrolledRef = useRef(false);
  const lastScrollTimeRef = useRef<number>(0);
  const isLoadingOlderRef = useRef(false);
  const lastLoadTimeRef = useRef<number>(0);
  const hasShownEndToastRef = useRef(false);
  const previousPlayerIdRef = useRef<number | null>(null);
  const pendingScrollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasMoreHistoryRef = useRef(hasMoreHistory);
  const isHistoryLoadingRef = useRef(isHistoryLoadingMessages);
  hasMoreHistoryRef.current = hasMoreHistory;
  isHistoryLoadingRef.current = isHistoryLoadingMessages;

  const checkIfAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      SCROLL_BOTTOM_THRESHOLD
    );
  }, [messagesContainerRef]);

  const clearCooldown = useCallback(() => {
    cooldownEndTimeRef.current = 0;
  }, []);
  const startCooldown = useCallback(() => {
    cooldownEndTimeRef.current = Date.now() + COOLDOWN_MS;
  }, []);
  const isCooldownActive = useCallback(
    () => Date.now() < cooldownEndTimeRef.current,
    [],
  );

  const evaluatePosition = useCallback(() => {
    if (isAutoScrollingRef.current) return;
    const atBottom = checkIfAtBottom();
    setIsUserAtBottom(atBottom);

    if (atBottom) {
      hasUserManuallyScrolledRef.current = false;
      clearCooldown();
    } else if (!isCooldownActive()) {
      hasUserManuallyScrolledRef.current = true;
      startCooldown();
    }
  }, [checkIfAtBottom, clearCooldown, startCooldown, isCooldownActive]);

  const scrollToBottom = useCallback(
    (force = false) => {
      const container = messagesContainerRef.current;
      if (!container) return;

      if (!force && hasUserManuallyScrolledRef.current) return;
      if (!force && !checkIfAtBottom() && isCooldownActive()) return;

      if (force) {
        clearCooldown();
        hasUserManuallyScrolledRef.current = false;
      }

      if (pendingScrollRef.current) {
        clearTimeout(pendingScrollRef.current);
        pendingScrollRef.current = null;
      }

      isAutoScrollingRef.current = true;
      container.scrollTop = container.scrollHeight;

      pendingScrollRef.current = setTimeout(() => {
        pendingScrollRef.current = null;
        const c = messagesContainerRef.current;
        if (c) c.scrollTop = c.scrollHeight;
        isAutoScrollingRef.current = false;
        setIsUserAtBottom(true);
      }, 50);
    },
    [
      messagesContainerRef,
      checkIfAtBottom,
      isCooldownActive,
      clearCooldown,
    ],
  );

  // Single-batch loader with scroll preservation
  const loadBatch = useCallback(async (): Promise<number> => {
    const container = messagesContainerRef.current;
    if (!container) return 0;
    if (isLoadingOlderRef.current) return 0;
    if (!hasMoreHistoryRef.current) return 0;

    const now = performance.now();
    if (now - lastLoadTimeRef.current < LOAD_MIN_INTERVAL_MS) return 0;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);
    lastLoadTimeRef.current = now;

    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;
    const wasAtBottom =
      prevScrollHeight - prevScrollTop - container.clientHeight <=
      SCROLL_BOTTOM_THRESHOLD;

    try {
      const result = await loadOlderMessages();
      if (result.added === 0) {
        isLoadingOlderRef.current = false;
        setIsLoadingOlder(false);
        return 0;
      }

      return new Promise<number>((resolve) => {
        let done = false;

        const finalize = () => {
          if (done) return;
          done = true;

          const c = messagesContainerRef.current;
          if (c) {
            if (wasAtBottom) {
              // Keep user pinned at bottom
              c.scrollTop = c.scrollHeight;
            } else {
              const delta = c.scrollHeight - prevScrollHeight;
              if (delta > 0) {
                c.scrollTop = Math.round(prevScrollTop + delta);
              }
            }
          }

          isLoadingOlderRef.current = false;
          setIsLoadingOlder(false);

          // Re-evaluate position after load completes
          requestAnimationFrame(() => evaluatePosition());

          resolve(result.added);
        };

        requestAnimationFrame(() => requestAnimationFrame(finalize));
        setTimeout(finalize, 200);
      });
    } catch {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
      return 0;
    }
  }, [messagesContainerRef, loadOlderMessages, evaluatePosition]);

  const loadBatchRef = useRef(loadBatch);
  loadBatchRef.current = loadBatch;

  // Trigger a load if the user is within range of the top
  const maybeLoadOlder = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (isLoadingOlderRef.current || isHistoryLoadingRef.current) return;
    if (!hasMoreHistoryRef.current) return;

    if (container.scrollTop < container.clientHeight * 2) {
      void loadBatchRef.current();
    }
  }, [messagesContainerRef]);

  // IntersectionObserver for pre-loading
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = messagesContainerRef.current;
    if (!sentinel || !container) return;

    let disposed = false;
    let chainRunning = false;

    const loadChain = async () => {
      if (chainRunning || disposed) return;
      chainRunning = true;

      let retries = 0;
      while (!disposed && retries < 50) {
        if (!hasMoreHistoryRef.current) break;

        if (isLoadingOlderRef.current || isHistoryLoadingRef.current) {
          retries++;
          await new Promise<void>((r) => setTimeout(() => r(), 100));
          continue;
        }

        retries = 0;
        const added = await loadBatchRef.current();
        if (added === 0 || disposed) break;

        await new Promise<void>((r) => requestAnimationFrame(() => r()));
        if (disposed) break;

        const sentinelRect = sentinel.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const distAbove = containerRect.top - sentinelRect.bottom;
        if (distAbove > container.clientHeight * 3) break;
      }

      chainRunning = false;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !disposed) {
          void loadChain();
        }
      },
      {
        root: container,
        rootMargin: '10000px 0px 0px 0px',
      },
    );

    observer.observe(sentinel);

    return () => {
      disposed = true;
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesContainerRef, selectedPlayerId]);

  // Scroll handler: position tracking + fallback load trigger
  const handleScroll = useCallback(() => {
    if (isAutoScrollingRef.current) return;

    const now = performance.now();
    if (now - lastScrollTimeRef.current < SCROLL_THROTTLE_MS) return;
    lastScrollTimeRef.current = now;

    evaluatePosition();
    maybeLoadOlder();
  }, [evaluatePosition, maybeLoadOlder]);

  // After initial history finishes, start pre-filling
  useEffect(() => {
    if (!isHistoryLoadingMessages && hasMoreHistory) {
      const timer = setTimeout(() => maybeLoadOlder(), 300);
      return () => clearTimeout(timer);
    }
  }, [isHistoryLoadingMessages, hasMoreHistory, maybeLoadOlder]);

  // End-of-history toast
  useEffect(() => {
    if (hasMoreHistory || hasShownEndToastRef.current || !addToast) return;

    const container = messagesContainerRef.current;
    if (container && container.scrollTop < container.clientHeight) {
      hasShownEndToastRef.current = true;
      addToast({
        type: 'info',
        title: 'End of conversation',
        description: "You've reached the beginning of the conversation.",
      });
    }
  }, [hasMoreHistory, addToast, messagesContainerRef]);

  // Reset on player change
  useEffect(() => {
    if (selectedPlayerId === previousPlayerIdRef.current) return;
    previousPlayerIdRef.current = selectedPlayerId;

    clearCooldown();
    setIsUserAtBottom(true);
    setIsLoadingOlder(false);
    hasShownEndToastRef.current = false;
    hasUserManuallyScrolledRef.current = false;
    isLoadingOlderRef.current = false;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
          setTimeout(() => {
            if (messagesContainerRef.current) {
              messagesContainerRef.current.scrollTop =
                messagesContainerRef.current.scrollHeight;
            }
          }, 80);
        }
      });
    });
  }, [selectedPlayerId, clearCooldown, messagesContainerRef]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pendingScrollRef.current) clearTimeout(pendingScrollRef.current);
    };
  }, []);

  return {
    isUserAtBottom,
    isLoadingOlder,
    sentinelRef,
    scrollToBottom,
    handleScroll,
  };
}
