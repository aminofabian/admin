'use client';

import { useState, useEffect } from 'react';
import { playersApi } from '@/lib/api';
import { usePagination, useSearch } from '@/lib/hooks';
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
  ConfirmModal
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState, PlayerForm } from '@/components/features';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import type { Player, PaginatedResponse, CreatePlayerRequest, UpdateUserRequest } from '@/types';

export default function PlayersPage() {
  const [data, setData] = useState<PaginatedResponse<Player> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const { page, pageSize, setPage } = usePagination();
  const { search, debouncedSearch, setSearch } = useSearch();
  const { addToast } = useToast();
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    player: Player | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    player: null,
    isLoading: false,
  });

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedSearch, statusFilter, stateFilter, dateFilter]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadPlayers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await playersApi.list({
        page,
        page_size: pageSize,
        search: debouncedSearch || undefined,
        is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
        state: stateFilter === 'all' ? undefined : stateFilter,
        date_filter: dateFilter === 'all' ? undefined : dateFilter,
      });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlayer = async (formData: CreatePlayerRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');

      await playersApi.create(formData as CreatePlayerRequest);

      setSuccessMessage('Player created successfully!');
      setIsCreateModalOpen(false);
      await loadPlayers(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create player';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (player: Player) => {
    setConfirmModal({
      isOpen: true,
      player,
      isLoading: false,
    });
  };

  const handleConfirmToggle = async () => {
    if (!confirmModal.player) return;

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const actionPast = confirmModal.player.is_active ? 'deactivated' : 'activated';
      
      await playersApi.update(confirmModal.player.id, { is_active: !confirmModal.player.is_active });
      
      addToast({
        type: 'success',
        title: 'Player updated',
        description: `"${confirmModal.player.username}" has been ${actionPast} successfully!`,
      });
      
      setConfirmModal({ isOpen: false, player: null, isLoading: false });
      await loadPlayers(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update player status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage,
      });
      setConfirmModal(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleCancelToggle = () => {
    setConfirmModal({ isOpen: false, player: null, isLoading: false });
  };

  const handleViewPlayer = async (player: Player) => {
    // Optimistically show modal immediately with player data
    setSelectedPlayer(player);
    setIsViewModalOpen(true);
    setIsLoadingDetails(true);
    
    try {
      // Fetch transaction details in the background
      const details = await playersApi.viewDetails(player.id);
      
      // Smoothly update with fetched data
      setSelectedPlayer(prev => ({
        ...prev!,
        total_purchases: details.total_purchases,
        total_cashouts: details.total_cashouts,
        total_transfers: details.total_transfers,
      }));
    } catch (error) {
      console.error('Failed to load player details:', error);
      
      // Only show error if it's not a network timeout
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('timeout')) {
        addToast({
          type: 'error',
          title: 'Could not load transaction summary',
          description: 'Please try again or check your connection.',
        });
      }
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const closeModals = () => {
    setIsCreateModalOpen(false);
    setIsViewModalOpen(false);
    setSelectedPlayer(null);
    setSubmitError('');
  };

  if (isLoading && !data) {
    return <LoadingState />;
  }

  if (error && !data) {
    return <ErrorState message={error} onRetry={loadPlayers} />;
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Action */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Players</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage player accounts and their balances
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Player
          </Button>
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

        {/* Search Row */}
        <div className="w-full lg:w-96">
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, full name, or email..."
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              State
            </label>
            <select 
              value={stateFilter} 
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All States</option>
              <option value="CA">California</option>
              <option value="NY">New York</option>
              <option value="TX">Texas</option>
              <option value="FL">Florida</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date
            </label>
            <select 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>
      </div>

      {/* Players Table */}
      <Card>
        <CardContent className="p-0">
          {data?.results.length === 0 ? (
            <div className="py-12">
              <EmptyState 
                title="No players found" 
                description="Get started by creating a new player"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Credit</TableHead>
                      <TableHead>Winning</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.results.map((player) => (
                      <TableRow key={player.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        {/* Username Info */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                              {player.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {player.username}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {player.full_name}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {player.email}
                          </div>
                        </TableCell>

                        {/* Credit (Balance) */}
                        <TableCell>
                          <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {formatCurrency(player.balance)}
                          </div>
                        </TableCell>

                        {/* Winning */}
                        <TableCell>
                          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(player.winning_balance)}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant={player.is_active ? 'success' : 'danger'}>
                            {player.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>

                        {/* Created Date */}
                        <TableCell>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(player.created)}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleViewPlayer(player)}
                              title="View details"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Button>
                            <Button
                              size="sm"
                              variant={player.is_active ? 'danger' : 'primary'}
                              onClick={() => handleToggleStatus(player)}
                              title={player.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {player.is_active ? 'Deactivate' : 'Activate'}
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
                    currentPage={page}
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

      {/* Create Player Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={closeModals}
        title="Create New Player"
        size="md"
      >
        {submitError && (
          <div className="mb-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            {submitError}
          </div>
        )}
        <PlayerForm
          onSubmit={handleCreatePlayer as (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Modal>

      {/* View Player Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={closeModals}
        title="Player Details"
        size="md"
      >
        {selectedPlayer && (
          <div className="space-y-6">
            {/* Player Avatar & Basic Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold">
                {selectedPlayer.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPlayer.username}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{selectedPlayer.full_name}</p>
                <Badge variant={selectedPlayer.is_active ? 'success' : 'danger'} className="mt-1">
                  {selectedPlayer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.email}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.mobile_number || 'Not provided'}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.dob || 'Not provided'}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer?.state || 'Not provided'}</p>
              </div>
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Credit Balance</h4>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(selectedPlayer.balance)}</p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">Winning Balance</h4>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedPlayer.winning_balance)}</p>
              </div>
            </div>

            {/* Transaction Summary */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800/50">
              <h4 className="text-base font-bold text-purple-900 dark:text-purple-200 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Transaction Summary
                {isLoadingDetails && (
                  <svg className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Total Purchases */}
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h5 className="text-xs font-semibold text-purple-700 dark:text-purple-300">Total Purchases</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-7 bg-purple-300/30 dark:bg-purple-700/30 rounded w-24"></div>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-purple-600 dark:text-purple-400 transition-all duration-300">
                      {formatCurrency(selectedPlayer.total_purchases || 0)}
                    </p>
                  )}
                </div>
                
                {/* Total Cashouts */}
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-indigo-200/50 dark:border-indigo-700/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h5 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Total Cashouts</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-7 bg-indigo-300/30 dark:bg-indigo-700/30 rounded w-24"></div>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 transition-all duration-300">
                      {formatCurrency(selectedPlayer.total_cashouts || 0)}
                    </p>
                  )}
                </div>
                
                {/* Total Transfers */}
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-violet-200/50 dark:border-violet-700/50 hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 dark:bg-violet-500/30 flex items-center justify-center">
                      <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h5 className="text-xs font-semibold text-violet-700 dark:text-violet-300">Total Transfers</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="space-y-2 animate-pulse">
                      <div className="h-7 bg-violet-300/30 dark:bg-violet-700/30 rounded w-24"></div>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-violet-600 dark:text-violet-400 transition-all duration-300">
                      {formatCurrency(selectedPlayer.total_transfers || 0)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Created</h4>
              <p className="text-gray-900 dark:text-gray-100">{formatDate(selectedPlayer.created)}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={handleCancelToggle}
        onConfirm={handleConfirmToggle}
        title={`${confirmModal.player?.is_active ? 'Deactivate' : 'Activate'} Player`}
        description={`Are you sure you want to ${confirmModal.player?.is_active ? 'deactivate' : 'activate'} "${confirmModal.player?.username}"?`}
        confirmText={confirmModal.player?.is_active ? 'Deactivate' : 'Activate'}
        variant={confirmModal.player?.is_active ? 'warning' : 'info'}
        isLoading={confirmModal.isLoading}
      />
    </div>
  );
}

