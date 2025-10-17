'use client';

import { useState, useEffect } from 'react';
import { useGamesStore } from '@/stores';
import { 
  Card, 
  CardHeader, 
  CardContent, 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Pagination,
  SearchInput,
  Button,
  Modal,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, GameForm } from '@/components/features';
import { formatDate } from '@/lib/utils/formatters';
import type { Game, UpdateGameRequest } from '@/types';

export default function GamesPage() {
  const {
    games: data,
    isLoading,
    error: storeError,
    currentPage,
    pageSize,
    searchTerm: storeSearchTerm,
    fetchGames,
    updateGame,
    setPage,
    setSearchTerm,
  } = useGamesStore();

  const [localSearchTerm, setLocalSearchTerm] = useState(storeSearchTerm);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Debounced search implementation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchTerm !== storeSearchTerm) {
        setSearchTerm(localSearchTerm);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [localSearchTerm, storeSearchTerm, setSearchTerm]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleUpdateGame = async (formData: UpdateGameRequest) => {
    if (!selectedGame) return;
    
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await updateGame(selectedGame.id, formData);
      
      setSuccessMessage('Game updated successfully!');
      setIsEditModalOpen(false);
      setSelectedGame(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update game';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (game: Game) => {
    if (!confirm(`Are you sure you want to ${game.game_status ? 'disable' : 'enable'} ${game.title}?`)) {
      return;
    }

    try {
      await updateGame(game.id, { game_status: !game.game_status });
      setSuccessMessage(`Game ${game.game_status ? 'disabled' : 'enabled'} successfully!`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update game status';
      setSubmitError(errorMessage);
    }
  };

  const openEditModal = (game: Game) => {
    setSelectedGame(game);
    setIsEditModalOpen(true);
    setSubmitError('');
  };

  const closeModals = () => {
    setIsEditModalOpen(false);
    setSelectedGame(null);
    setSubmitError('');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (storeError && !data) {
    return <ErrorState message={storeError} onRetry={fetchGames} />;
  }

  // Calculate stats
  const totalGames = data?.count || 0;
  const activeGames = data?.results?.filter(g => g.game_status).length || 0;
  const inactiveGames = data?.results?.filter(g => !g.game_status).length || 0;
  const uniqueCategories = new Set(data?.results?.map(g => g.game_category)).size || 0;

  // Category breakdown
  const categoryBreakdown = data?.results?.reduce((acc, game) => {
    const category = game.game_category;
    if (!acc[category]) {
      acc[category] = { total: 0, active: 0, inactive: 0 };
    }
    acc[category].total += 1;
    if (game.game_status) {
      acc[category].active += 1;
    } else {
      acc[category].inactive += 1;
    }
    return acc;
  }, {} as Record<string, { total: number; active: number; inactive: number }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Games Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage all available games and their status
          </p>
        </div>
        <div className="bg-muted dark:bg-muted/50 px-4 py-2 rounded-lg text-sm text-muted-foreground">
          <strong>Note:</strong> Games are manually created by system admins
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 px-4 py-3 flex items-center justify-between rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 flex items-center gap-2 rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{submitError}</span>
        </div>
      )}

      {/* Primary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Games</p>
                <h3 className="text-2xl font-bold mt-1">{totalGames}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Games</p>
                <h3 className="text-2xl font-bold mt-1 text-green-600 dark:text-green-500">{activeGames}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Inactive Games</p>
                <h3 className="text-2xl font-bold mt-1 text-red-600 dark:text-red-500">{inactiveGames}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Categories</p>
                <h3 className="text-2xl font-bold mt-1">{uniqueCategories}</h3>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown && Object.keys(categoryBreakdown).length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Category Breakdown</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(categoryBreakdown).map(([category, stats]) => (
                <div key={category} className="p-4 border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{category}</span>
                    <Badge variant="default">{stats.total}</Badge>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="text-muted-foreground">{stats.active} active</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="text-muted-foreground">{stats.inactive} inactive</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Games Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">All Games</h2>
            <div className="w-64">
              <SearchInput
                value={localSearchTerm}
                onChange={(e) => setLocalSearchTerm(e.target.value)}
                placeholder="Search by title, code, or category..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <EmptyState 
              title="No games found" 
              description={localSearchTerm ? "Try adjusting your search query" : "No games available in the system"}
            />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game Info</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dashboard</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{game.title}</div>
                          <div className="text-xs text-muted-foreground">ID: {game.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-xs font-mono">{game.code}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="info" className="capitalize">{game.game_category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={game.game_status ? 'success' : 'danger'}>
                          {game.game_status ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {game.dashboard_url ? (
                          <a 
                            href={game.dashboard_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs flex items-center gap-1"
                          >
                            View Dashboard
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">No URL</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(game.created)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditModal(game)}
                            title="Edit game"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            size="sm"
                            variant={game.game_status ? 'danger' : 'primary'}
                            onClick={() => handleToggleStatus(game)}
                            title={game.game_status ? 'Disable game' : 'Enable game'}
                          >
                            {game.game_status ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(data.count / pageSize)}
                  onPageChange={setPage}
                  hasNext={!!data.next}
                  hasPrevious={!!data.previous}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Game Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={closeModals}
        title="Edit Game"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        {selectedGame && (
          <GameForm
            game={selectedGame}
            onSubmit={handleUpdateGame}
            onCancel={closeModals}
            isLoading={isSubmitting}
          />
        )}
      </Modal>
    </div>
  );
}
