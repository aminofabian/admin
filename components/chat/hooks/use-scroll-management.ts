import { useCallback, useRef, useEffect, useState } from 'react';

const LOAD_MORE_SCROLL_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 64;

interface UseScrollManagementProps {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  isHistoryLoadingMessages: boolean;
  hasMoreHistory: boolean;
  loadOlderMessages: () => Promise<{ added: number }>;
  onScrollToTop?: () => void;
}

interface UseScrollManagementReturn {
  isUserAtLatest: boolean;
  autoScrollEnabled: boolean;
  unseenMessageCount: number;
  scrollToLatest: (behavior?: ScrollBehavior) => void;
  setIsUserAtLatest: (value: boolean) => void;
  setAutoScrollEnabled: (value: boolean) => void;
  setUnseenMessageCount: (value: number | ((prev: number) => number)) => void;
}

export function useScrollManagement({
  messagesContainerRef,
  isHistoryLoadingMessages,
  hasMoreHistory,
  loadOlderMessages,
  onScrollToTop,
}: UseScrollManagementProps): UseScrollManagementReturn {
  const [isUserAtLatest, setIsUserAtLatest] = useState(true);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [unseenMessageCount, setUnseenMessageCount] = useState(0);
  
  const isAutoScrollingRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const isLoadingOlderMessagesRef = useRef(false);
  const pendingLoadRequestRef = useRef(false);

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Don't scroll if user is loading older messages
    if (isLoadingOlderMessagesRef.current) return;

    // Check if user is near the top - if so, don't auto-scroll
    const distanceFromTop = container.scrollTop;
    if (distanceFromTop < LOAD_MORE_SCROLL_THRESHOLD * 2) return;

    // During transitions, use instant scroll
    if (isTransitioningRef.current || behavior !== 'smooth') {
      container.scrollTop = container.scrollHeight;
      setIsUserAtLatest(true);
      setAutoScrollEnabled(true);
      setUnseenMessageCount(0);
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      setUnseenMessageCount(0);
    }
  }, []);

  const evaluateScrollPosition = useCallback(() => {
    if (isAutoScrollingRef.current || isLoadingOlderMessagesRef.current) return;

    const container = messagesContainerRef.current;
    if (!container) return;

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

    if (scrollTop > LOAD_MORE_SCROLL_THRESHOLD) {
      pendingLoadRequestRef.current = false;
      return;
    }

    // If blocked, mark as pending
    if (isHistoryLoadingMessages || isLoadingOlderMessagesRef.current || isTransitioningRef.current) {
      if (hasMoreHistory) {
        pendingLoadRequestRef.current = true;
      }
      return;
    }

    if (!hasMoreHistory) {
      pendingLoadRequestRef.current = false;
      return;
    }

    pendingLoadRequestRef.current = false;
    isLoadingOlderMessagesRef.current = true;

    const previousScrollTop = scrollTop;
    const previousScrollHeight = container.scrollHeight;

    try {
      const result = await loadOlderMessages();

      requestAnimationFrame(() => {
        const updatedContainer = messagesContainerRef.current;
        if (!updatedContainer) {
          isLoadingOlderMessagesRef.current = false;
          return;
        }

        if (result.added > 0) {
          const heightDelta = updatedContainer.scrollHeight - previousScrollHeight;
          updatedContainer.scrollTop = previousScrollTop + heightDelta;
        } else {
          updatedContainer.scrollTop = previousScrollTop;
        }

        setTimeout(() => {
          isLoadingOlderMessagesRef.current = false;

          // Check for pending load request
          if (pendingLoadRequestRef.current) {
            const currentContainer = messagesContainerRef.current;
            if (currentContainer && currentContainer.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD) {
              pendingLoadRequestRef.current = false;
              setTimeout(() => {
                handleScroll();
              }, 50);
            } else {
              pendingLoadRequestRef.current = false;
            }
          }
        }, 200);
      });
    } catch (error) {
      console.error('Failed to load older messages:', error);
      isLoadingOlderMessagesRef.current = false;
    }
  }, [hasMoreHistory, isHistoryLoadingMessages, loadOlderMessages]);

  const handleScroll = useCallback(() => {
    evaluateScrollPosition();
    void maybeLoadOlderMessages();
  }, [evaluateScrollPosition, maybeLoadOlderMessages]);

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
  };
}

