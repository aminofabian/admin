'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, ConfirmModal, DropdownMenu, DropdownMenuItem, Input } from '@/components/ui';
import type { UpdateUserRequest, ApiError } from '@/types';
import { LoadingState, ErrorState, PlayerGameBalanceModal } from '@/components/features';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { usePlayerGames } from '@/hooks/use-player-games';
import type { PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';
import { AddGameDrawer } from '@/components/chat/modals';

import { useTransactionsStore, useTransactionQueuesStore } from '@/stores';

/**
 * Extracts and formats error messages from API errors
 */
function extractErrorMessage(error: unknown): { title: string; message: string } {
  let errorMessage = 'An error occurred';
  let errorTitle = 'Error';
  
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>;
    const apiError = error as ApiError;
    
    if (apiError.errors && typeof apiError.errors === 'object') {
      const errorMessages: string[] = [];
      Object.entries(apiError.errors).forEach(([field, messages]) => {
        if (Array.isArray(messages) && messages.length > 0) {
          const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          errorMessages.push(`${fieldName}: ${messages.join(', ')}`);
        }
      });
      
      if (errorMessages.length > 0) {
        errorMessage = errorMessages.join('; ');
        errorTitle = 'Validation failed';
        return { title: errorTitle, message: errorMessage };
      }
    }
    
    if (apiError.detail && typeof apiError.detail === 'string') {
      errorMessage = apiError.detail;
    } else if (apiError.message) {
      errorMessage = apiError.message;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  }
  
  return { title: errorTitle, message: errorMessage };
}

interface EditableFields {
  email: string;
  full_name: string;
  dob: string;
  state: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
}

interface SuperAdminPlayerDetailProps {
  playerId: number;
}

export function SuperAdminPlayerDetail({ playerId }: SuperAdminPlayerDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<PlayerGame | null>(null);
  const [balanceData, setBalanceData] = useState<CheckPlayerGameBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [editableFields, setEditableFields] = useState<EditableFields>({
    email: '',
    full_name: '',
    dob: '',
    state: '',
    mobile_number: '',
    password: '',
    confirm_password: '',
    is_active: true,
  });

  // Load player data
  useEffect(() => {
    const loadPlayer = async () => {
      try {
        setIsLoadingPlayer(true);
        setError(null);

        const player = await apiClient.get<Player>(API_ENDPOINTS.PLAYERS.DETAIL(playerId));

        setSelectedPlayer(player);
        setEditableFields({
          email: player.email || '',
          full_name: player.full_name || '',
          dob: player.dob || '',
          state: player.state || '',
          mobile_number: player.mobile_number || '',
          password: '',
          confirm_password: '',
          is_active: player.is_active ?? true,
        });

        // Load transaction details
        setIsLoadingDetails(true);
        try {
          const details = await playersApi.viewDetails(player.id);
          setSelectedPlayer((prev) => ({
            ...prev!,
            total_purchases: details.total_purchases,
            total_cashouts: details.total_cashouts,
            total_transfers: details.total_transfers,
          }));
        } catch (error) {
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
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to load player';
        setError(message);
        addToast({
          type: 'error',
          title: 'Failed to load player',
          description: message,
        });
      } finally {
        setIsLoadingPlayer(false);
      }
    };

    void loadPlayer();
  }, [playerId, addToast]);

  const handleSave = useCallback(async () => {
    if (!selectedPlayer) return;

    if (editableFields.password.trim()) {
      if (editableFields.password !== editableFields.confirm_password) {
        addToast({
          type: 'error',
          title: 'Validation error',
          description: 'Passwords do not match. Please check and try again.',
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const updateData: UpdateUserRequest = {
        email: editableFields.email.trim() || undefined,
        full_name: editableFields.full_name.trim() || undefined,
        mobile_number: editableFields.mobile_number.trim() || undefined,
        dob: editableFields.dob.trim() || undefined,
        state: editableFields.state.trim() || undefined,
        is_active: editableFields.is_active,
        ...(editableFields.password.trim()
          ? {
            password: editableFields.password.trim(),
            confirm_password: editableFields.confirm_password.trim(),
          }
          : {}
        ),
      };

      await playersApi.update(selectedPlayer.id, updateData);

      const updatedPlayer = {
        ...selectedPlayer,
        email: editableFields.email.trim() || selectedPlayer.email,
        full_name: editableFields.full_name.trim() || selectedPlayer.full_name,
        mobile_number: editableFields.mobile_number.trim() || selectedPlayer.mobile_number,
        dob: editableFields.dob.trim() || selectedPlayer.dob,
        state: editableFields.state.trim() || selectedPlayer.state,
        is_active: editableFields.is_active,
      };
      setSelectedPlayer(updatedPlayer);

      addToast({
        type: 'success',
        title: 'Player updated',
        description: 'Player details have been updated successfully.',
      });

      setIsEditDrawerOpen(false);
      setEditableFields(prev => ({ ...prev, password: '', confirm_password: '' }));
    } catch (error) {
      const { title, message } = extractErrorMessage(error);
      addToast({
        type: 'error',
        title: title || 'Update failed',
        description: message || 'Failed to update player',
        duration: 8000,
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlayer, editableFields, addToast]);

  const handleDeactivate = useCallback(async () => {
    if (!selectedPlayer) return;

    setIsDeactivating(true);
    try {
      await playersApi.update(selectedPlayer.id, {
        is_active: !selectedPlayer.is_active,
      });

      setSelectedPlayer((prev) => ({
        ...prev!,
        is_active: !prev!.is_active,
      }));

      addToast({
        type: 'success',
        title: 'Player updated',
        description: `"${selectedPlayer.username}" has been ${selectedPlayer.is_active ? 'deactivated' : 'activated'} successfully!`,
      });

      setShowDeactivateModal(false);
    } catch (error) {
      const { title, message } = extractErrorMessage(error);
      addToast({
        type: 'error',
        title: title || 'Update failed',
        description: message || 'Failed to update player status',
        duration: 8000,
      });
    } finally {
      setIsDeactivating(false);
    }
  }, [selectedPlayer, addToast]);

  const handleViewTransactions = useCallback(() => {
    if (!selectedPlayer) return;
    const transactionsStore = useTransactionsStore.getState();
    transactionsStore.setFilterWithoutFetch('history');
    transactionsStore.setAdvancedFiltersWithoutFetch({ username: selectedPlayer.username });
    router.push('/dashboard/history/transactions?preserveFilters=true');
  }, [selectedPlayer, router]);

  const handleViewGameActivities = useCallback(() => {
    if (!selectedPlayer) return;
    const queuesStore = useTransactionQueuesStore.getState();
    queuesStore.setFilterWithoutFetch('history');
    queuesStore.setAdvancedFiltersWithoutFetch({ username: selectedPlayer.username });
    router.push('/dashboard/history/game-activities?preserveFilters=true');
  }, [selectedPlayer, router]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/players');
  }, [router]);

  const handleNavigateToChat = useCallback(() => {
    if (selectedPlayer) {
      const chatUrl = `/dashboard/chat?playerId=${selectedPlayer.id}&username=${encodeURIComponent(selectedPlayer.username)}`;
      router.push(chatUrl);
    }
  }, [selectedPlayer, router]);

  // Load player games
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(playerId);

  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameToChange, setGameToChange] = useState<PlayerGame | null>(null);
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [isAddGameDrawerOpen, setIsAddGameDrawerOpen] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<PlayerGame | null>(null);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [isEditGameDrawerOpen, setIsEditGameDrawerOpen] = useState(false);

  const handleDeleteGame = useCallback(async () => {
    if (!gameToDelete || !selectedPlayer) return;
    setIsDeletingGame(true);
    try {
      await playersApi.deleteGame(gameToDelete.id);
      await refreshGames();
      addToast({
        type: 'success',
        title: 'Game removed',
        description: `"${gameToDelete.game__title}" has been removed from player "${selectedPlayer.username}".`,
      });
      setGameToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete game';
      addToast({
        type: 'error',
        title: 'Delete failed',
        description: message,
      });
    } finally {
      setIsDeletingGame(false);
    }
  }, [gameToDelete, selectedPlayer, refreshGames, addToast]);

  const handleChangeGame = useCallback(async () => {
    if (!gameToChange) return;
    setIsChangingGame(true);
    try {
      const newStatus = gameToChange.status === 'active' ? 'inactive' : 'active';
      await playersApi.updateGame(gameToChange.id, {
        username: gameToChange.username,
        status: newStatus
      });
      await refreshGames();
      addToast({
        type: 'success',
        title: 'Game updated',
        description: `"${gameToChange.game__title}" status has been changed to ${newStatus}.`,
      });
      setGameToChange(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update game';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsChangingGame(false);
    }
  }, [gameToChange, refreshGames, addToast]);

  const handleOpenAddGame = useCallback(() => {
    setIsAddGameDrawerOpen(true);
  }, []);

  const handleAddGame = useCallback(async (data: { username: string; password: string; code: string; user_id: number }) => {
    if (!selectedPlayer || isAddingGame) return;
    setIsAddingGame(true);
    try {
      const result = await playersApi.createGame(data);
      addToast({
        type: 'success',
        title: 'Game added successfully',
        description: `${result.game_name} account created for ${result.username}`,
      });
      setIsAddGameDrawerOpen(false);
      await refreshGames();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to add game',
        description,
      });
    } finally {
      setIsAddingGame(false);
    }
  }, [selectedPlayer, isAddingGame, addToast, refreshGames]);

  const handleEditGame = useCallback(async (data: { username: string; password: string }) => {
    if (!gameToEdit || isEditingGame) return;
    setIsEditingGame(true);
    try {
      await playersApi.updateGame(gameToEdit.id, {
        username: data.username,
        password: data.password,
      });
      addToast({
        type: 'success',
        title: 'Game updated',
        description: `"${gameToEdit.game__title}" credentials have been updated successfully.`,
      });
      setIsEditGameDrawerOpen(false);
      setGameToEdit(null);
      await refreshGames();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to update game',
        description,
      });
    } finally {
      setIsEditingGame(false);
    }
  }, [gameToEdit, isEditingGame, addToast, refreshGames]);

  if (isLoadingPlayer) {
    return <LoadingState />;
  }

  if (error || !selectedPlayer) {
    return (
      <ErrorState
        message={error || 'Player not found'}
        onRetry={() => router.push('/dashboard/players')}
      />
    );
  }

  const usernameInitial = selectedPlayer.username
    ? selectedPlayer.username.charAt(0).toUpperCase()
    : '?';

  const creditBalance = formatCurrency(selectedPlayer.balance ?? 0);
  const winningBalance = formatCurrency(selectedPlayer.winning_balance ?? 0);
  const purchasesTotal = formatCurrency(selectedPlayer.total_purchases ?? 0);
  const cashoutsTotal = formatCurrency(selectedPlayer.total_cashouts ?? 0);
  const transfersTotal = formatCurrency(selectedPlayer.total_transfers ?? 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/95 safe-area-top">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2 sm:py-2.5 md:py-3 lg:py-4">
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1.5 sm:p-2 sm:-ml-2 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200 rounded-lg touch-manipulation"
              aria-label="Back"
            >
              <svg className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 flex-1 min-w-0">
              <button
                onClick={handleNavigateToChat}
                className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-600 text-white font-bold shadow-md text-xs sm:text-sm md:text-base hover:bg-gray-600 dark:hover:bg-gray-500 transition-colors cursor-pointer active:scale-95"
                title="Open chat with this player"
                aria-label="Open chat"
              >
                {usernameInitial}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
                  <button
                    onClick={handleNavigateToChat}
                    className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 lg:text-xl truncate hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer text-left"
                    title="Open chat with this player"
                    aria-label="Open chat"
                  >
                    {selectedPlayer.username}
                  </button>
                  <span className="hidden sm:inline-flex items-center justify-center h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0 rounded">
                    #{selectedPlayer.id}
                  </span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 mt-0.5">
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedPlayer.full_name || 'Player Profile'}
                  </p>
                  {selectedPlayer.created && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 text-[9px] shrink-0">•</span>
                      <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 leading-none shrink-0">
                        {formatDate(selectedPlayer.created)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsEditDrawerOpen(true)}
              className="flex items-center gap-1 sm:gap-1.5 shrink-0 touch-manipulation px-2 sm:px-3 py-1.5 sm:py-2"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline text-xs sm:text-sm">Edit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-safe">
        {/* Hero Stats Banner */}
        <div className="mb-3 sm:mb-4 md:mb-6 bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 md:p-6 shadow-lg border border-gray-200 dark:border-gray-800 rounded-lg">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-3">
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Credit</p>
                  <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{creditBalance}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Winning</p>
                  <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{winningBalance}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Status</p>
                  <div className="mt-0.5">
                    <Badge
                      variant={selectedPlayer.is_active ? 'success' : 'danger'}
                      className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm px-1 sm:px-1.5 md:px-2 lg:px-3 py-0.5 sm:py-0.5 md:py-1"
                    >
                      {selectedPlayer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Grid Layout */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2">
          {/* Column 1: Quick Actions & Personal Information */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Quick Actions Card */}
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-3 sm:mb-4 flex items-center gap-2">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md rounded">
                  <svg className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <Button
                  onClick={handleViewTransactions}
                  variant="primary"
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-center leading-tight">Transactions</span>
                </Button>
                <Button
                  onClick={handleViewGameActivities}
                  variant="primary"
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-center leading-tight">Activities</span>
                </Button>
              </div>
            </section>

            {/* Personal Information Card */}
            <section className="border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-2 sm:mb-3 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Personal Information</h2>
              </div>
              <div className="space-y-1.5">
                <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Email</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 break-all">{selectedPlayer.email}</p>
                </div>
                <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.full_name || '—'}</p>
                </div>
                <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Date of Birth</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.dob || '—'}</p>
                </div>
                <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">State</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.state || '—'}</p>
                </div>
                <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.mobile_number || '—'}</p>
                </div>
                {selectedPlayer.company_username && (
                  <div className="border border-gray-100 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-800/50">
                    <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Company</p>
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.company_username}</p>
                  </div>
                )}
              </div>
            </section>

            {/* Transaction Summary Card */}
            <section className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-purple-200 dark:border-purple-800/50 shadow-sm">
              <div className="mb-3 sm:mb-4 md:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold text-purple-900 dark:text-purple-200">Transaction Summary</h2>
                </div>
                {isLoadingDetails && (
                  <svg className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>
              <div className="flex flex-col 2xl:grid 2xl:grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 2xl:p-2.5 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden">
                  <div className="mb-2 flex items-center gap-1.5 sm:gap-2 2xl:gap-1 min-w-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 2xl:w-5 2xl:h-5 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h5 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-purple-700 dark:text-purple-300 break-words min-w-0">Purchases</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-6 md:h-7 bg-purple-300/30 dark:bg-purple-700/30 rounded w-full animate-pulse" />
                  ) : (
                    <p className="text-sm sm:text-lg md:text-xl lg:text-2xl 2xl:text-lg font-bold text-purple-600 dark:text-purple-400 transition-all duration-300 break-words min-w-0">{purchasesTotal}</p>
                  )}
                </div>
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 2xl:p-2.5 border border-indigo-200/50 dark:border-indigo-700/50 hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden">
                  <div className="mb-2 flex items-center gap-1.5 sm:gap-2 2xl:gap-1 min-w-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 2xl:w-5 2xl:h-5 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h5 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-indigo-700 dark:text-indigo-300 break-words min-w-0">Cashouts</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-6 md:h-7 bg-indigo-300/30 dark:bg-indigo-700/30 rounded w-full animate-pulse" />
                  ) : (
                    <p className="text-sm sm:text-lg md:text-xl lg:text-2xl 2xl:text-lg font-bold text-indigo-600 dark:text-indigo-400 transition-all duration-300 break-words min-w-0">{cashoutsTotal}</p>
                  )}
                </div>
                <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-3 sm:p-4 2xl:p-2.5 border border-violet-200/50 dark:border-violet-700/50 hover:shadow-md transition-all duration-300 min-w-0 overflow-hidden">
                  <div className="mb-2 flex items-center gap-1.5 sm:gap-2 2xl:gap-1 min-w-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 2xl:w-5 2xl:h-5 rounded-lg bg-violet-500/20 dark:bg-violet-500/30 flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 2xl:w-2.5 2xl:h-2.5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h5 className="text-[9px] sm:text-[10px] md:text-xs font-semibold text-violet-700 dark:text-violet-300 break-words min-w-0">Transfers</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-6 md:h-7 bg-violet-300/30 dark:bg-violet-700/30 rounded w-full animate-pulse" />
                  ) : (
                    <p className="text-sm sm:text-lg md:text-xl lg:text-2xl 2xl:text-lg font-bold text-violet-600 dark:text-violet-400 transition-all duration-300 break-words min-w-0">{transfersTotal}</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Column 2: Player Games */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6">
            {/* Player Games Card */}
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-4 sm:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Player Games</h2>
                    {games.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{games.length} {games.length === 1 ? 'game' : 'games'}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenAddGame}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:shadow-md active:scale-95"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Game
                </Button>
              </div>

              {isLoadingGames ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm font-medium text-gray-500 dark:text-gray-400">No games assigned</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Click &quot;Add Game&quot; to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {games.map((game: PlayerGame) => (
                    <div
                      key={game.id}
                      className="group border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 dark:hover:border-gray-600"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                            {game.game__title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400"> {game.username}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <div className={`h-2 w-2 rounded-full ${game.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <Badge
                            variant={game.status === 'active' ? 'success' : 'danger'}
                            className="text-xs"
                          >
                            {game.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

                      <div className="flex items-center justify-between gap-3">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={async () => {
                            setSelectedGameForBalance(game);
                            setBalanceError(null);
                            setBalanceData(null);
                            setIsBalanceModalOpen(true);

                            if (!selectedPlayer) return;

                            try {
                              setIsCheckingBalance(true);
                              const response = await playersApi.checkGameBalance({
                                game_id: game.game__id,
                                player_id: selectedPlayer.id,
                              });
                              setBalanceData(response);
                            } catch (err) {
                              const message = err instanceof Error ? err.message : 'Failed to check game balance';
                              setBalanceError(message);
                            } finally {
                              setIsCheckingBalance(false);
                            }
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Balance
                        </Button>

                        <div className="shrink-0 ml-auto">
                          <DropdownMenu
                            trigger={
                              <button
                                type="button"
                                className="flex items-center justify-center rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                aria-label="More actions"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            }
                            align="right"
                          >
                            <DropdownMenuItem
                              onClick={() => {
                                setGameToEdit(game);
                                setIsEditGameDrawerOpen(true);
                              }}
                              className="flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Edit Game
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setGameToDelete(game)}
                              className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete Game
                            </DropdownMenuItem>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <EditPlayerDetailsDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        editableFields={editableFields}
        setEditableFields={setEditableFields}
        isSaving={isSaving}
        onSave={handleSave}
      />

      <ConfirmModal
        isOpen={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        onConfirm={handleDeactivate}
        title={`${selectedPlayer.is_active ? 'Deactivate' : 'Activate'} Player`}
        description={`Are you sure you want to ${selectedPlayer.is_active ? 'deactivate' : 'activate'} "${selectedPlayer.username}"?`}
        confirmText={selectedPlayer.is_active ? 'Deactivate' : 'Activate'}
        variant={selectedPlayer.is_active ? 'warning' : 'info'}
        isLoading={isDeactivating}
      />

      <PlayerGameBalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => {
          setIsBalanceModalOpen(false);
          setSelectedGameForBalance(null);
          setBalanceData(null);
          setBalanceError(null);
        }}
        gameTitle={selectedGameForBalance?.game__title || ''}
        playerUsername={selectedPlayer.username}
        balanceData={balanceData}
        isLoading={isCheckingBalance}
        error={balanceError}
      />

      <ConfirmModal
        isOpen={!!gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={handleDeleteGame}
        title="Delete Game"
        description={`Are you sure you want to remove "${gameToDelete?.game__title}" from "${selectedPlayer?.username}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingGame}
      />

      <ConfirmModal
        isOpen={!!gameToChange}
        onClose={() => setGameToChange(null)}
        onConfirm={handleChangeGame}
        title="Change Game Status"
        description={`Are you sure you want to change the status of "${gameToChange?.game__title}" to ${gameToChange?.status === 'active' ? 'inactive' : 'active'}?`}
        confirmText="Change"
        variant="info"
        isLoading={isChangingGame}
      />

      {selectedPlayer && (
        <AddGameDrawer
          isOpen={isAddGameDrawerOpen}
          onClose={() => setIsAddGameDrawerOpen(false)}
          playerId={selectedPlayer.id}
          playerUsername={selectedPlayer.username}
          playerGames={games}
          onGameAdded={() => { }}
          onSubmit={handleAddGame}
          isSubmitting={isAddingGame}
        />
      )}

      {/* Edit Game Drawer */}
      {gameToEdit && (
        <div className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isEditGameDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isEditingGame && setIsEditGameDrawerOpen(false)}
          />
          <div
            className={`fixed inset-y-0 right-0 z-[60] w-full sm:max-w-md bg-card border-l border-border shadow-2xl transition-transform duration-300 ease-in-out transform ${isEditGameDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <EditGameDrawerContent
              game={gameToEdit}
              isOpen={isEditGameDrawerOpen}
              onClose={() => {
                setIsEditGameDrawerOpen(false);
                setGameToEdit(null);
              }}
              onSubmit={handleEditGame}
              isSubmitting={isEditingGame}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Edit Game Drawer Component
interface EditGameDrawerContentProps {
  game: PlayerGame;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { username: string; password: string }) => Promise<void>;
  isSubmitting: boolean;
}

function EditGameDrawerContent({
  game,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: EditGameDrawerContentProps) {
  const [formData, setFormData] = useState({
    username: game.username || '',
    password: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        username: game.username || '',
        password: '',
      });
    }
  }, [isOpen, game.username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;
    await onSubmit({
      username: formData.username,
      password: formData.password,
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Edit Game</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-lg transition-colors"
          disabled={isSubmitting}
        >
          <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 md:pb-6">
        <form id="edit-game-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">Game Information</p>
                <p className="text-xs text-muted-foreground">
                  Game: <span className="font-medium text-foreground">{game.game__title}</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Game Username <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username for the game"
              className="w-full"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The username for accessing the game account
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Game Password <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter new password for the game"
              className="w-full"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter a new password for the game account
            </p>
          </div>
        </form>
      </div>

      <div className="sticky bottom-0 z-10 bg-card border-t border-border px-6 py-4 shadow-lg">
        <Button
          type="submit"
          form="edit-game-form"
          variant="primary"
          className="w-full"
          disabled={isSubmitting || !formData.username || !formData.password}
          isLoading={isSubmitting}
        >
          {isSubmitting ? (
            'Updating Game...'
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Update Game
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

