'use client';

import { useEffect, useState } from 'react';
import { useGamesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Game, UpdateGameRequest, CheckStoreBalanceResponse } from '@/types';
import { LoadingState, ErrorState, EmptyState, GameForm, StoreBalanceModal } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer } from '@/components/ui';
import { formatDate } from '@/lib/utils/formatters';

export function GamesSection() {
  const { user } = useAuth();
  const { 
    games: data, 
    isLoading: loading, 
    error, 
    currentPage, 
    searchTerm, 
    pageSize,
    balanceCheckLoading,
    fetchGames,
    updateGame,
    checkStoreBalance, 
    setPage, 
    setSearchTerm 
  } = useGamesStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<Game | null>(null);
  const [balanceData, setBalanceData] = useState<CheckStoreBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const canManageGames = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canManageGames) {
      fetchGames();
    }
  }, [fetchGames, canManageGames]);

  if (!canManageGames) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800/50 rounded-xl p-8 max-w-md text-center">
          <svg className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need <strong>company</strong> or <strong>superadmin</strong> privileges to access Game Management.
          </p>
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm">
            <p className="text-gray-500 dark:text-gray-500">
              Your current role: <span className="font-semibold text-gray-700 dark:text-gray-300">{user?.role || 'unknown'}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchGames} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No games found" />;
  }

  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    setIsDrawerOpen(true);
  };

  const handleUpdateGame = async (formData: UpdateGameRequest) => {
    if (!editingGame) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await updateGame(editingGame.id, formData);
      
      setIsDrawerOpen(false);
      setEditingGame(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update game';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingGame(null);
    setSubmitError('');
  };

  const handleCheckBalance = async (game: Game) => {
    setSelectedGameForBalance(game);
    setIsBalanceModalOpen(true);
    setBalanceData(null);
    setBalanceError(null);

    try {
      const response = await checkStoreBalance({ game_id: game.id });
      setBalanceData(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check balance';
      setBalanceError(errorMessage);
    }
  };

  const handleCloseBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setSelectedGameForBalance(null);
    setBalanceData(null);
    setBalanceError(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">Games</h2>
            <p className="text-muted-foreground mt-1">
              Manage all available games and their status
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title, code, or category..."
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Games</div>
            <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Active Games</div>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {data?.results?.filter(g => g.game_status).length || 0}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Inactive Games</div>
            <div className="text-2xl font-bold text-red-500 mt-1">
              {data?.results?.filter(g => !g.game_status).length || 0}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Categories</div>
            <div className="text-2xl font-bold text-foreground mt-1">
              {new Set(data?.results?.map(g => g.game_category)).size || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Game Title</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((game) => (
              <TableRow key={game.id}>
                <TableCell>{game.id}</TableCell>
                <TableCell className="font-medium">{game.title}</TableCell>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-xs">{game.code}</code>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{game.game_category}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={game.game_status ? 'success' : 'danger'}>
                    {game.game_status ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-600 dark:text-gray-400">
                  {formatDate(game.created)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCheckBalance(game)}
                      title="Check Store Balance"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditGame(game)}
                      title="Edit Game"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(data.count / pageSize)}
              hasNext={!!data.next}
              hasPrevious={!!data.previous}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Edit Game Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Edit Game"
        size="lg"
      >
        {submitError && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{submitError}</span>
          </div>
        )}
        {editingGame && (
          <GameForm
            game={editingGame}
            onSubmit={handleUpdateGame}
            onCancel={handleCloseDrawer}
            isLoading={isSubmitting}
          />
        )}
      </Drawer>

      {/* Store Balance Modal */}
      <StoreBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={handleCloseBalanceModal}
        gameTitle={selectedGameForBalance?.title || ''}
        balanceData={balanceData}
        isLoading={balanceCheckLoading}
        error={balanceError}
      />
    </div>
  );
}

