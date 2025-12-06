'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button } from '@/components/ui';
import type { UpdateUserRequest, ApiError } from '@/types';
import { LoadingState, ErrorState, PlayerGameBalanceModal } from '@/components/features';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { usePlayerGames } from '@/hooks/use-player-games';
import type { PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';

/**
 * Extracts and formats error messages from API errors
 */
function extractErrorMessage(error: unknown): { title: string; message: string } {
  let errorMessage = 'An error occurred';
  let errorTitle = 'Error';
  
  if (error && typeof error === 'object') {
    const apiError = error as ApiError;
    
    if (apiError.message) {
      errorMessage = apiError.message;
    } else if (apiError.detail && typeof apiError.detail === 'string') {
      errorMessage = apiError.detail;
    } else if (apiError.error) {
      errorMessage = apiError.error;
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

interface StaffPlayerDetailProps {
  playerId: number;
}

/**
 * Staff Player Detail Component
 * - Read-only view of player details
 * - No agent assignment functionality
 * - No player creation/editing (except basic profile info via edit drawer)
 */
export function StaffPlayerDetail({ playerId }: StaffPlayerDetailProps) {
  const router = useRouter();
  const { addToast } = useToast();

  // Load player games
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(playerId);

  // State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedGameForBalance, setSelectedGameForBalance] = useState<PlayerGame | null>(null);
  const [balanceData, setBalanceData] = useState<CheckPlayerGameBalanceResponse | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameToChange, setGameToChange] = useState<PlayerGame | null>(null);
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<PlayerGame | null>(null);
  const [isEditGameDrawerOpen, setIsEditGameDrawerOpen] = useState(false);
  const [isEditingGame, setIsEditingGame] = useState(false);
  const [isAddGameDrawerOpen, setIsAddGameDrawerOpen] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);

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

        // Load transaction details
        setIsLoadingDetails(true);
        try {
          const details = await playersApi.viewDetails(player.id);
          setSelectedPlayer((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              total_purchases: details.total_purchases,
              total_cashouts: details.total_cashouts,
              total_transfers: details.total_transfers,
            };
          });
        } catch (err) {
          console.error('Failed to load player details:', err);
        } finally {
          setIsLoadingDetails(false);
        }
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
    const chatUrl = `/dashboard/chat?playerId=${selectedPlayer.id}&username=${encodeURIComponent(selectedPlayer.username)}`;
    router.push(chatUrl);
  }, [selectedPlayer, router]);

  const handleSave = useCallback(async () => {
    if (!selectedPlayer) return;

    setIsSaving(true);
    try {
      const updateData: UpdateUserRequest = {
        email: editableFields.email.trim(),
        full_name: editableFields.full_name.trim() || undefined,
        dob: editableFields.dob.trim() || undefined,
        state: editableFields.state.trim() || undefined,
        mobile_number: editableFields.mobile_number.trim() || undefined,
        is_active: editableFields.is_active,
      };

      if (editableFields.password.trim()) {
        if (editableFields.password !== editableFields.confirm_password) {
          addToast({
            type: 'error',
            title: 'Password mismatch',
            description: 'Password and confirm password do not match.',
          });
          setIsSaving(false);
          return;
        }
        updateData.password = editableFields.password.trim();
      }

      await playersApi.update(selectedPlayer.id, updateData);

      const updatedPlayer = await apiClient.get<Player>(API_ENDPOINTS.PLAYERS.DETAIL(selectedPlayer.id));
      setSelectedPlayer(updatedPlayer);
      setEditableFields((prev) => ({ ...prev, password: '', confirm_password: '' }));

      addToast({
        type: 'success',
        title: 'Player updated',
        description: 'Player details have been updated successfully.',
      });

      setIsEditDrawerOpen(false);
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

  const handleViewTransactions = useCallback(() => {
    if (!selectedPlayer) return;
    router.push(`/dashboard/history/transactions?username=${encodeURIComponent(selectedPlayer.username)}`);
  }, [selectedPlayer, router]);

  const handleViewGameActivities = useCallback(() => {
    if (!selectedPlayer) return;
    router.push(`/dashboard/history/game-activities?username=${encodeURIComponent(selectedPlayer.username)}`);
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

  const handleDeleteGame = useCallback(async () => {
    if (!gameToDelete || !selectedPlayer || isDeletingGame) return;

    setIsDeletingGame(true);
    try {
      await playersApi.deleteGame(gameToDelete.id);
      addToast({
        type: 'success',
        title: 'Game removed',
        description: `"${gameToDelete.game__title}" has been removed from player "${selectedPlayer.username}".`,
      });
      setGameToDelete(null);
      await refreshGames();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to remove game',
        description,
      });
    } finally {
      setIsDeletingGame(false);
    }
  }, [gameToDelete, selectedPlayer, isDeletingGame, addToast, refreshGames]);

  const handleChangeGame = useCallback(async () => {
    if (!gameToChange || !selectedPlayer || isChangingGame) return;

    setIsChangingGame(true);
    try {
      // Toggle the game status using updateGame
      const newStatus = gameToChange.status === 'active' ? 'inactive' : 'active';
      await playersApi.updateGame(gameToChange.id, {
        username: gameToChange.username,
        status: newStatus
      });
      addToast({
        type: 'success',
        title: 'Game updated',
        description: `"${gameToChange.game__title}" status has been changed to ${newStatus} for player "${selectedPlayer.username}".`,
      });
      setGameToChange(null);
      await refreshGames();
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown error';
      addToast({
        type: 'error',
        title: 'Failed to change game',
        description,
      });
    } finally {
      setIsChangingGame(false);
    }
  }, [gameToChange, selectedPlayer, isChangingGame, addToast, refreshGames]);

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

  const handleAddGame = useCallback(async (data: { username: string; password: string; code: string; user_id: number }) => {
    if (!selectedPlayer || isAddingGame) return;

    setIsAddingGame(true);
    try {
      await playersApi.createGame({
        username: data.username,
        password: data.password,
        code: data.code,
        user_id: selectedPlayer.id,
      });

      addToast({
        type: 'success',
        title: 'Game added',
        description: 'Game has been added to player successfully.',
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
          <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-4">
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

          {/* Column 3: Player Games */}
          <div className="space-y-3 sm:space-y-4 md:space-y-6 order-3 lg:order-3">
            {/* Player Games Card */}
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 rounded-lg">
              <div className="mb-4 sm:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                    </svg>
                  </div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Player Games</h2>
                </div>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      {/* Edit Player Drawer */}
      <EditPlayerDetailsDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setEditableFields((prev) => ({ ...prev, password: '', confirm_password: '' }));
        }}
        editableFields={editableFields}
        setEditableFields={setEditableFields}
        isSaving={isSaving}
        onSave={handleSave}
      />

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
    </div>
  );
}

