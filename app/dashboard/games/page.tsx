'use client';

import { useState, useEffect } from 'react';
import { useGamesStore } from '@/stores';
import { 
  Card, 
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
  useToast,
  ConfirmModal,
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

  const { addToast } = useToast();

  const [localSearchTerm, setLocalSearchTerm] = useState(storeSearchTerm);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    game: Game | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    game: null,
    isLoading: false,
  });

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
    setConfirmModal({
      isOpen: true,
      game,
      isLoading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.game) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const actionPast = confirmModal.game.game_status ? 'disabled' : 'enabled';
      
      await updateGame(confirmModal.game.id, { game_status: !confirmModal.game.game_status });
      
      addToast({
        type: 'success',
        title: 'Game updated',
        description: `"${confirmModal.game.title}" has been ${actionPast} successfully!`,
      });
      
      setConfirmModal({ isOpen: false, game: null, isLoading: false });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update game status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, game: null, isLoading: false });
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

  return (
    <div className="space-y-6">
      {/* Header with Search and Stats */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Games</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage all available games and their status
            </p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950/30 px-3 py-1.5 rounded-lg text-xs text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
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

        {/* Search and Stats Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="w-full lg:w-96">
            <SearchInput
              value={localSearchTerm}
              onChange={(e) => setLocalSearchTerm(e.target.value)}
              placeholder="Search by title, code, or category..."
            />
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400">Total:</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{totalGames.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Active:</span>
              <span className="font-semibold text-green-600 dark:text-green-400">{activeGames}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Inactive:</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{inactiveGames}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Games Table */}
      <Card>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No games found" 
                description={localSearchTerm ? "Try adjusting your search query" : "No games available in the system"}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Game</TableHead>
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
                      <TableRow key={game.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <TableCell>
                          <div className="font-medium text-gray-900 dark:text-gray-100">{game.title}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ID: {game.id}</div>
                        </TableCell>
                        <TableCell>
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono text-gray-700 dark:text-gray-300">
                            {game.code}
                          </code>
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
                              className="text-blue-600 dark:text-blue-400 hover:underline text-sm flex items-center gap-1"
                            >
                              View
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(game.created)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(game)}
                              title="Edit game"
                              className="hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant={game.game_status ? 'danger' : 'secondary'}
                              onClick={() => handleToggleStatus(game)}
                              title={game.game_status ? 'Disable game' : 'Enable game'}
                            >
                              {game.game_status ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {data && data.count > pageSize && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(data.count / pageSize)}
                    onPageChange={setPage}
                    hasNext={!!data.next}
                    hasPrevious={!!data.previous}
                  />
                </div>
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

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.game?.game_status ? 'Disable' : 'Enable'} Game`}
        description={`Are you sure you want to ${confirmModal.game?.game_status ? 'disable' : 'enable'} "${confirmModal.game?.title}"?`}
        confirmText={confirmModal.game?.game_status ? 'Disable' : 'Enable'}
        variant={confirmModal.game?.game_status ? 'warning' : 'info'}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}
