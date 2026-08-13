'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Player } from '@/types';
import { formatDate } from '@/lib/utils/formatters';
import { playersApi, gameOperationsApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, useToast, DropdownMenu, DropdownMenuItem, ConfirmModal, Input } from '@/components/ui';
import { LoadingState, ErrorState, PlayerGameBalanceModal, SavedPaymentMethodsModal, GameRechargeModal } from '@/components/features';
import { usePlayerGames } from '@/hooks/use-player-games';
import { usePlayerAdjacentNavigation } from '@/hooks/use-player-adjacent-navigation';
import { buildPlayersListHref } from '@/lib/players/player-list-filter-params';
import { PlayerTransactionAnalyticsModal } from '@/components/analytics/player-transaction-analytics-modal';
import type { PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';
import { AddGameDrawer } from '@/components/chat/modals/add-game-drawer';
import { PlayerGameOperationMenuItems } from '@/components/dashboard/players/player-game-operation-menu-items';
import { PlayerGamePasswordReveal } from '@/components/dashboard/players/player-game-password-reveal';
import { useTransactionsStore, useTransactionQueuesStore } from '@/stores';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { PlayerDetailHeaderActions } from '@/components/dashboard/players/player-detail-header-actions';
import { PlayerProfileAdminBar } from '@/components/dashboard/players/player-profile-admin-bar';
import {
  buildEditableFieldsFromPlayer,
  buildPlayerUpdateRequest,
  applyEditableFieldsToPlayer,
  isPlayerProfileLocked,
  EMPTY_EDITABLE_PLAYER_FIELDS,
  getPlayerPersonalInfoCardAddressProps,
  type EditablePlayerFields,
} from '@/types/player-edit';
import { IdentityVerifiedTick } from '@/components/chat/components/identity-verified-tick';
import { isPlayerIdentityVerified, isPlayerPhoneVerified } from '@/lib/players/player-verification';
import { PlayerPersonalInformationCard } from '@/components/dashboard/players/player-personal-information-card';
import { PlayerAccountOverview } from '@/components/dashboard/players/player-account-overview';
import { PlayerQuickActionsBar } from '@/components/dashboard/players/player-quick-actions-bar';
import { PlayerTransactionSummarySection } from '@/components/dashboard/players/player-transaction-summary-section';
import { PlayerRouletteSpinAllowanceSection } from '@/components/dashboard/players/player-roulette-spin-allowance-section';
import { PlayerReferralOverrideSection } from '@/components/dashboard/players/player-referral-override-section';
import { PlayerReferralDetailsSection } from '@/components/dashboard/players/player-referral-details-section';
import {
  USER_ROLES,
  canEditPlayerCashoutLimit,
  canEditPlayerRouletteAllowance,
  canEditPlayerReferralOverride,
  canEditPlayerVerification,
  canSyncBinpayKycStatus,
} from '@/lib/constants/roles';


interface ManagerPlayerDetailProps {
  playerId: number;
}

type EditableFields = EditablePlayerFields;

/**
 * Manager Player Detail Component
 * - View and edit player details
 * - No agent assignment functionality
 */
export function ManagerPlayerDetail({ playerId }: ManagerPlayerDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  // Load player games
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(playerId);

  // State
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTransactionAnalyticsModalOpen, setIsTransactionAnalyticsModalOpen] = useState(false);
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
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameForRecharge, setGameForRecharge] = useState<PlayerGame | null>(null);
  const [gamePendingRedeem, setGamePendingRedeem] = useState<PlayerGame | null>(null);
  const [gamePendingResetPassword, setGamePendingResetPassword] = useState<PlayerGame | null>(null);
  const [isGameOperationSubmitting, setIsGameOperationSubmitting] = useState(false);
  const [visiblePlayerGamePasswordIds, setVisiblePlayerGamePasswordIds] = useState<
    Record<number, boolean>
  >({});
  const [editableFields, setEditableFields] = useState<EditableFields>(EMPTY_EDITABLE_PLAYER_FIELDS);

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
        setEditableFields(buildEditableFieldsFromPlayer(player));

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
        } catch {
          // keep page usable without summary totals
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

  useEffect(() => {
    setVisiblePlayerGamePasswordIds({});
  }, [playerId]);

  const handleBack = useCallback(() => {
    router.push(buildPlayersListHref(searchParams));
  }, [router, searchParams]);

  const handleNavigateToChat = useCallback(() => {
    if (!selectedPlayer) return;
    const chatUrl = `/dashboard/chat?playerId=${selectedPlayer.id}`;
    router.push(chatUrl);
  }, [selectedPlayer, router]);

  const { playerNavDirection, handleNavigateToAdjacentPlayer } = usePlayerAdjacentNavigation({
    selectedPlayer,
    onNavigateToChat: handleNavigateToChat,
  });

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

  const handleViewTimeline = useCallback(() => {
    if (!selectedPlayer) return;
    router.push(`/dashboard/players/${selectedPlayer.id}/timeline`);
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

  const handleAddGameDashboardRecord = useCallback(
    async (data: { username: string; password: string; code: string; user_id: number }) => {
      if (!selectedPlayer || isAddingGame) return;

      setIsAddingGame(true);
      try {
        const result = await playersApi.createGame(data);
        addToast({
          type: 'success',
          title: result.message || `Added ${result.game_name}`,
        });
        setIsAddGameDrawerOpen(false);
        void refreshGames({ silent: true });
      } catch (error) {
        const description =
          error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string'
            ? (error as { message: string }).message
            : 'Unknown error';
        addToast({
          type: 'error',
          title: 'Failed to add game',
          description,
        });
      } finally {
        setIsAddingGame(false);
      }
    },
    [selectedPlayer, isAddingGame, addToast, refreshGames],
  );

  const handleAddGamePlatform = useCallback(
    async (data: { game_id: number }) => {
      if (!selectedPlayer || isAddingGame) return;

      setIsAddingGame(true);
      try {
        const result = await gameOperationsApi.addUserGame({
          player_id: selectedPlayer.id,
          game_id: data.game_id,
        });
        addToast({
          type: 'success',
          title: result.message,
        });
        setIsAddGameDrawerOpen(false);
        void refreshGames({ silent: true });
      } catch (error) {
        const description =
          error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string'
            ? (error as { message: string }).message
            : 'Unknown error';
        addToast({
          type: 'error',
          title: 'Failed to add game',
          description,
        });
      } finally {
        setIsAddingGame(false);
      }
    },
    [selectedPlayer, isAddingGame, addToast, refreshGames],
  );

  const submitGameRecharge = useCallback(
    async (amount: number) => {
      if (!selectedPlayer || !gameForRecharge) return;
      setIsGameOperationSubmitting(true);
      try {
        const result = await gameOperationsApi.recharge({
          player_id: selectedPlayer.id,
          game_id: gameForRecharge.game__id,
          amount,
        });
        addToast({
          type: 'success',
          title: 'Recharge queued',
          description: result.message + (result.queue_id ? ` Queue ID: ${result.queue_id}.` : ''),
        });
        setGameForRecharge(null);
        await refreshGames({ silent: true });
      } catch (error) {
        const description =
          error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string'
            ? (error as { message: string }).message
            : 'Recharge failed';
        addToast({ type: 'error', title: 'Recharge failed', description });
      } finally {
        setIsGameOperationSubmitting(false);
      }
    },
    [selectedPlayer, gameForRecharge, addToast, refreshGames],
  );

  const confirmRedeemGame = useCallback(async () => {
    if (!selectedPlayer || !gamePendingRedeem) return;
    setIsGameOperationSubmitting(true);
    try {
      const result = await gameOperationsApi.redeem({
        player_id: selectedPlayer.id,
        game_id: gamePendingRedeem.game__id,
      });
      addToast({
        type: 'success',
        title: 'Redeem queued',
        description: result.message + (result.queue_id ? ` Queue ID: ${result.queue_id}.` : ''),
      });
      setGamePendingRedeem(null);
      await refreshGames({ silent: true });
    } catch (error) {
      const description =
        error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string'
          ? (error as { message: string }).message
          : 'Redeem failed';
      addToast({ type: 'error', title: 'Redeem failed', description });
    } finally {
      setIsGameOperationSubmitting(false);
    }
  }, [selectedPlayer, gamePendingRedeem, addToast, refreshGames]);

  const confirmResetGamePassword = useCallback(async () => {
    if (!selectedPlayer || !gamePendingResetPassword) return;
    setIsGameOperationSubmitting(true);
    try {
      const result = await gameOperationsApi.resetPassword({
        player_id: selectedPlayer.id,
        game_id: gamePendingResetPassword.game__id,
      });
      addToast({
        type: 'success',
        title: 'Password reset queued',
        description: result.message + (result.queue_id ? ` Queue ID: ${result.queue_id}.` : ''),
      });
      setGamePendingResetPassword(null);
      await refreshGames({ silent: true });
    } catch (error) {
      const description =
        error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string'
          ? (error as { message: string }).message
          : 'Reset failed';
      addToast({ type: 'error', title: 'Reset failed', description });
    } finally {
      setIsGameOperationSubmitting(false);
    }
  }, [selectedPlayer, gamePendingResetPassword, addToast, refreshGames]);

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
      await refreshGames({ silent: true });
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
      await refreshGames({ silent: true });
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
      const updateData = buildPlayerUpdateRequest(editableFields, {
        lockProfileFields: isPlayerProfileLocked(selectedPlayer),
      });

      const updatedPlayer = await playersApi.update(selectedPlayer.id, updateData);

      setSelectedPlayer(applyEditableFieldsToPlayer({ ...selectedPlayer, ...updatedPlayer }, editableFields));

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
        onRetry={() => router.push(buildPlayersListHref(searchParams))}
      />
    );
  }

  const usernameInitial = selectedPlayer.username
    ? selectedPlayer.username.charAt(0).toUpperCase()
    : '?';
  const agentLabel =
    selectedPlayer.agent_username ||
    (selectedPlayer.agent && typeof selectedPlayer.agent === 'object' && 'username' in selectedPlayer.agent
      ? selectedPlayer.agent.username
      : null);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm dark:border-gray-800 dark:bg-gray-900/95 safe-area-top">
        <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2 sm:py-2.5 md:py-3 lg:py-4">
            <button
              onClick={handleBack}
              className="p-1.5 -ml-1.5 sm:p-2 sm:-ml-2 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200 touch-manipulation"
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
              <div
                className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 shrink-0 items-center justify-center bg-gray-800 text-white font-bold dark:bg-gray-700 text-xs sm:text-sm md:text-base"
                aria-label="Player avatar"
              >
                {usernameInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="flex min-w-0 items-center gap-1">
                    <span
                      className="text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-gray-100 lg:text-xl truncate text-left"
                      aria-label="Player username"
                    >
                      {selectedPlayer.username}
                    </span>
                    {isPlayerIdentityVerified(selectedPlayer) ? (
                      <IdentityVerifiedTick size="md" />
                    ) : null}
                  </span>
                  <span className="hidden sm:inline-flex items-center justify-center h-4 sm:h-5 px-1 sm:px-1.5 text-[9px] sm:text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
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
            <PlayerDetailHeaderActions
              onPrevious={() => handleNavigateToAdjacentPlayer('previous')}
              onNext={() => handleNavigateToAdjacentPlayer('next')}
              onChat={handleNavigateToChat}
              previousDisabled={playerNavDirection !== null}
              nextDisabled={playerNavDirection !== null}
              previousLoading={playerNavDirection === 'previous'}
              nextLoading={playerNavDirection === 'next'}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 pb-safe">
        <PlayerAccountOverview
          playerId={selectedPlayer.id}
          balance={selectedPlayer.balance}
          cashoutLimit={selectedPlayer.cashout_limit}
          winningBalance={selectedPlayer.winning_balance}
          isActive={selectedPlayer.is_active}
          agentLabel={agentLabel}
          canEditCashoutLimit={canEditPlayerCashoutLimit(USER_ROLES.MANAGER)}
          onCashoutLimitUpdated={(cashout_limit) =>
            setSelectedPlayer((prev) => (prev ? { ...prev, cashout_limit } : prev))
          }
        />

        <PlayerProfileAdminBar
          player={selectedPlayer}
          canEditVerification={canEditPlayerVerification(USER_ROLES.MANAGER)}
          canSyncBinpay={canSyncBinpayKycStatus(USER_ROLES.MANAGER)}
          onEdit={() => setIsEditDrawerOpen(true)}
          onUpdated={setSelectedPlayer}
        />

        {/* Three Column Grid Layout */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {/* Column 1: Quick Actions & Personal Information */}
          <div className="space-y-3">
            <PlayerQuickActionsBar
              onViewTransactions={handleViewTransactions}
              onViewActivities={handleViewGameActivities}
              onViewTimeline={handleViewTimeline}
              onOpenPaymentMethods={() => setIsSavedPaymentMethodsOpen(true)}
              hasSavedPaymentMethods={!!selectedPlayer.has_saved_payment_methods}
              savedPaymentMethodsCount={selectedPlayer.saved_payment_methods?.length ?? 0}
            />

            

            <PlayerPersonalInformationCard
              email={selectedPlayer.email}
              fullName={selectedPlayer.full_name}
              dob={selectedPlayer.dob}
              state={selectedPlayer.state}
              {...getPlayerPersonalInfoCardAddressProps(selectedPlayer)}
              mobileNumber={selectedPlayer.mobile_number}
              phoneVerified={isPlayerPhoneVerified(selectedPlayer)}
            />

            <PlayerTransactionSummarySection
              totalPurchases={selectedPlayer.total_purchases}
              totalCashouts={selectedPlayer.total_cashouts}
              totalTransfers={selectedPlayer.total_transfers}
              isLoading={isLoadingDetails}
              onOpenAnalytics={() => setIsTransactionAnalyticsModalOpen(true)}
            />
          </div>

          {/* Player Games */}
          <div className="space-y-3">
            {/* Player Games Card */}
            <section className="border border-gray-200 bg-white p-3 sm:p-4 md:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 sm:mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
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
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {game.game__title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {game.username}
                        </p>
                        <PlayerGamePasswordReveal
                          layout="compact"
                          game={game}
                          isVisible={!!visiblePlayerGamePasswordIds[game.id]}
                          onToggleVisibility={() =>
                            setVisiblePlayerGamePasswordIds((prev) => ({
                              ...prev,
                              [game.id]: !prev[game.id],
                            }))
                          }
                        />
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
                                className="flex items-center justify-center p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                                aria-label="More actions"
                              >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                </svg>
                              </button>
                            }
                            align="right"
                          >
                            <PlayerGameOperationMenuItems
                              game={game}
                              onRecharge={setGameForRecharge}
                              onRedeem={setGamePendingRedeem}
                              onResetPassword={setGamePendingResetPassword}
                            />
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

      <GameRechargeModal
        isOpen={!!gameForRecharge}
        onClose={() => !isGameOperationSubmitting && setGameForRecharge(null)}
        gameTitle={gameForRecharge?.game__title ?? ''}
        onConfirm={submitGameRecharge}
        isSubmitting={isGameOperationSubmitting}
      />

      <ConfirmModal
        isOpen={!!gamePendingRedeem}
        onClose={() => !isGameOperationSubmitting && setGamePendingRedeem(null)}
        onConfirm={confirmRedeemGame}
        title="Redeem full game balance"
        description={`Queue a redeem for all funds in "${gamePendingRedeem?.game__title}" for ${selectedPlayer.username}? This runs in the background.`}
        confirmText="Redeem"
        variant="warning"
        isLoading={isGameOperationSubmitting}
      />

      <ConfirmModal
        isOpen={!!gamePendingResetPassword}
        onClose={() => !isGameOperationSubmitting && setGamePendingResetPassword(null)}
        onConfirm={confirmResetGamePassword}
        title="Reset game password"
        description={`Submit a password reset for "${gamePendingResetPassword?.game__title}"? Processing runs in the background.`}
        confirmText="Reset password"
        variant="info"
        isLoading={isGameOperationSubmitting}
      />

      {/* Add Game Drawer */}
      {selectedPlayer && (
        <AddGameDrawer
          isOpen={isAddGameDrawerOpen}
          onClose={() => setIsAddGameDrawerOpen(false)}
          playerId={selectedPlayer.id}
          playerUsername={selectedPlayer.username}
          playerGames={games}
          onSubmitDashboardRecord={handleAddGameDashboardRecord}
          onSubmitGamePlatform={handleAddGamePlatform}
          isSubmitting={isAddingGame}
        />
      )}

      {/* Edit Player Details Drawer */}

        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          <PlayerRouletteSpinAllowanceSection
            playerId={selectedPlayer.id}
            playerUsername={selectedPlayer.username}
            canEdit={canEditPlayerRouletteAllowance(USER_ROLES.MANAGER)}
          />
          <PlayerReferralOverrideSection
            playerId={selectedPlayer.id}
            playerUsername={selectedPlayer.username}
            canEdit={canEditPlayerReferralOverride(USER_ROLES.MANAGER)}
          />
          <PlayerReferralDetailsSection player={selectedPlayer} />
        </div>

      <EditPlayerDetailsDrawer
        isOpen={isEditDrawerOpen}
        onClose={() => setIsEditDrawerOpen(false)}
        editableFields={editableFields}
        setEditableFields={setEditableFields}
        isSaving={isSaving}
        onSave={handleSave}
        player={selectedPlayer}
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

      <PlayerTransactionAnalyticsModal
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
          className="p-1 hover:bg-muted transition-colors"
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
          <div className="p-3 bg-blue-500/10 border border-blue-500/20">
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

