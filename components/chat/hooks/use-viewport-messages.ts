import { useState, useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/types';

interface UseViewportMessagesProps {
  messages: ChatMessage[];
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  viewportBuffer?: number; // Number of messages to render outside viewport
}

interface UseViewportMessagesReturn {
  visibleMessages: ChatMessage[];
  startIndex: number;
  endIndex: number;
  totalMessages: number;
  topSpacerHeight: number;
  bottomSpacerHeight: number;
}

const ESTIMATED_MESSAGE_HEIGHT = 80; // Average message height in pixels
const SCROLL_UPDATE_THROTTLE = 50; // Faster scroll updates for better responsiveness

/**
 * Hook to determine which messages should be rendered based on viewport visibility
 * Only renders messages that fill the viewport + buffer, revealing more as user scrolls up
 */
export function useViewportMessages({
  messages,
  messagesContainerRef,
  viewportBuffer = 10, // Render 10 extra messages above/below viewport
}: UseViewportMessagesProps): UseViewportMessagesReturn {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const lastScrollTopRef = useRef<number>(0);
  const scrollDirectionRef = useRef<'up' | 'down' | null>(null);
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Calculate how many messages fit in viewport
  const calculateViewportCapacity = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return 0;
    
    const containerHeight = container.clientHeight;
    return Math.ceil(containerHeight / ESTIMATED_MESSAGE_HEIGHT);
  }, [messagesContainerRef]);

  // Initialize visible range - start with messages that fill viewport from bottom
  useEffect(() => {
    if (messages.length === 0 || !messagesContainerRef.current || isInitializedRef.current) {
      return;
    }

    const viewportCapacity = calculateViewportCapacity();
    if (viewportCapacity === 0) return;

    // Start by showing messages from the end (most recent) that fill viewport
    const messagesToShow = viewportCapacity + viewportBuffer;
    const initialEnd = messages.length;
    const initialStart = Math.max(0, initialEnd - messagesToShow);

    setVisibleRange({ start: initialStart, end: initialEnd });
    isInitializedRef.current = true;
  }, [messages.length, messagesContainerRef, viewportBuffer, calculateViewportCapacity]);

  // Check if user is at bottom of scroll
  const isUserAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    
    // Consider "at bottom" if within 100px of bottom
    return distanceFromBottom <= 100;
  }, [messagesContainerRef]);

  // Handle new messages - CRITICAL FIX: Show new messages when appropriate
  useEffect(() => {
    if (messages.length === 0) {
      setVisibleRange({ start: 0, end: 0 });
      isInitializedRef.current = false;
      return;
    }

    const atBottom = isUserAtBottom();

    // ✅ CRITICAL FIX: If user is at bottom and new messages arrive, immediately expand range
    // This fixes the issue where new messages don't show for long histories
    if (atBottom && messages.length > visibleRange.end) {
      const viewportCapacity = calculateViewportCapacity();
      if (viewportCapacity === 0) return;

      // Expand range to include all new messages
      const newEnd = messages.length;
      const newStart = Math.max(0, newEnd - viewportCapacity - viewportBuffer * 2);

      setVisibleRange({
        start: Math.min(visibleRange.start, newStart),
        end: newEnd,
      });

      return;
    }

    // ✅ SMART EXPANSION: If user is not at bottom but new messages arrive,
    // expand the range slightly to indicate new messages are available
    if (!atBottom && messages.length > visibleRange.end) {
      // Increase bottom spacer to show new messages are available
      // But don't force user to see them unless they scroll to bottom
      setVisibleRange(prev => ({
        ...prev,
        // Don't change the range, just let bottom spacer grow naturally
      }));
    }
  }, [messages.length, visibleRange.end, viewportBuffer, isUserAtBottom, calculateViewportCapacity]);

  // Track scroll and update visible range incrementally - PERFORMANCE OPTIMIZED
  const handleScroll = useCallback(() => {
    if (throttleTimerRef.current) {
      return; // Throttled
    }

    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;

      const container = messagesContainerRef.current;
      if (!container || messages.length === 0) return;

      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      // ✅ PERFORMANCE: Skip expensive calculations if scroll position hasn't changed significantly
      const scrollDelta = Math.abs(scrollTop - lastScrollTopRef.current);
      if (scrollDelta < 5 && scrollDirectionRef.current !== null) {
        return; // Skip if minimal scroll change
      }

      // Determine scroll direction
      if (scrollTop < lastScrollTopRef.current) {
        scrollDirectionRef.current = 'up';
      } else if (scrollTop > lastScrollTopRef.current) {
        scrollDirectionRef.current = 'down';
      }
      lastScrollTopRef.current = scrollTop;

      const viewportCapacity = calculateViewportCapacity();
      if (viewportCapacity === 0) return;

      // ✅ PERFORMANCE: Early return for common scenarios to avoid unnecessary calculations
      const maxScroll = scrollHeight - clientHeight;
      const scrollRatio = maxScroll > 0 ? scrollTop / maxScroll : 0;

      // If scrolling near bottom and we're already showing all recent messages, skip heavy calculations
      if (scrollRatio > 0.9 && visibleRange.end >= messages.length - 5) {
        return; // Already showing recent messages, no need to recalculate
      }

      setVisibleRange(prev => {
        // When scrolling up, ensure viewport shows appropriate messages
        if (scrollDirectionRef.current === 'up') {
          // ✅ IMPROVED: Expand viewport range when scrolling up at any position
          // Calculate what should be visible based on current scroll position
          const estimatedFirstVisible = Math.floor(scrollTop / ESTIMATED_MESSAGE_HEIGHT);
          const estimatedLastVisible = estimatedFirstVisible + viewportCapacity;

          // Calculate the optimal range with buffer
          const newStart = Math.max(0, estimatedFirstVisible - viewportBuffer);
          const newEnd = Math.min(messages.length, estimatedLastVisible + viewportBuffer);

          // Only update if the range actually needs to change
          if (newStart < prev.start || newEnd > prev.end) {
            return {
              start: Math.min(prev.start, newStart),
              end: Math.max(prev.end, newEnd),
            };
          }
        }
        
        // When scrolling down, ensure viewport shows appropriate messages
        if (scrollDirectionRef.current === 'down') {
          // ✅ IMPROVED: Expand viewport range when scrolling down at any position
          // Calculate what should be visible based on current scroll position
          const estimatedFirstVisible = Math.floor(scrollTop / ESTIMATED_MESSAGE_HEIGHT);
          const estimatedLastVisible = estimatedFirstVisible + viewportCapacity;

          // Calculate the optimal range with buffer
          const newStart = Math.max(0, estimatedFirstVisible - viewportBuffer);
          const newEnd = Math.min(messages.length, estimatedLastVisible + viewportBuffer);

          // Only update if the range actually needs to change
          if (newStart < prev.start || newEnd > prev.end) {
            return {
              start: Math.min(prev.start, newStart),
              end: Math.max(prev.end, newEnd),
            };
          }
        }
        
        // ✅ CRITICAL: Enhanced new message detection and visibility
        // This ensures new messages are always visible when user is at bottom
        const atBottom = distanceFromBottom <= 100;
        if (atBottom && messages.length > prev.end) {
          // User is at bottom and there are new messages - IMMEDIATELY show them
          const newEnd = messages.length;
          const newStart = Math.max(0, newEnd - viewportCapacity - viewportBuffer * 2);
          return {
            start: Math.min(prev.start, newStart),
            end: newEnd,
          };
        }

        // ✅ AGGRESSIVE EXPANSION: If new messages arrived and we're near bottom, expand range
        const nearBottom = distanceFromBottom <= 200; // More generous threshold
        if (nearBottom && messages.length > prev.end) {
          // User is near bottom - expand range to include new messages
          const additionalMessages = messages.length - prev.end;
          const expansionBonus = Math.min(additionalMessages, viewportBuffer);
          const newEnd = Math.min(messages.length, prev.end + expansionBonus);
          const newStart = Math.max(0, newEnd - viewportCapacity - viewportBuffer * 2);

          return {
            start: Math.min(prev.start, newStart),
            end: newEnd,
          };
        }

        return prev;
      });
    }, SCROLL_UPDATE_THROTTLE);
  }, [messages.length, messagesContainerRef, viewportBuffer, calculateViewportCapacity]);

  // Set up scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Initial calculation
    handleScroll();

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [handleScroll]);

  // Calculate spacer heights to maintain scroll position
  const topSpacerHeight = visibleRange.start * ESTIMATED_MESSAGE_HEIGHT;
  const bottomSpacerHeight = (messages.length - visibleRange.end) * ESTIMATED_MESSAGE_HEIGHT;

  // Get visible messages
  const visibleMessages = messages.slice(visibleRange.start, visibleRange.end);

  return {
    visibleMessages,
    startIndex: visibleRange.start,
    endIndex: visibleRange.end,
    totalMessages: messages.length,
    topSpacerHeight,
    bottomSpacerHeight,
  };
}

