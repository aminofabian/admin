'use client';

import { useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Player, UpdateUserRequest } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, useToast, DropdownMenu, DropdownMenuItem, ConfirmModal, Input, Select, DateSelect } from '@/components/ui';
import { LoadingState, ErrorState, PlayerGameBalanceModal, SavedPaymentMethodsModal } from '@/components/features';
import { usePlayerGames } from '@/hooks/use-player-games';
import { useTransactionSummary, usePaymentMethods, useBonusAnalytics } from '@/hooks/use-analytics-transactions';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import type { PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';
import { AddGameDrawer } from '@/components/chat/modals/add-game-drawer';
import { useTransactionsStore, useTransactionQueuesStore } from '@/stores';
import { hasMeaningfulWinningBalance } from '@/lib/chat/map-chat-api';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { PlayerCashoutLimitHeroCard } from '@/components/dashboard/players/player-cashout-limit-hero-card';
import { USER_ROLES, canEditPlayerCashoutLimit } from '@/lib/constants/roles';
import { getDateRange } from '@/app/dashboard/analytics/analytics-utils';


interface StaffPlayerDetailProps {
  playerId: number;
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

/**
 * Staff Player Detail Component
 * - View and edit player details
 * - No agent assignment functionality
 */
export function StaffPlayerDetail({ playerId }: StaffPlayerDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Load player games
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(playerId);

  // State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<PlayerGame | null>(null);
  const [balanceData, setBalanceData] = useState<CheckPlayerGameBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isAddGameDrawerOpen, setIsAddGameDrawerOpen] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<PlayerGame | null>(null);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [isEditGameDrawerOpen, setIsEditGameDrawerOpen] = useState(false);
  const [isSavedPaymentMethodsOpen, setIsSavedPaymentMethodsOpen] = useState(false);
  const [isTransactionAnalyticsModalOpen, setIsTransactionAnalyticsModalOpen] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
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
    if (!playerId || isNaN(playerId)) {
      setError('Invalid player ID');
      setIsLoadingPlayer(false);
      return;
    }

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

      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load player';
        setError(message);
      } finally {
        setIsLoadingPlayer(false);
      }
    };

    loadPlayer();
  }, [playerId]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/players');
  }, [router]);

  const handleNavigateToChat = useCallback(() => {
    if (!selectedPlayer) return;
    const chatUrl = `/dashboard/chat?playerId=${selectedPlayer.id}`;
    router.push(chatUrl);
  }, [selectedPlayer, router]);

  const handleViewTransactions = useCallback(() => {
    if (!selectedPlayer?.username) {
      console.error('Cannot navigate: selectedPlayer or username is missing');
      return;
    }
    const transactionsStore = useTransactionsStore.getState();
    transactionsStore.setFilterWithoutFetch('history');
    transactionsStore.setAdvancedFiltersWithoutFetch({ username: selectedPlayer.username });
    router.push('/dashboard/history/transactions?preserveFilters=true');
  }, [selectedPlayer, router]);

  const handleViewGameActivities = useCallback(() => {
    if (!selectedPlayer?.username) {
      console.error('Cannot navigate: selectedPlayer or username is missing');
      return;
    }
    const queuesStore = useTransactionQueuesStore.getState();
    queuesStore.setFilterWithoutFetch('history');
    queuesStore.setAdvancedFiltersWithoutFetch({ username: selectedPlayer.username });
    router.push('/dashboard/history/game-activities?preserveFilters=true');
  }, [selectedPlayer, router]);

  const handleCheckBalance = useCallback(async (game: PlayerGame) => {
    if (!selectedPlayer) return;

    setSelectedGameForBalance(game);
    setBalanceError(null);
    setBalanceData(null);
    setIsBalanceModalOpen(true);
    setIsCheckingBalance(true);

    try {
      const response = await playersApi.checkGameBalance({
        player_id: selectedPlayer.id,
        game_id: game.game__id,
      });
      setBalanceData(response);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check balance';
      setBalanceError(message);
    } finally {
      setIsCheckingBalance(false);
    }
  }, [selectedPlayer]);

  const handleOpenAddGame = useCallback(() => {
    setIsAddGameDrawerOpen(true);
  }, []);

  const handleAddGame = useCallback(async (data: { username: string; password: string; code: string; user_id: number }) => {
    if (!selectedPlayer || isAddingGame) {
      return;
    }

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
    if (!gameToEdit || isEditingGame) {
      return;
    }

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

  const handleSave = useCallback(async () => {
    if (!selectedPlayer) return;

    // Validate password if provided
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
        // Only include password if it's not empty
        ...(editableFields.password.trim()
          ? {
            password: editableFields.password.trim(),
            confirm_password: editableFields.confirm_password.trim(),
          }
          : {}
        ),
      };

      await playersApi.update(selectedPlayer.id, updateData);

      // Refresh player data
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
      // Reset password fields after save
      setEditableFields(prev => ({ ...prev, password: '', confirm_password: '' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update player';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedPlayer, editableFields, addToast]);


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
  const showWinningsHero = hasMeaningfulWinningBalance(selectedPlayer.winning_balance);
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
              <svg
                className="h-5 w-5 sm:h-6 sm:w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
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
          <div
            className={`grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 ${
              showWinningsHero ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
            }`}
          >
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Balance</p>
                  <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{creditBalance}</p>
                </div>
              </div>
            </div>
            <PlayerCashoutLimitHeroCard
              playerId={selectedPlayer.id}
              cashoutLimit={selectedPlayer.cashout_limit}
              canEdit={canEditPlayerCashoutLimit(USER_ROLES.STAFF)}
              onUpdated={(cashout_limit) =>
                setSelectedPlayer((prev) => (prev ? { ...prev, cashout_limit } : prev))
              }
            />
            {showWinningsHero ? (
              <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                  <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                    <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Winnings</p>
                    <p className="mt-0.5 text-xs sm:text-sm md:text-lg lg:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                      {formatCurrency(selectedPlayer.winning_balance ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
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
            <div className="bg-gray-50 dark:bg-gray-800 p-1.5 sm:p-2 md:p-4 border border-gray-200 dark:border-gray-700 rounded">
              <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1 md:mb-2">
                <div className="flex h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 lg:h-10 lg:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0 rounded">
                  <svg className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 lg:h-5 lg:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Agent</p>
                  <p className="mt-0.5 text-[10px] sm:text-xs md:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {selectedPlayer.agent_username ||
                      (selectedPlayer.agent && typeof selectedPlayer.agent === 'object' && 'username' in selectedPlayer.agent
                        ? selectedPlayer.agent.username
                        : 'Not assigned')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Three Column Grid Layout */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 lg:grid-cols-3">
          {/* Column 1: Quick Actions & Personal Information */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 order-1 lg:order-1">
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
                <Button
                  onClick={() => setIsSavedPaymentMethodsOpen(true)}
                  variant="secondary"
                  className="group col-span-2 flex items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold shadow-sm transition-all active:scale-[0.98] touch-manipulation"
                >
                  <svg className="h-5 w-5 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                  <span>Saved Payment Methods</span>
                  {selectedPlayer.has_saved_payment_methods && (
                    <span className="ml-1 inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full">
                      {selectedPlayer.saved_payment_methods?.length ?? 0}
                    </span>
                  )}
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
              </div>
            </section>
          </div>

          {/* Column 2: Transaction Summary */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 order-2 lg:order-2">
            {/* Transaction Summary Card */}
            <section className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-3 sm:p-4 md:p-5 lg:p-6 border border-purple-200 dark:border-purple-800/50 shadow-sm">
              <div className="mb-3 sm:mb-4 md:mb-5 flex items-center gap-2 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h2 className="text-sm sm:text-base md:text-lg font-bold text-purple-900 dark:text-purple-200">Transaction Summary</h2>
              </div>
              <div className="rounded-lg border border-purple-200/50 bg-white/60 p-3 backdrop-blur-sm dark:border-purple-700/50 dark:bg-white/10 sm:p-4">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setIsTransactionAnalyticsModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-all hover:shadow-md"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 13l3-3 2 2 5-5" />
                  </svg>
                  Open Player Transaction Analytics
                </Button>
              </div>
            </section>
          </div>

          {/* Column 3: Player Games */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 order-3 lg:order-3">
            {/* Player Games Card */}
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-4 sm:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Player Games</h2>
                </div>
                <Button
                  onClick={handleOpenAddGame}
                  variant="primary"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="hidden sm:inline">Add Game</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              {isLoadingGames ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p className="text-sm">No games assigned</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {game.game__title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {game.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCheckBalance(game)}
                          className="text-xs"
                        >
                          Balance
                        </Button>
                        <div className="shrink-0">
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

      {/* Player Game Balance Modal */}
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

      {/* Add Game Drawer */}
      {selectedPlayer && (
        <AddGameDrawer
          isOpen={isAddGameDrawerOpen}
          onClose={() => setIsAddGameDrawerOpen(false)}
          playerId={selectedPlayer.id}
          playerUsername={selectedPlayer.username}
          playerGames={games}
          onSubmit={handleAddGame}
          isSubmitting={isAddingGame}
        />
      )}

      {/* Edit Player Details Drawer */}
      <EditPlayerDetailsDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        editableFields={editableFields}
        setEditableFields={setEditableFields}
        isSaving={isSaving}
        onSave={handleSave}
      />

      {/* Delete Game Confirmation Modal */}
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

      <SavedPaymentMethodsModal
        isOpen={isSavedPaymentMethodsOpen}
        onClose={() => setIsSavedPaymentMethodsOpen(false)}
        playerUsername={selectedPlayer.username}
        savedPaymentMethods={selectedPlayer.saved_payment_methods ?? []}
      />
      <PlayerTransactionsAnalyticsModal
        isOpen={isTransactionAnalyticsModalOpen}
        onClose={() => setIsTransactionAnalyticsModalOpen(false)}
        username={selectedPlayer.username}
      />

      {/* Edit Game Drawer */}
      {gameToEdit && (
        <div className={`fixed inset-0 z-[60] overflow-hidden transition-opacity duration-300 ${isEditGameDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isEditingGame) {
                setIsEditGameDrawerOpen(false);
              }
            }}
          />

          {/* Drawer Panel */}
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

function rateColor(rate: number | undefined): string {
  if (!rate) return 'text-muted-foreground';
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

function apiFieldLabel(apiKey: string): string {
  return apiKey
    .split(/[._]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function ApiLabeledValue({ apiKey, children }: { apiKey: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel(apiKey)}</p>
      <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">{children}</div>
    </div>
  );
}

interface PlayerTransactionsAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

function PlayerTransactionsAnalyticsModal({ isOpen, onClose, username }: PlayerTransactionsAnalyticsModalProps) {
  const [datePreset, setDatePreset] = useState('last_3_months');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  const filters = useMemo<AnalyticsFilters>(() => {
    if (!username) {
      return {};
    }

    const activeFilters: AnalyticsFilters = { username };
    if (startDate) activeFilters.start_date = startDate;
    if (endDate) activeFilters.end_date = endDate;
    return activeFilters;
  }, [username, startDate, endDate]);

  const { data: transactionSummary, loading: loadingSummary, error: summaryError } = useTransactionSummary(filters);
  const {
    data: paymentMethods,
    loading: loadingPaymentMethods,
    error: paymentMethodsError,
  } = usePaymentMethods(filters);
  const { data: bonusAnalytics, loading: loadingBonus, error: bonusError } = useBonusAnalytics(filters);

  const purchaseMethods = paymentMethods.filter(m => m.type === 'purchase');
  const cashoutMethods = paymentMethods.filter(m => m.type === 'cashout');

  const netRevenue = useMemo(() => {
    if (!transactionSummary) return null;
    return transactionSummary.total_purchase - transactionSummary.total_cashout;
  }, [transactionSummary]);

  const bonusBreakdown = useMemo(() => {
    if (!bonusAnalytics) return [];
    const items = [
      { fieldKey: 'purchase_bonus', value: bonusAnalytics.purchase_bonus, bar: 'bg-emerald-500' },
      { fieldKey: 'signup_bonus', value: bonusAnalytics.signup_bonus, bar: 'bg-blue-500' },
      { fieldKey: 'first_deposit_bonus', value: bonusAnalytics.first_deposit_bonus, bar: 'bg-violet-500' },
      { fieldKey: 'total_free_play', value: bonusAnalytics.total_free_play, bar: 'bg-cyan-500' },
      { fieldKey: 'seized_or_tipped_fund', value: bonusAnalytics.seized_or_tipped_fund, bar: 'bg-slate-400' },
    ];
    const max = Math.max(...items.map(i => i.value), 1);
    return items.map(i => ({ ...i, pct: (i.value / max) * 100 }));
  }, [bonusAnalytics]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset('last_3_months');
    const range = getDateRange('last_3_months');
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const hasActiveFilters = datePreset !== 'last_3_months';
  const fmtMethod = (n: string) => n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="relative h-[92vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-border/30 bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/20 px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Player Transaction Analytics</h2>
              <p className="text-xs text-muted-foreground">Locked to username: {username}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              aria-label="Close analytics modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-[calc(92vh-64px)] overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    showFilters
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  Filters
                  {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              </div>

              {showFilters && (
                <div className="relative z-20 flex items-center gap-2.5 rounded-lg border border-border/40 bg-card px-3 py-2 shadow-sm flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
                    {hasActiveFilters && (
                      <button onClick={handleClearFilters} className="text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors">
                        clear
                      </button>
                    )}
                  </div>
                  <div className="flex-1 grid gap-2 grid-cols-1 sm:grid-cols-2">
                    <Select
                      value={datePreset}
                      onChange={(v: string) => handlePresetChange(v)}
                      options={[
                        { value: 'today', label: 'Today' },
                        { value: 'yesterday', label: 'Yesterday' },
                        { value: 'this_month', label: 'This Month' },
                        { value: 'last_month', label: 'Last Month' },
                        { value: 'last_30_days', label: 'Last 30 Days' },
                        { value: 'last_3_months', label: 'Last 3 Months' },
                        { value: 'custom', label: 'Custom Range' },
                      ]}
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        disabled
                        placeholder="Username"
                        className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-2 pr-9 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-slate-900 dark:text-slate-300"
                      />
                      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4M5 11h14v10H5V11z" />
                      </svg>
                    </div>
                  </div>
                  {datePreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2 max-w-xs w-full lg:w-auto lg:mt-0">
                      <DateSelect label="Start" value={startDate} onChange={setStartDate} />
                      <DateSelect label="End" value={endDate} onChange={setEndDate} />
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-border/30 overflow-hidden shadow-sm">
                {loadingSummary ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="bg-card px-5 py-4 animate-pulse border-r border-border/10 last:border-r-0">
                        <div className="h-2.5 w-14 bg-muted/40 rounded mb-2.5" />
                        <div className="h-5 w-20 bg-muted/40 rounded" />
                      </div>
                    ))}
                  </div>
                ) : summaryError ? (
                  <div className="bg-card px-5 py-8 text-center text-sm text-rose-600 dark:text-rose-400">{summaryError}</div>
                ) : transactionSummary ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3">
                    <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-emerald-500 border-r border-border/10">
                      <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel('total_purchase')}</p>
                      <p className="text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCurrency(transactionSummary.total_purchase)}</p>
                    </div>
                    <div className="bg-card px-5 py-3.5 border-l-[3px] border-l-rose-500 border-r border-border/10">
                      <p className="text-[10px] font-medium leading-snug text-muted-foreground break-words">{apiFieldLabel('total_cashout')}</p>
                      <p className="text-lg font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5">{formatCurrency(transactionSummary.total_cashout)}</p>
                    </div>
                    {netRevenue !== null && (
                      <div className={`${netRevenue >= 0
                        ? 'bg-gradient-to-br from-emerald-900 to-emerald-950 dark:from-emerald-900/80 dark:to-emerald-950/90'
                        : 'bg-gradient-to-br from-rose-900 to-rose-950 dark:from-rose-900/80 dark:to-rose-950/90'} px-5 py-3.5`}>
                        <p className="text-[10px] font-medium leading-snug text-white/70 break-words">
                          {apiFieldLabel('total_purchase')} - {apiFieldLabel('total_cashout')}
                        </p>
                        <p className="text-lg font-bold tabular-nums text-white mt-0.5">
                          {netRevenue >= 0 ? '+' : ''}{formatCurrency(netRevenue)}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-card px-5 py-8 text-center text-sm text-muted-foreground">No transaction data available</div>
                )}

                {loadingBonus ? (
                  <div className="border-t border-border/15 bg-card px-5 py-4">
                    <div className="grid grid-cols-3 lg:grid-cols-5 gap-4">
                      {[0, 1, 2, 3, 4].map(i => (
                        <div key={i} className="animate-pulse">
                          <div className="h-2 w-12 bg-muted/40 rounded mb-2" />
                          <div className="h-4 w-14 bg-muted/40 rounded mb-2" />
                          <div className="h-1 bg-muted/20 rounded-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : bonusError ? (
                  <div className="border-t border-border/15 bg-card px-5 py-4">
                    <p className="text-center text-sm text-rose-600 dark:text-rose-400">{bonusError}</p>
                  </div>
                ) : bonusAnalytics ? (
                  <div className="border-t border-border/15 bg-card px-5 py-4">
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Bonus <span className="font-normal normal-case">{apiFieldLabel('data')}</span>
                      </p>
                      <div className="text-right">
                        <p className="text-[9px] font-medium text-muted-foreground">{apiFieldLabel('total_bonus')}</p>
                        <p className="text-sm font-bold tabular-nums text-amber-600 dark:text-amber-400">
                          {formatCurrency(bonusAnalytics.total_bonus)}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-4 gap-y-3">
                      {bonusBreakdown.map(({ fieldKey, value, bar, pct }) => (
                        <div key={fieldKey} className="group">
                          <p className="text-[9px] font-medium leading-snug text-muted-foreground/80 mb-0.5 break-words">{apiFieldLabel(fieldKey)}</p>
                          <p className="text-sm font-bold tabular-nums text-foreground">{formatCurrency(value)}</p>
                          <div className="mt-1.5 h-1 bg-muted/15 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${bar} transition-all duration-700 ease-out`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Purchases</span>
                  </div>
                  {loadingPaymentMethods ? (
                    <div className="p-5 space-y-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                          <div className="w-7 h-7 rounded-lg bg-muted/30 shrink-0" />
                          <div className="flex-1 h-3 bg-muted/20 rounded" />
                          <div className="w-16 h-3 bg-muted/30 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : paymentMethodsError ? (
                    <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
                  ) : purchaseMethods.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/10 bg-muted/5">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('key')}</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('purchase')}</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('bonus')}</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                          {purchaseMethods.map((m, i) => (
                            <tr key={`p-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-[9px] shrink-0">
                                    {fmtMethod(m.payment_method).charAt(0)}
                                  </span>
                                  <span className="font-medium text-foreground text-xs">{fmtMethod(m.payment_method)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatCurrency(m.purchase ?? 0)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {m.bonus && m.bonus > 0
                                  ? <span className="text-amber-600 dark:text-amber-400">{formatCurrency(m.bonus)}</span>
                                  : <span className="text-muted-foreground/25">&mdash;</span>}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate?.toFixed(1) ?? 0}%</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">No purchase data</div>
                  )}
                </div>

                <div className="rounded-xl border border-border/30 bg-card overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border/15 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-sm font-semibold text-foreground">Cashouts</span>
                  </div>
                  {loadingPaymentMethods ? (
                    <div className="p-5 space-y-3">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 animate-pulse">
                          <div className="w-7 h-7 rounded-lg bg-muted/30 shrink-0" />
                          <div className="flex-1 h-3 bg-muted/20 rounded" />
                          <div className="w-16 h-3 bg-muted/30 rounded" />
                        </div>
                      ))}
                    </div>
                  ) : paymentMethodsError ? (
                    <div className="p-6 text-center text-xs text-rose-600 dark:text-rose-400">{paymentMethodsError}</div>
                  ) : cashoutMethods.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border/10 bg-muted/5">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('key')}</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('cashout')}</th>
                            <th className="text-right px-3 py-2 font-medium text-muted-foreground text-[9px]">{apiFieldLabel('success_rate')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/5">
                          {cashoutMethods.map((m, i) => (
                            <tr key={`c-${m.payment_method}-${i}`} className="hover:bg-muted/10 transition-colors">
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold text-[9px] shrink-0">
                                    {fmtMethod(m.payment_method).charAt(0)}
                                  </span>
                                  <span className="font-medium text-foreground text-xs">{fmtMethod(m.payment_method)}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">{formatCurrency(m.cashout ?? 0)}</td>
                              <td className="px-3 py-2 text-right tabular-nums"><span className={rateColor(m.success_rate)}>{m.success_rate?.toFixed(1) ?? 0}%</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-muted-foreground">No cashout data</div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border/30 bg-card p-4 sm:p-5">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Locked player context</p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <ApiLabeledValue apiKey="username">{username}</ApiLabeledValue>
                  <ApiLabeledValue apiKey="date_preset">{datePreset}</ApiLabeledValue>
                  <ApiLabeledValue apiKey="start_date">{startDate || '—'}</ApiLabeledValue>
                  <ApiLabeledValue apiKey="end_date">{endDate || '—'}</ApiLabeledValue>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    username: '',
    password: '',
  });

  useEffect(() => {
    if (isOpen && game) {
      setFormData({
        username: game.username ?? '',
        password: '',
      });
    }
  }, [isOpen, game]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.password) {
      return;
    }

    await onSubmit({
      username: formData.username,
      password: formData.password,
    });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Drawer Header */}
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

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24 md:pb-6">
        <form id="edit-game-form" onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          {/* Game Info */}
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

          {/* Username */}
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
              autoComplete="off"
              autoFocus={false}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The username for accessing the game account
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Game Password <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="Enter new password for the game"
              className="w-full"
              disabled={isSubmitting}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Enter a new password to update the game account credentials
            </p>
          </div>
        </form>
      </div>

      {/* Drawer Footer */}
      <div className="sticky bottom-0 border-t border-border bg-card px-6 py-4 flex items-center justify-end gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.username || !formData.password}
          form="edit-game-form"
        >
          {isSubmitting ? 'Updating...' : 'Update Game'}
        </Button>
      </div>
    </div>
  );
}

