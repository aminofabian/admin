'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  DashboardActionBar,
  DashboardSearchBar,
  DashboardSectionContainer,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardStatGrid,
} from '@/components/dashboard/layout';
import { Badge, Button, Drawer, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState, GameForm, StoreBalanceModal } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import { useGamesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Game, UpdateGameRequest, CheckStoreBalanceResponse } from '@/types';
import { useSearch } from '@/lib/hooks';

const HEADER_ICON = (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
  </svg>
);

const EMPTY_STATE = (
  <EmptyState title="No games found" description="No games matched your filters" />
);

export function GamesSection() {
  const { user } = useAuth();
  const {
    games: data,
    isLoading,
    error,
    currentPage,
    searchTerm,
    pageSize,
    balanceCheckLoading,
    fetchGames,
    updateGame,
    checkStoreBalance,
    setPage,
    setSearchTerm,
  } = useGamesStore();

  const { search, debouncedSearch, setSearch } = useSearch(searchTerm);

  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [balanceData, setBalanceData] = useState<CheckStoreBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const canManageGames = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canManageGames) {
      fetchGames();
    }
  }, [fetchGames, canManageGames]);

  useEffect(() => {
    if (debouncedSearch !== undefined && debouncedSearch !== searchTerm) {
      setSearchTerm(debouncedSearch);
    }
  }, [debouncedSearch, searchTerm, setSearchTerm]);

  if (!canManageGames) {
    return (
      <DashboardSectionContainer isLoading={false} error="" isEmpty={false}>
        <AccessDeniedMessage role={user?.role ?? 'unknown'} />
      </DashboardSectionContainer>
    );
  }

  const games = data?.results ?? [];
  const stats = useMemo(() => buildGameStats(games, data?.count ?? 0), [games, data?.count]);

  const isInitialLoading = isLoading && !data;
  const showEmptyState = !games.length && !searchTerm;

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchGames}
      isEmpty={showEmptyState}
      emptyState={EMPTY_STATE}
    >
      <DashboardSectionHeader
        title="Games"
        description="Manage all available games and their status"
        icon={HEADER_ICON}
      />

      <DashboardActionBar>
        <DashboardSearchBar
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, code, or category"
        />
      </DashboardActionBar>

      <DashboardStatGrid>
        {stats.map((stat) => (
          <DashboardStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            helperText={stat.helper}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </DashboardStatGrid>

      <GamesTable
        games={games}
        currentPage={currentPage}
        totalCount={data?.count ?? 0}
        pageSize={pageSize}
        onPageChange={setPage}
        onEditGame={(game) => {
          setEditingGame(game);
          setSubmitError('');
          setIsDrawerOpen(true);
        }}
        onCheckBalance={async (game) => {
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
        onSubmit={async (formData) => {
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
    </DashboardSectionContainer>
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
  const categories = new Set(games.map((game) => game.game_category)).size;

  return [
    {
      title: 'Total Games',
      value: total.toLocaleString(),
      helper: `${games.length} on page`,
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
    {
      title: 'Categories',
      value: categories.toLocaleString(),
      helper: 'Unique game categories',
      variant: 'info',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
  ];
}

interface GamesTableProps {
  games: Game[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onEditGame: (game: Game) => void;
  onCheckBalance: (game: Game) => Promise<void>;
}

function GamesTable({
  games,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onEditGame,
  onCheckBalance,
}: GamesTableProps) {
  if (!games.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {games.map((game) => (
              <TableRow key={game.id}>
                <TableCell className="text-muted-foreground">{game.id}</TableCell>
                <TableCell className="font-medium text-foreground">{game.title}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{game.code}</code>
                </TableCell>
                <TableCell>
                  <Badge variant="info" className="capitalize">
                    {game.game_category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={game.game_status ? 'success' : 'danger'}>
                    {game.game_status ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(game.created)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onCheckBalance(game)}
                      title="Check store balance"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditGame(game)}
                      title="Edit game"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {totalCount > pageSize && (
        <div className="border-t border-border px-4 py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalCount / pageSize)}
            onPageChange={onPageChange}
            hasNext={currentPage * pageSize < totalCount}
            hasPrevious={currentPage > 1}
          />
        </div>
      )}
    </div>
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

interface AccessDeniedMessageProps {
  role: string;
}

function AccessDeniedMessage({ role }: AccessDeniedMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/40 bg-destructive/5 p-8 text-center">
      <svg className="h-12 w-12 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.64 5.64l12.72 12.72M4.93 4.93A10 10 0 1121 12 10 10 0 014.93 4.93z" />
      </svg>
      <div>
        <h3 className="text-lg font-semibold text-foreground">Access denied</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You need superadmin or company privileges to manage games. Current role: <span className="font-medium text-foreground">{role}</span>
        </p>
      </div>
    </div>
  );
}

function mapStatusVariant(status: boolean): 'success' | 'danger' {
  return status ? 'success' : 'danger';
}


