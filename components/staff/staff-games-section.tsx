'use client';

import { useEffect, useMemo } from 'react';
import { Badge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState } from '@/components/features';
import { useGamesStore } from '@/stores';
import type { Game } from '@/types';

/**
 * Get the dashboard URL for a game from the API response
 */
function getGameDashboardUrl(game: Game): string | undefined {
  return game.dashboard_url || undefined;
}

/**
 * Staff Games Section - Read-only
 * Shows games but does not allow editing
 */
export function StaffGamesSection() {
  const {
    games: data,
    isLoading,
    error,
    fetchGames,
  } = useGamesStore();

  const games = useMemo<Game[]>(() => {
    if (!data || !Array.isArray(data)) {
      return [];
    }
    return [...data].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);

  const totalCount = games.length;
  const activeCount = games.filter((game) => game.game_status).length;
  const inactiveCount = games.filter((game) => !game.game_status).length;

  useEffect(() => {
    if (!data && !isLoading) {
      fetchGames();
    }
  }, [data, isLoading, fetchGames]);

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <div className="flex flex-col shrink-0">
              <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => fetchGames()}
      />
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
            </svg>
          </div>
          <div className="flex flex-col shrink-0">
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Games
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
              {totalCount.toLocaleString()} {totalCount === 1 ? 'game' : 'games'} • {activeCount} active • {inactiveCount} inactive
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6-3 6 3m-12 0v6l6 3m0-6l6-3m-6 3v6" />
              </svg>
            </div>
            <div className="w-full">
              <div className="text-xs text-gray-600 dark:text-gray-400">Total Games</div>
              <div className="mt-0.5 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{totalCount.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="w-full">
              <div className="text-xs text-gray-600 dark:text-gray-400">Active</div>
              <div className="mt-0.5 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{activeCount.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 shrink-0">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728" />
              </svg>
            </div>
            <div className="w-full">
              <div className="text-xs text-gray-600 dark:text-gray-400">Inactive</div>
              <div className="mt-0.5 text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">{inactiveCount.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Games Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!games.length ? (
          <div className="py-12">
            <EmptyState
              title="No Games found"
              description="No games are available at this time"
            />
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
              {games.map(game => (
                <div
                  key={game.id}
                  className="border rounded-lg p-4 space-y-3 bg-white dark:bg-gray-800 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">
                        {game.title}
                      </div>
                    </div>
                    <Badge variant={game.game_status ? 'success' : 'danger'}>
                      {game.game_status ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  {getGameDashboardUrl(game) && (
                    <div className="text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Dashboard URL:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-gray-100 break-all">
                        {getGameDashboardUrl(game)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dashboard URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {games.map(game => (
                    <TableRow
                      key={game.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <TableCell>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{game.title}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.game_status ? 'success' : 'danger'}>
                          {game.game_status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const dashboardUrl = getGameDashboardUrl(game);
                          return dashboardUrl ? (
                            <a
                              href={dashboardUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                              {dashboardUrl}
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

