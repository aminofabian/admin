'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Badge, Button, Drawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState, ErrorState, GameForm, LoadingState, StoreBalanceModal } from '@/components/features';
import { useGamesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Game, UpdateGameRequest, CheckStoreBalanceResponse, ApiError } from '@/types';

// Hardcoded dashboard URLs mapping by game title/code
const GAME_DASHBOARD_URLS: Record<string, string> = {
  GAMEROOM: 'https://agentserver.gameroom777.com',
  CASHMACHINE: 'https://agentserver.cashmachine777.com',
  MRALLINONE: 'https://agentserver.mrallinone777.com',
  MAFIA: 'https://agentserver.mafia77777.com',
  CASHFRENZY: 'https://agentserver.cashfrenzy777.com',
  KINGOFPOP: 'http://agentserver.slots88888.com:8003',
  GAMEVAULT: 'https://agent.gamevault999.com',
  VEGASSWEEPS: 'https://agent.lasvegassweeps.com',
  JUWA: 'https://ht.juwa777.com',
  ORIONSTARS: 'https://orionstars.vip:8781',
  PANDAMASTER: 'https://www.pandamaster.vip',
  MILKYWAY: 'https://milkywayapp.xyz:8781',
  FIREKIRIN: 'https://firekirin.xyz:8888',
  VBLINK: 'https://gm.vblink777.club',
  EGAME: 'https://pko.egame99.club',
  ULTRAPANDA: 'https://ht.ultrapanda.mobi',
  RIVERSWEEPS: 'https://river-pay.com',
};

/**
 * Get the dashboard URL for a game, checking both title and code (case-insensitive)
 */
function getGameDashboardUrl(game: Game): string | undefined {
  const titleUpper = game.title.toUpperCase().trim();
  const codeUpper = game.code?.toUpperCase().trim() ?? '';
  
  // Check by title first
  if (GAME_DASHBOARD_URLS[titleUpper]) {
    return GAME_DASHBOARD_URLS[titleUpper];
  }
  
  // Check by code
  if (codeUpper && GAME_DASHBOARD_URLS[codeUpper]) {
    return GAME_DASHBOARD_URLS[codeUpper];
  }
  
  // Fall back to stored dashboard_url if no hardcoded match
  return game.dashboard_url;
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
    const gamesList = data ?? [];
    // Sort alphabetically by title (A to Z)
    return [...gamesList].sort((a, b) => a.title.localeCompare(b.title));
  }, [data]);
  const totalCount = games.length;
  const stats = useMemo(() => buildGameStats(games, totalCount), [games, totalCount]);

  useEffect(() => {
    if (canManageGames) {
      fetchGames();
    }
  }, [fetchGames, canManageGames]);

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

  if (isLoading && !data) {
    return <LoadingState />;
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(stat => (
          <div
            key={stat.title}
            className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">{stat.title}</div>
                <div className="mt-2 text-2xl font-semibold text-foreground">{stat.value}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
                {stat.icon}
              </div>
            </div>
            {stat.helper && <div className="mt-2 text-sm text-muted-foreground">{stat.helper}</div>}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!games.length ? (
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
}

function buildGameStats(games: Game[], total: number): GameStat[] {
  const active = games.filter((game) => game.game_status).length;
  const inactive = games.filter((game) => !game.game_status).length;

  return [
    {
      title: 'Total Games',
      value: total.toLocaleString(),
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6-3 6 3m-12 0v6l6 3m0-6l6-3m-6 3v6" />
        </svg>
      ),
    },
    {
      title: 'Active',
      value: active.toLocaleString(),
      variant: 'success',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Inactive',
      value: inactive.toLocaleString(),
      variant: 'danger',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
    <div className="hidden lg:block overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Game</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dashboard URL</TableHead>
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

