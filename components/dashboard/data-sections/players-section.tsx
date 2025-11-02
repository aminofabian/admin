'use client';

import { useEffect, useState } from 'react';
import { usePlayersStore } from '@/stores/use-players-store';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { CreatePlayerRequest, UpdateUserRequest, Player } from '@/types';
import { LoadingState, ErrorState, EmptyState, PlayerForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer, Modal, useToast, ConfirmModal } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { useSearch } from '@/lib/hooks/use-search';
import { playersApi } from '@/lib/api';

const PLAYER_UPDATE_SUCCESS_TITLE = 'Player updated';
const PLAYER_UPDATE_ERROR_TITLE = 'Update failed';
const PLAYER_UPDATE_ERROR_DEFAULT = 'Failed to update player status';

export function PlayersSection() {
  const { user } = useAuth();
  const { 
    players: data, 
    isLoading: loading, 
    error, 
    currentPage, 
    searchTerm, 
    pageSize,
    fetchPlayers, 
    createPlayer,
    updatePlayer,
    setPage, 
    setSearchTerm,
    statusFilter,
    stateFilter,
    dateFilter,
    setStatusFilter,
    setStateFilter,
    setDateFilter,
  } = usePlayersStore();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Debounced search UX
  const { search, debouncedSearch, setSearch } = useSearch(searchTerm);
  
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
  
  const { addToast } = useToast();

  const canManagePlayers = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canManagePlayers) {
      fetchPlayers();
    }
  }, [fetchPlayers, canManagePlayers]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (!canManagePlayers) {
      return;
    }

    if (debouncedSearch !== searchTerm) {
      setSearchTerm(debouncedSearch);
    }
  }, [canManagePlayers, debouncedSearch, searchTerm, setSearchTerm]);

  if (!canManagePlayers) {
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
            You need <strong>company</strong> or <strong>superadmin</strong> privileges to access Player Management.
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
  if (error) return <ErrorState message={error} onRetry={fetchPlayers} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No players found" />;
  }

  // Use the formatCurrency from formatters instead of local function

  const totalBalance = data?.results?.reduce((sum, player) => sum + parseFloat(player.balance || '0'), 0) || 0;
  const totalWinnings = data?.results?.reduce((sum, player) => sum + parseFloat(player.winning_balance || '0'), 0) || 0;

  const handleCreatePlayer = async (formData: CreatePlayerRequest | UpdateUserRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await createPlayer(formData as CreatePlayerRequest);
      
      setSuccessMessage('Player created successfully!');
      setIsDrawerOpen(false);
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
    const playerToToggle = confirmModal.player;
    if (!playerToToggle) {
      return;
    }

    setConfirmModal(prev => ({ ...prev, isLoading: true }));

    try {
      const nextStatus = !playerToToggle.is_active;
      await updatePlayer(playerToToggle.id, { is_active: nextStatus });

      const statusVerb = nextStatus ? 'activated' : 'deactivated';
      addToast({
        type: 'success',
        title: PLAYER_UPDATE_SUCCESS_TITLE,
        description: `"${playerToToggle.username}" has been ${statusVerb} successfully!`,
      });

      setConfirmModal({ isOpen: false, player: null, isLoading: false });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : PLAYER_UPDATE_ERROR_DEFAULT;
      addToast({
        type: 'error',
        title: PLAYER_UPDATE_ERROR_TITLE,
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
    setIsDrawerOpen(false);
    setIsViewModalOpen(false);
    setSelectedPlayer(null);
    setSubmitError('');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Players</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage all player accounts and balances
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setIsDrawerOpen(true)}>
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

      {/* Search */}
      <div className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
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
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
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
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'year')}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Players</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{data?.count || 0}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Active Players</div>
          <div className="text-2xl font-bold text-green-500 mt-1">
            {data?.results?.filter(p => p.is_active).length || 0}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Credit</div>
          <div className="text-2xl font-bold text-blue-500 mt-1">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Winning</div>
          <div className="text-2xl font-bold text-green-500 mt-1">{formatCurrency(totalWinnings)}</div>
        </div>
      </div>

      {/* Enhanced Table with All Data */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Username</TableHead>
                <TableHead className="min-w-[200px]">Contact</TableHead>
                <TableHead className="min-w-[120px]">Credit</TableHead>
                <TableHead className="min-w-[120px]">Winning</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[150px]">Created</TableHead>
                <TableHead className="min-w-[200px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results?.map((player) => (
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
                      {formatCurrency(player.balance || 0)}
                    </div>
                  </TableCell>

                  {/* Winning */}
                  <TableCell>
                    <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(player.winning_balance || 0)}
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
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(data.count / pageSize)}
            hasNext={!!data.next}
            hasPrevious={!!data.previous}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Add Player Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeModals}
        title="Create New Player"
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
        <PlayerForm
          onSubmit={handleCreatePlayer}
          onCancel={closeModals}
          isLoading={isSubmitting}
        />
      </Drawer>

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
            <div className="flex items-center gap-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800/50">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/20">
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
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.email}</p>
              </div>
              
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.mobile_number || 'Not provided'}</p>
              </div>
              
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.dob || 'Not provided'}</p>
              </div>
              
              <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</h4>
                <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.state || 'Not provided'}</p>
              </div>
            </div>

            {/* Financial Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Credit Balance</h4>
                </div>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedPlayer.balance)}</p>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Winning Balance</h4>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedPlayer.winning_balance)}</p>
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
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Created</h4>
              </div>
              <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(selectedPlayer.created)}</p>
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

