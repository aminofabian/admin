import { useRef, useCallback } from 'react';
import type { ChatMessage } from '@/types';

interface CachedPage {
  messages: ChatMessage[];
  page: number;
  totalPages: number;
  timestamp: number;
  notes?: string;
}

interface MessageCache {
  [chatKey: string]: {
    [page: number]: CachedPage;
  };
}

// Global cache shared across all instances
const globalCache: MessageCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Hook for caching and prefetching messages
 * Provides synchronous cache access and async prefetching
 */
export function useMessageCache() {
  const prefetchQueueRef = useRef<Set<string>>(new Set()); // Track ongoing prefetches

  // Generate cache key from chat identifiers
  const getCacheKey = useCallback((chatId: string | null, userId: number | null): string => {
    return `chat_${chatId || 'null'}_user_${userId || 'null'}`;
  }, []);

  // Check if cache entry is still valid
  const isCacheValid = useCallback((cached: CachedPage): boolean => {
    const age = Date.now() - cached.timestamp;
    return age < CACHE_TTL;
  }, []);

  /**
   * Get messages from cache synchronously
   * Returns null if not cached or expired
   */
  const getCachedPage = useCallback(
    (chatId: string | null, userId: number | null, page: number): CachedPage | null => {
      const cacheKey = getCacheKey(chatId, userId);
      const cached = globalCache[cacheKey]?.[page];

      if (!cached) {
        return null;
      }

      if (!isCacheValid(cached)) {
        // Remove expired cache
        delete globalCache[cacheKey][page];
        return null;
      }

      return cached;
    },
    [getCacheKey, isCacheValid],
  );

  /**
   * Store messages in cache
   */
  const setCachedPage = useCallback(
    (
      chatId: string | null,
      userId: number | null,
      page: number,
      messages: ChatMessage[],
      totalPages: number,
      notes?: string,
    ): void => {
      const cacheKey = getCacheKey(chatId, userId);

      if (!globalCache[cacheKey]) {
        globalCache[cacheKey] = {};
      }

      globalCache[cacheKey][page] = {
        messages,
        page,
        totalPages,
        timestamp: Date.now(),
        notes,
      };
    },
    [getCacheKey],
  );

  /**
   * Check if page is cached (synchronous check)
   */
  const isPageCached = useCallback(
    (chatId: string | null, userId: number | null, page: number): boolean => {
      return getCachedPage(chatId, userId, page) !== null;
    },
    [getCachedPage],
  );

  /**
   * Prefetch a page in the background
   * Returns a promise that resolves when prefetch is complete
   */
  const prefetchPage = useCallback(
    async (
      chatId: string | null,
      userId: number | null,
      page: number,
      fetchFn: (page: number) => Promise<{
        messages: ChatMessage[];
        page: number;
        totalPages: number;
        notes?: string;
      } | null>,
    ): Promise<void> => {
      const cacheKey = getCacheKey(chatId, userId);
      const prefetchKey = `${cacheKey}_${page}`;

      // Skip if already cached or prefetching
      if (isPageCached(chatId, userId, page) || prefetchQueueRef.current.has(prefetchKey)) {
        return;
      }

      prefetchQueueRef.current.add(prefetchKey);

      try {
        const result = await fetchFn(page);
        if (result) {
          setCachedPage(chatId, userId, page, result.messages, result.totalPages, result.notes);
        }
      } catch (error) {
        console.error(`❌ Failed to prefetch page ${page}:`, error);
      } finally {
        prefetchQueueRef.current.delete(prefetchKey);
      }
    },
    [getCacheKey, isPageCached, setCachedPage],
  );

  /**
   * Prefetch multiple pages in parallel (for prefetching ahead)
   */
  const prefetchPages = useCallback(
    async (
      chatId: string | null,
      userId: number | null,
      pages: number[],
      fetchFn: (page: number) => Promise<{
        messages: ChatMessage[];
        page: number;
        totalPages: number;
        notes?: string;
      } | null>,
    ): Promise<void> => {
      // Filter out already cached pages
      const pagesToFetch = pages.filter((page) => !isPageCached(chatId, userId, page));

      if (pagesToFetch.length === 0) {
        return;
      }

      // Prefetch in parallel (but limit concurrency)
      const prefetchPromises = pagesToFetch.slice(0, 3).map((page) =>
        prefetchPage(chatId, userId, page, fetchFn),
      );

      await Promise.all(prefetchPromises);
    },
    [isPageCached, prefetchPage],
  );

  /**
   * Clear cache for a specific chat
   */
  const clearCache = useCallback(
    (chatId: string | null, userId: number | null): void => {
      const cacheKey = getCacheKey(chatId, userId);
      delete globalCache[cacheKey];
    },
    [getCacheKey],
  );

  /**
   * Clear all caches (useful for memory management)
   */
  const clearAllCaches = useCallback((): void => {
    Object.keys(globalCache).forEach((key) => {
      delete globalCache[key];
    });
  }, []);

  /**
   * Get cache statistics (for debugging)
   */
  const getCacheStats = useCallback(
    (chatId: string | null, userId: number | null): {
      cachedPages: number[];
      totalCached: number;
    } => {
      const cacheKey = getCacheKey(chatId, userId);
      const chatCache = globalCache[cacheKey];

      if (!chatCache) {
        return { cachedPages: [], totalCached: 0 };
      }

      const cachedPages = Object.keys(chatCache)
        .map(Number)
        .filter((page) => {
          const cached = chatCache[page];
          return cached && isCacheValid(cached);
        })
        .sort((a, b) => a - b);

      return {
        cachedPages,
        totalCached: cachedPages.length,
      };
    },
    [getCacheKey, isCacheValid],
  );

  return {
    getCachedPage,
    setCachedPage,
    isPageCached,
    prefetchPage,
    prefetchPages,
    clearCache,
    clearAllCaches,
    getCacheStats,
  };
}

