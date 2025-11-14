'use client';

import { useEffect, useMemo, useState } from 'react';
import type { JSX } from 'react';
import { Badge, Button, Drawer, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState, ErrorState, GameForm, LoadingState, StoreBalanceModal } from '@/components/features';
import { useGamesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Game, UpdateGameRequest, CheckStoreBalanceResponse } from '@/types';

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

  if (error) {
    return <ErrorState message={error} onRetry={fetchGames} />;
  }

  if (!games.length) {
    return <EmptyState title="No games found" description="No games available" />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Games</h2>
            <p className="mt-1 text-sm text-muted-foreground">Manage all available games and their status</p>
          </div>
        </div>
      </section>

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

      <GamesTable
        games={games}
        onEditGame={game => {
          setEditingGame(game);
          setSubmitError('');
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

      <GameEditor
        isOpen={isDrawerOpen}
        game={editingGame}
        isLoading={isSubmitting}
        error={submitError}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingGame(null);
          setSubmitError('');
        }}
        onSubmit={async formData => {
          if (!editingGame) return;
          try {
            setIsSubmitting(true);
            setSubmitError('');
            await updateGame(editingGame.id, formData);
            setIsDrawerOpen(false);
            setEditingGame(null);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to update game';
            setSubmitError(message);
            throw err;
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
      helper: `${games.length} games in catalog`,
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6-3 6 3m-12 0v6l6 3m0-6l6-3m-6 3v6" />
        </svg>
      ),
    },
    {
      title: 'Active',
      value: active.toLocaleString(),
      helper: `${total ? Math.round((active / Math.max(total, 1)) * 100) : 0}% of catalog`,
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
      helper: `${total ? Math.round((inactive / Math.max(total, 1)) * 100) : 0}% awaiting action`,
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
  if (!games.length) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-black/5 transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-black/30">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 bg-muted/40 transition-colors dark:border-slate-800/70 dark:bg-slate-900/60">
              <TableHead className="min-w-[220px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Game</TableHead>
              <TableHead className="min-w-[160px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Status</TableHead>
              <TableHead className="min-w-[200px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Dashboard URL</TableHead>
              <TableHead className="min-w-[200px] text-right font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-300">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map(game => (
              <TableRow
                key={game.id}
                className="border-border/40 transition-colors hover:bg-slate-50 dark:border-slate-800/70 dark:hover:bg-slate-900/50"
              >
                <TableCell className="text-sm font-medium text-foreground">{game.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={game.game_status ? 'success' : 'danger'}
                    className={
                      game.game_status
                        ? 'border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600 dark:border-rose-700/60 dark:bg-rose-950/40 dark:text-rose-300'
                    }
                  >
                    {game.game_status ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-foreground">
                  {game.dashboard_url ? (
                    <a
                      href={game.dashboard_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {game.dashboard_url}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-3">
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
    </section>
  );
}

interface GameEditorProps {
  isOpen: boolean;
  game: Game | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (data: UpdateGameRequest) => Promise<void>;
}

function GameEditor({ isOpen, game, isLoading, error, onClose, onSubmit }: GameEditorProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Edit Game" size="lg">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {game && (
        <GameForm game={game} onSubmit={onSubmit} onCancel={onClose} isLoading={isLoading} />
      )}
    </Drawer>
  );
}

