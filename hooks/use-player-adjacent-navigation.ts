'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types';
import { playersApi } from '@/lib/api';
import { useToast } from '@/components/ui';
import {
  buildPlayerDetailHref,
  extractPlayerListFilterSearchParams,
  playerListApiParamsFromSearchParams,
} from '@/lib/players/player-list-filter-params';
import {
  hasEnoughScannedContext,
  pickAdjacentPlayerId,
  type AdjacentPlayerResult,
} from '@/lib/players/player-list-navigation';

type NavDirection = 'previous' | 'next' | null;

interface UsePlayerAdjacentNavigationOptions {
  selectedPlayer: Player | null;
  onNavigateToChat: () => void;
}

/**
 * Prev/next player navigation (paginated list scan) + keyboard shortcuts [, ], c.
 * Steps through players in the order the list API returns them, so the buttons match
 * the rows on screen. Filter query params on the detail URL keep navigation inside
 * that filtered list.
 */
export function usePlayerAdjacentNavigation({
  selectedPlayer,
  onNavigateToChat,
}: UsePlayerAdjacentNavigationOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const [playerNavDirection, setPlayerNavDirection] = useState<NavDirection>(null);

  const filterSearchParams = useMemo(
    () => extractPlayerListFilterSearchParams(searchParams),
    [searchParams],
  );

  const listFilterApiParams = useMemo(
    () => playerListApiParamsFromSearchParams(filterSearchParams),
    [filterSearchParams],
  );

  const hasActiveFilters = filterSearchParams.toString().length > 0;

  const findAdjacentPlayerId = useCallback(
    async (currentId: number, direction: 'previous' | 'next'): Promise<AdjacentPlayerResult> => {
      const PAGE_SIZE = 100;
      const MAX_PAGES_TO_SCAN = 100;
      let page = 1;
      let hasNext = true;
      let scannedPages = 0;
      const orderedIds: number[] = [];

      while (hasNext && scannedPages < MAX_PAGES_TO_SCAN) {
        const response = await playersApi.list({
          ...listFilterApiParams,
          page,
          page_size: PAGE_SIZE,
        });
        const results = Array.isArray(response?.results) ? response.results : [];

        for (const player of results) {
          if (typeof player.id === 'number') {
            orderedIds.push(player.id);
          }
        }

        if (hasEnoughScannedContext(orderedIds, currentId, direction)) {
          break;
        }

        hasNext = Boolean(response?.next);
        page += 1;
        scannedPages += 1;
      }

      return pickAdjacentPlayerId(orderedIds, currentId, direction);
    },
    [listFilterApiParams],
  );

  const handleNavigateToAdjacentPlayer = useCallback(
    async (direction: 'previous' | 'next') => {
      if (!selectedPlayer || playerNavDirection) {
        return;
      }

      setPlayerNavDirection(direction);
      try {
        const result = await findAdjacentPlayerId(selectedPlayer.id, direction);
        const listLabel = hasActiveFilters ? 'filtered players list' : 'players list';

        if (result.status === 'not-in-list') {
          addToast({
            type: 'info',
            title: 'Player not in list',
            description: `"${selectedPlayer.username}" is no longer part of the ${listLabel}, so there is nothing to move to.`,
          });
          return;
        }

        if (result.status === 'end') {
          addToast({
            type: 'info',
            title: 'No more players',
            description:
              direction === 'next'
                ? `You are on the last player of the ${listLabel}.`
                : `You are on the first player of the ${listLabel}.`,
          });
          return;
        }

        router.push(buildPlayerDetailHref(result.id, filterSearchParams));
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
    [
      selectedPlayer,
      playerNavDirection,
      findAdjacentPlayerId,
      addToast,
      router,
      filterSearchParams,
      hasActiveFilters,
    ],
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
