'use client';

import { useEffect, useState } from 'react';
import { usePlayersStore } from '@/stores/use-players-store';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { CreatePlayerRequest, UpdateUserRequest, Player } from '@/types';
import { LoadingState, ErrorState, EmptyState, PlayerForm, PlayerViewModal } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer, useToast, ConfirmModal } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { useSearch } from '@/lib/hooks/use-search';

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
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
          <svg className="mx-auto mb-4 h-16 w-16 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h3 className="mb-2 text-xl font-semibold text-foreground">Access Denied</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            You need <strong>company</strong> or <strong>superadmin</strong> privileges to access Player Management.
          </p>
          <div className="rounded-lg bg-white p-3 text-sm shadow-inner">
            <p className="text-muted-foreground">
              Your current role: <span className="font-semibold text-foreground">{user?.role || 'unknown'}</span>
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

  const handleViewPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setIsViewModalOpen(true);
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
      <section className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a3 3 0 11-6 0 3 3 0 016 0zM4 21v-1a7 7 0 017-7h2a7 7 0 017 7v1m-3.5-9H18a2 2 0 002-2v-1a2 2 0 00-2-2h-1" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Players</h2>
              <p className="mt-1 text-sm text-muted-foreground">Manage all player accounts and balances</p>
            </div>
          </div>
          <Button variant="primary" size="md" onClick={() => setIsDrawerOpen(true)} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground shadow-sm hover:bg-primary/90">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Player
          </Button>
        </div>
      </section>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-green-700 transition-colors hover:text-green-800" aria-label="Dismiss success message">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Search */}
      <section className="rounded-2xl border border-border bg-white p-4 shadow-sm">
        <SearchInput
          value={search}
          onChange={handleSearchChange}
          placeholder="Search by username, full name, or email..."
        />
      </section>

      {/* Filters Row */}
      <div className="flex flex-wrap gap-4">
        <div className="min-w-[120px]">
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Status
          </label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            State
          </label>
          <select 
            value={stateFilter} 
            onChange={(e) => setStateFilter(e.target.value)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
          >
            <option value="all">All States</option>
            <option value="CA">California</option>
            <option value="NY">New York</option>
            <option value="TX">Texas</option>
            <option value="FL">Florida</option>
          </select>
        </div>
        <div className="min-w-[120px]">
          <label className="mb-1 block text-sm font-medium text-muted-foreground">
            Date
          </label>
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month' | 'year')}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50"
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Players</div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{data?.count || 0}</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Active Players</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">
            {data?.results?.filter(p => p.is_active).length || 0}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Credit</div>
          <div className="mt-1 text-2xl font-semibold text-blue-600">{formatCurrency(totalBalance)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
          <div className="text-sm text-muted-foreground">Total Winning</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-600">{formatCurrency(totalWinnings)}</div>
        </div>
      </div>

      {/* Enhanced Table with All Data */}
      <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60">
                <TableHead className="min-w-[200px] font-semibold uppercase tracking-wide text-muted-foreground">Username</TableHead>
                <TableHead className="min-w-[200px] font-semibold uppercase tracking-wide text-muted-foreground">Contact</TableHead>
                <TableHead className="min-w-[120px] font-semibold uppercase tracking-wide text-muted-foreground">Credit</TableHead>
                <TableHead className="min-w-[120px] font-semibold uppercase tracking-wide text-muted-foreground">Winning</TableHead>
                <TableHead className="min-w-[100px] font-semibold uppercase tracking-wide text-muted-foreground">Status</TableHead>
                <TableHead className="min-w-[150px] font-semibold uppercase tracking-wide text-muted-foreground">Created</TableHead>
                <TableHead className="min-w-[200px] text-right font-semibold uppercase tracking-wide text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results?.map((player) => {
                const actionStyles = getPlayerActionStyles(player.is_active);

                return (
                  <TableRow key={player.id} className="border-border/40 transition-colors hover:bg-slate-50">
                    {/* Username Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-primary-foreground">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">
                            {player.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {player.full_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <div className="text-sm text-foreground">
                        {player.email}
                      </div>
                    </TableCell>

                    {/* Credit (Balance) */}
                    <TableCell>
                      <div className="text-sm font-semibold text-blue-600">
                        {formatCurrency(player.balance || 0)}
                      </div>
                    </TableCell>

                    {/* Winning */}
                    <TableCell>
                      <div className="text-sm font-semibold text-emerald-600">
                        {formatCurrency(player.winning_balance || 0)}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <Badge variant={player.is_active ? 'success' : 'danger'} className={actionStyles.statusClass}>
                        {player.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>

                    {/* Created Date */}
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(player.created)}
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleViewPlayer(player)}
                          title="View"
                          className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant={player.is_active ? 'danger' : 'primary'}
                          onClick={() => handleToggleStatus(player)}
                          title={actionStyles.toggleLabel}
                          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ${actionStyles.toggleClass}`}
                        >
                          {actionStyles.icon}
                          {actionStyles.toggleLabel}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
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
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg className="h-5 w-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
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
      <PlayerViewModal
        isOpen={isViewModalOpen}
        onClose={closeModals}
        player={selectedPlayer}
      />

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

function getPlayerActionStyles(isActive: boolean) {
  if (isActive) {
    return {
      statusClass: 'border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700',
      toggleClass: 'border border-transparent bg-rose-500 text-white hover:bg-rose-600',
      toggleLabel: 'Deactivate',
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v4m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-11V7a4 4 0 00-8 0v5" />
        </svg>
      ),
    };
  }

  return {
    statusClass: 'border border-rose-200 bg-rose-50 px-3 py-1 text-rose-600',
    toggleClass: 'border border-transparent bg-emerald-500 text-white hover:bg-emerald-600',
    toggleLabel: 'Activate',
    icon: (
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v4m0 0a4 4 0 014 4v2H8v-2a4 4 0 014-4zm0 0v12" />
      </svg>
    ),
  };
}

