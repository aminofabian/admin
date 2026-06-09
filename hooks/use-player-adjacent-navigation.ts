'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/types';
import { playersApi } from '@/lib/api';
import { useToast } from '@/components/ui';

type NavDirection = 'previous' | 'next' | null;

interface UsePlayerAdjacentNavigationOptions {
  selectedPlayer: Player | null;
  onNavigateToChat: () => void;
}

/**
 * Prev/next player navigation (paginated list scan) + keyboard shortcuts [, ], c
 */
export function usePlayerAdjacentNavigation({
  selectedPlayer,
  onNavigateToChat,
}: UsePlayerAdjacentNavigationOptions) {
  const router = useRouter();
  const { addToast } = useToast();
  const [playerNavDirection, setPlayerNavDirection] = useState<NavDirection>(null);

  const findAdjacentPlayerId = useCallback(async (currentId: number, direction: 'previous' | 'next') => {
    const PAGE_SIZE = 100;
    const MAX_PAGES_TO_SCAN = 100;
    let page = 1;
    let hasNext = true;
    let scannedPages = 0;
    let adjacentId: number | null = null;

    while (hasNext && scannedPages < MAX_PAGES_TO_SCAN) {
      const response = await playersApi.list({ page, page_size: PAGE_SIZE });
      const results = Array.isArray(response?.results) ? response.results : [];

      for (const player of results) {
        if (typeof player.id !== 'number') {
          continue;
        }
        if (direction === 'next' && player.id > currentId) {
          adjacentId = adjacentId == null ? player.id : Math.min(adjacentId, player.id);
        }
        if (direction === 'previous' && player.id < currentId) {
          adjacentId = adjacentId == null ? player.id : Math.max(adjacentId, player.id);
        }
      }

      hasNext = Boolean(response?.next);
      page += 1;
      scannedPages += 1;
    }

    return adjacentId;
  }, []);

  const handleNavigateToAdjacentPlayer = useCallback(
    async (direction: 'previous' | 'next') => {
      if (!selectedPlayer || playerNavDirection) {
        return;
      }

      setPlayerNavDirection(direction);
      try {
        const adjacentId = await findAdjacentPlayerId(selectedPlayer.id, direction);

        if (adjacentId == null) {
          addToast({
            type: 'info',
            title: 'No more players',
            description: direction === 'next' ? 'No next player found.' : 'No previous player found.',
          });
          return;
        }

        router.push(`/dashboard/players/${adjacentId}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load adjacent player';
        addToast({
          type: 'error',
          title: 'Navigation failed',
          description: message,
        });
      } finally {
        setPlayerNavDirection(null);
      }
    },
    [selectedPlayer, playerNavDirection, findAdjacentPlayerId, addToast, router],
  );

  useEffect(() => {
    if (!selectedPlayer || playerNavDirection !== null) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (e.key === '[') {
        e.preventDefault();
        void handleNavigateToAdjacentPlayer('previous');
      } else if (e.key === ']') {
        e.preventDefault();
        void handleNavigateToAdjacentPlayer('next');
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onNavigateToChat();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayer, playerNavDirection, handleNavigateToAdjacentPlayer, onNavigateToChat]);

  return { playerNavDirection, handleNavigateToAdjacentPlayer };
}
