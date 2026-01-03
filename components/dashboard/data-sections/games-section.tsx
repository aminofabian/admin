'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Badge, Button, Drawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton } from '@/components/ui';
import { EmptyState, ErrorState, GameForm, StoreBalanceModal } from '@/components/features';
import { useGamesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Game, UpdateGameRequest, CheckStoreBalanceResponse, ApiError } from '@/types';

/**
 * Get the dashboard URL for a game from the API response
 */
function getGameDashboardUrl(game: Game): string | undefined {
  // Use dashboard_url from API response (can be edited via the form)
  return game.dashboard_url || undefined;
}

/**
 * Get the playing URL for a game from the API response
 */
function getGamePlayingUrl(game: Game): string | undefined {
  // Use playing_url from API response (can be edited via the form)
  return game.playing_url || undefined;
}

export function GamesSection() {
  const { user } = useAuth();
  const {
    games: data,
    isLoading,
    error,
    balanceCheckLoading,
    fetchGames,
    updateGame,
    checkStoreBalance,
  } = useGamesStore();

  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceData, setBalanceData] = useState<CheckStoreBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const canManageGames = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;
  const games = useMemo<Game[]>(() => {
    // Ensure data is an array before processing
    if (!data || !Array.isArray(data)) {
      return [];
    }
    // Sort alphabetically by title (A to Z)
    return [...data].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);
  const totalCount = games.length;
  const stats = useMemo(() => buildGameStats(games, totalCount), [games, totalCount]);

  useEffect(() => {
    // Only fetch if user has permission, we don't have data, and we're not already loading
    if (canManageGames && !data && !isLoading) {
      fetchGames();
    }
  }, [canManageGames]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canManageGames) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
          <svg className="mx-auto mb-4 h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.64 5.64l12.72 12.72M4.93 4.93A10 10 0 1121 12 10 10 0 014.93 4.93z" />
          </svg>
          <h3 className="mb-2 text-xl font-semibold text-foreground">Access Denied</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            You need <strong>company</strong> or <strong>superadmin</strong> privileges to manage games.
          </p>
          <div className="rounded-lg bg-white p-3 text-sm shadow-inner">
            <p className="text-muted-foreground">
              Your current role: <span className="font-semibold text-foreground">{user?.role ?? 'unknown'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
            <div className="flex-1 min-w-0" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-4 gap-4 px-4 py-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-4 gap-4 px-4 py-4">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-8 w-20 rounded-full" />
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={fetchGames} />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {/* Header - Compact */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        {/* Single compact row - everything in one line */}
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Games
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
        {stats.map(stat => (
          <div
            key={stat.title}
            className="rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none"
          >
            <div className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400">{stat.title}</div>
            <div className="mt-1 text-xl sm:text-2xl font-semibold text-foreground dark:text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!data || !games.length ? (
          <div className="py-12">
            <EmptyState 
              title="No Games found" 
              description="Get started by creating a new Game"
            />
          </div>
        ) : (
          <GamesTable
            games={games}
            onEditGame={game => {
              setEditingGame(game);
              setSubmitError('');
              setFieldErrors({});
              setIsDrawerOpen(true);
            }}
            onCheckBalance={async game => {
              setSelectedGame(game);
              setBalanceError(null);
              setBalanceData(null);
              setIsBalanceModalOpen(true);

              try {
                const response = await checkStoreBalance({ game_id: game.id });
                setBalanceData(response);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to check balance';
                setBalanceError(message);
              }
            }}
          />
        )}
      </div>

      <GameEditor
        isOpen={isDrawerOpen}
        game={editingGame}
        isLoading={isSubmitting}
        error={submitError}
        fieldErrors={fieldErrors}
        onClearFieldError={(field) => {
          setFieldErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors[field];
            return newErrors;
          });
        }}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingGame(null);
          setSubmitError('');
          setFieldErrors({});
        }}
        onSubmit={async formData => {
          if (!editingGame) return;
          try {
            setIsSubmitting(true);
            setSubmitError('');
            setFieldErrors({});
            await updateGame(editingGame.id, formData);
            setIsDrawerOpen(false);
            setEditingGame(null);
            setSubmitError('');
            setFieldErrors({});
          } catch (err) {
            // Extract error message from ApiError structure
            let errorMessage = 'Failed to update game';
            const newFieldErrors: Record<string, string> = {};

            if (err && typeof err === 'object') {
              const apiError = err as ApiError;
              
              // Extract main error message
              errorMessage = apiError.message || apiError.detail || apiError.error || errorMessage;
              
              // Extract field-specific validation errors
              if (apiError.errors && typeof apiError.errors === 'object') {
                Object.entries(apiError.errors).forEach(([field, messages]) => {
                  if (Array.isArray(messages) && messages.length > 0) {
                    // Join multiple error messages for the same field
                    newFieldErrors[field] = messages.join(', ');
                  } else if (typeof messages === 'string') {
                    newFieldErrors[field] = messages;
                  }
                });
              }
              
              // If detail is a string and contains field-specific info, try to parse it
              if (apiError.detail && typeof apiError.detail === 'string' && !newFieldErrors.detail) {
                // Sometimes detail contains JSON with field errors
                try {
                  const parsed = JSON.parse(apiError.detail);
                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                    Object.entries(parsed).forEach(([field, messages]) => {
                      if (Array.isArray(messages) && messages.length > 0) {
                        newFieldErrors[field] = messages.join(', ');
                      } else if (typeof messages === 'string') {
                        newFieldErrors[field] = messages;
                      }
                    });
                  }
                } catch {
                  // detail is not JSON, that's fine
                }
              }
            } else if (err instanceof Error) {
              errorMessage = err.message;
            }

            setSubmitError(errorMessage);
            setFieldErrors(newFieldErrors);
            
            // Don't throw - error is already handled and displayed to user
          } finally {
            setIsSubmitting(false);
          }
        }}
      />

      <StoreBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setSelectedGame(null);
          setBalanceData(null);
          setBalanceError(null);
        }}
        gameTitle={selectedGame?.title ?? ''}
        balanceData={balanceData}
        isLoading={balanceCheckLoading}
        error={balanceError}
      />

    </div>
  );
}

interface GameStat {
  title: string;
  value: string;
  helper?: string;
  variant?: 'default' | 'success' | 'danger' | 'info';
  icon: JSX.Element;
  onClick?: () => void;
}

function buildGameStats(
  games: Game[], 
  total: number
): GameStat[] {
  const active = games.filter((game) => game.game_status).length;
  const inactive = games.filter((game) => !game.game_status).length;

  return [
    {
      title: 'Total Games',
      value: total.toLocaleString(),
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6-3 6 3m-12 0v6l6 3m0-6l6-3m-6 3v6" />
        </svg>
      ),
    },
    {
      title: 'Active',
      value: active.toLocaleString(),
      variant: 'success',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Inactive',
      value: inactive.toLocaleString(),
      variant: 'danger',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728" />
        </svg>
      ),
    },
  ];
}

interface GamesTableProps {
  games: Game[];
  onEditGame: (game: Game) => void;
  onCheckBalance: (game: Game) => Promise<void>;
}

function GamesTable({ games, onEditGame, onCheckBalance }: GamesTableProps) {
  return (
    <>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 py-4">
        {games.map(game => (
          <GameCard
            key={game.id}
            game={game}
            onEditGame={onEditGame}
            onCheckBalance={onCheckBalance}
          />
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
              <TableHead>Playing URL</TableHead>
              <TableHead className="text-right">Actions</TableHead>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(dashboardUrl, '_blank', 'noopener,noreferrer')}
                        title="View dashboard"
                        className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    );
                  })()}
                </TableCell>
                <TableCell>
                  {(() => {
                    const playingUrl = getGamePlayingUrl(game);
                    return playingUrl ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(playingUrl, '_blank', 'noopener,noreferrer')}
                        title="Play game"
                        className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Play
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                    );
                  })()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCheckBalance(game)}
                      title="Check store balance"
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Balance
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditGame(game)}
                      title="Edit game"
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

interface GameCardProps {
  game: Game;
  onEditGame: (game: Game) => void;
  onCheckBalance: (game: Game) => Promise<void>;
}

function GameCard({ game, onEditGame, onCheckBalance }: GameCardProps) {
  const dashboardUrl = getGameDashboardUrl(game);
  const playingUrl = getGamePlayingUrl(game);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Header Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
              {game.title}
            </h3>
          </div>
          <Badge 
            variant={game.game_status ? 'success' : 'danger'} 
            className="text-[10px] px-2 py-0.5 shrink-0"
          >
            {game.game_status ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </div>

      {/* URLs Section */}
      {(dashboardUrl || playingUrl) && (
        <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2.5">
          {dashboardUrl && (
            <div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1.5 font-medium">
                Dashboard URL
              </div>
              <a
                href={dashboardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all transition-colors"
                title={dashboardUrl}
              >
                {dashboardUrl}
              </a>
            </div>
          )}
          {playingUrl && (
            <div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mb-1.5 font-medium">
                Playing URL
              </div>
              <a
                href={playingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline break-all transition-colors"
                title={playingUrl}
              >
                {playingUrl}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions Section */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {dashboardUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(dashboardUrl, '_blank', 'noopener,noreferrer')}
              title="View dashboard"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors touch-manipulation"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="truncate">View</span>
            </Button>
          )}
          {playingUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(playingUrl, '_blank', 'noopener,noreferrer')}
              title="Play game"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors touch-manipulation"
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">Play</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onCheckBalance(game)}
            title="Check store balance"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors touch-manipulation"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="truncate">Balance</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditGame(game)}
            title="Edit game"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors touch-manipulation"
          >
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="truncate">Edit</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface GameEditorProps {
  isOpen: boolean;
  game: Game | null;
  isLoading: boolean;
  error: string;
  fieldErrors?: Record<string, string>;
  onClose: () => void;
  onSubmit: (data: UpdateGameRequest) => Promise<void>;
  onClearFieldError: (field: string) => void;
}

function GameEditor({ isOpen, game, isLoading, error, fieldErrors = {}, onClose, onSubmit, onClearFieldError }: GameEditorProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Edit Game" size="lg">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {game && (
        <GameForm 
          game={game} 
          onSubmit={onSubmit} 
          onCancel={onClose} 
          isLoading={isLoading}
          backendErrors={fieldErrors}
          onClearBackendError={onClearFieldError}
        />
      )}
    </Drawer>
  );
}

