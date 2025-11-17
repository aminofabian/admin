'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi, agentsApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, Select, ConfirmModal, DropdownMenu, DropdownMenuItem, PasswordResetDrawer } from '@/components/ui';
import type { UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState, PlayerGameBalanceModal } from '@/components/features';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { usePlayerGames } from '@/hooks/use-player-games';
import type { PlayerGame, CheckPlayerGameBalanceResponse } from '@/types';
import { AddGameDrawer } from '@/components/chat/modals';

interface EditableFields {
  email: string;
  full_name: string;
  dob: string;
  state: string;
  mobile_number: string;
}

export default function PlayerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const playerId = params?.id ? parseInt(params.id as string, 10) : null;
  
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isLoadingPlayer, setIsLoadingPlayer] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAssigningAgent, setIsAssigningAgent] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [agentOptions, setAgentOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
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
  });
  const [passwordResetState, setPasswordResetState] = useState<{
    isOpen: boolean;
    isLoading: boolean;
  }>({
    isOpen: false,
    isLoading: false,
  });

  // Track last agent assignment time to prevent immediate data overwrite
  const [lastAgentAssignmentTime, setLastAgentAssignmentTime] = useState<number>(0);

  // Update document title when player is loaded
  useEffect(() => {
    console.log('📝 Title useEffect fired:', selectedPlayer?.username);
    if (selectedPlayer) {
      document.title = `${selectedPlayer.username} - Player Details`;
    } else {
      document.title = 'Player Details';
    }
  }, [selectedPlayer?.username]);

  // Load agents for dropdown
  useEffect(() => {
    let isMounted = true;

    const loadAgents = async () => {
      setIsLoadingAgents(true);
      try {
        const aggregated: Array<{ id: number; username: string }> = [];
        const pageSize = 100;
        let page = 1;
        let hasNext = true;

        while (hasNext) {
          const response = await agentsApi.list({ page, page_size: pageSize });

          if (!response?.results) {
            break;
          }

          aggregated.push(...response.results);

          if (!response.next) {
            hasNext = false;
          } else {
            page += 1;
          }

          if (!hasNext) {
            break;
          }
        }

        if (!isMounted) {
          return;
        }

        const mappedOptions = aggregated
          .filter((agent) => agent?.username)
          .map((agent) => ({
            value: String(agent.id),
            label: agent.username,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));

        setAgentOptions(mappedOptions);
      } catch (error) {
        console.error('Failed to load agents:', error);
      } finally {
        if (isMounted) {
          setIsLoadingAgents(false);
        }
      }
    };

    loadAgents();

    return () => {
      isMounted = false;
    };
  }, []);

  // Set selected agent when player or agents list changes
  useEffect(() => {
    console.log('🔄 useEffect for selectedAgentId fired', {
      agentId: selectedPlayer?.agent_id,
      agentOptionsLength: agentOptions.length,
      currentSelectedAgentId: selectedAgentId
    });

    if (selectedPlayer?.agent_id && agentOptions.length > 0) {
      const agentExists = agentOptions.some((opt) => opt.value === String(selectedPlayer.agent_id));
      if (agentExists && selectedAgentId !== String(selectedPlayer.agent_id)) {
        console.log('🎯 Updating selectedAgentId to:', selectedPlayer.agent_id);
        setSelectedAgentId(String(selectedPlayer.agent_id));
      }
    }
  }, [selectedPlayer?.agent_id, agentOptions]);

  // Load player data
  useEffect(() => {
    console.log('🔄 Player data useEffect called', { playerId });

    if (!playerId || isNaN(playerId)) {
      setError('Invalid player ID');
      setIsLoadingPlayer(false);
      return;
    }

    const loadPlayer = async () => {
      try {
        setIsLoadingPlayer(true);
        setError(null);

        // Fetch player using the detail endpoint
        const player = await apiClient.get<Player>(API_ENDPOINTS.PLAYERS.DETAIL(playerId));

        // Only update player data if we don't have newer local agent assignment data
        setSelectedPlayer((prev) => {
          const now = Date.now();
          const timeSinceAssignment = now - lastAgentAssignmentTime;

          // If we had a recent agent assignment (within 5 seconds), preserve local data
          if (timeSinceAssignment < 5000 && prev?.agent_id && !player.agent_id) {
            console.log('⚠️ Preserving local agent assignment data (recent assignment)');
            return {
              ...player,
              agent_id: prev.agent_id,
              agent: prev.agent,
              agent_username: prev.agent_username,
            };
          }

          // If we have existing player data with agent assignment and API doesn't have it, preserve local data
          if (prev?.agent_id && !player.agent_id) {
            console.log('⚠️ Preserving local agent assignment data');
            return {
              ...player,
              agent_id: prev.agent_id,
              agent: prev.agent,
              agent_username: prev.agent_username,
            };
          }

          return player;
        });
        setEditableFields({
          email: player.email || '',
          full_name: player.full_name || '',
          dob: player.dob || '',
          state: player.state || '',
          mobile_number: player.mobile_number || '',
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
        } catch (error) {
          console.error('Failed to load player details:', error);
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
  }, [playerId]);


  const handleSave = useCallback(async () => {
    if (!selectedPlayer) return;

    setIsSaving(true);
    try {
      const updateData: UpdateUserRequest = {
        email: editableFields.email.trim() || undefined,
        full_name: editableFields.full_name.trim() || undefined,
        mobile_number: editableFields.mobile_number.trim() || undefined,
        dob: editableFields.dob.trim() || undefined,
        state: editableFields.state.trim() || undefined,
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
      };
      setSelectedPlayer(updatedPlayer);

      addToast({
        type: 'success',
        title: 'Player updated',
        description: 'Player details have been updated successfully.',
      });

      setIsEditDrawerOpen(false);
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

  const handleAssignAgent = useCallback(async () => {
    console.log('🎯 handleAssignAgent called');
    if (!selectedPlayer || !selectedAgentId) {
      addToast({
        type: 'error',
        title: 'Invalid input',
        description: 'Please select an agent.',
      });
      return;
    }

    setIsAssigningAgent(true);
    try {
      // Find the agent in options to get username
      const selectedAgent = agentOptions.find((opt) => opt.value === selectedAgentId);

      if (!selectedAgent) {
        throw new Error('Selected agent not found');
      }

      console.log('📤 Calling assign-player-to-agent API');
      // Use the new assign-player-to-agent endpoint
      const response = await playersApi.assignToAgent({
        player_id: selectedPlayer.id,
        agent_username: selectedAgent.label,
      });

      console.log('📦 API response received:', response);

      // Record the time of agent assignment
      setLastAgentAssignmentTime(Date.now());

      // Update local state with response data (minimal update to avoid unnecessary re-renders)
      console.log('🔄 Updating selectedPlayer state');
      setSelectedPlayer((prev) => {
        if (!prev) return prev;
        const agent_id = response.data.agent_id;
        const agent_username = response.data.agent_username;

        // Only update if values actually changed
        if (prev.agent_id === agent_id && prev.agent_username === agent_username) {
          console.log('⚠️ No changes needed to selectedPlayer');
          return prev;
        }

        console.log('✅ Updating selectedPlayer with new agent data');
        return {
          ...prev,
          agent_id,
          agent: {
            id: agent_id,
            username: agent_username,
          },
          agent_username,
        };
      });

      addToast({
        type: 'success',
        title: 'Agent assigned',
        description: response.message || `Player "${response.data.player_username}" has been assigned to agent "${response.data.agent_username}".`,
      });
    } catch (error) {
      console.error('❌ Agent assignment failed:', error);
      const message = error instanceof Error ? error.message : 'Failed to assign agent';
      addToast({
        type: 'error',
        title: 'Assignment failed',
        description: message,
      });
    } finally {
      setIsAssigningAgent(false);
      console.log('✅ handleAssignAgent completed');
    }
  }, [selectedPlayer, selectedAgentId, agentOptions, addToast]);

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
      const message = error instanceof Error ? error.message : 'Failed to update player status';
      addToast({
        type: 'error',
        title: 'Update failed',
        description: message,
      });
    } finally {
      setIsDeactivating(false);
    }
  }, [selectedPlayer, addToast]);

  const handleViewTransactions = useCallback(() => {
    if (!selectedPlayer) return;
    router.push(`/dashboard/history/transactions?username=${encodeURIComponent(selectedPlayer.username)}`);
  }, [selectedPlayer, router]);

  const handleViewGameActivities = useCallback(() => {
    if (!selectedPlayer) return;
    router.push(`/dashboard/history/game-activities?user_id=${selectedPlayer.id}`);
  }, [selectedPlayer, router]);

  const handleBack = useCallback(() => {
    router.push('/dashboard/players');
  }, [router]);

  // Load player games - MUST be called before any conditional returns (Rules of Hooks)
  const { games, isLoading: isLoadingGames, refreshGames } = usePlayerGames(playerId);
  
  const [gameToDelete, setGameToDelete] = useState<PlayerGame | null>(null);
  const [isDeletingGame, setIsDeletingGame] = useState(false);
  const [gameToChange, setGameToChange] = useState<PlayerGame | null>(null);
  const [isChangingGame, setIsChangingGame] = useState(false);
  const [isAddGameDrawerOpen, setIsAddGameDrawerOpen] = useState(false);
  const [isAddingGame, setIsAddingGame] = useState(false);

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
      // Toggle the game status
      // API requires username, so we send the current username along with status
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

  const handleResetPassword = useCallback(() => {
    setPasswordResetState({
      isOpen: true,
      isLoading: false,
    });
  }, []);

  const handleConfirmPasswordReset = useCallback(async (password: string, confirmPassword: string) => {
    if (!selectedPlayer) return;

    setPasswordResetState((prev) => ({ ...prev, isLoading: true }));

    try {
      await playersApi.update(selectedPlayer.id, { 
        password,
        confirm_password: confirmPassword,
      });

      addToast({
        type: 'success',
        title: 'Password reset',
        description: `Password for "${selectedPlayer.username}" has been reset successfully!`,
      });

      setPasswordResetState({ isOpen: false, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      addToast({
        type: 'error',
        title: 'Reset failed',
        description: message,
      });
      setPasswordResetState((prev) => ({ ...prev, isLoading: false }));
      throw error;
    }
  }, [selectedPlayer, addToast]);

  const handleCancelPasswordReset = useCallback(() => {
    setPasswordResetState({ isOpen: false, isLoading: false });
  }, []);

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
      {/* Header - Mobile App Style */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 safe-area-top">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 py-3 sm:py-4 lg:py-5">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200 rounded-lg touch-manipulation"
              aria-label="Back"
            >
              <svg
                className="h-6 w-6 sm:h-6 sm:w-6"
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
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-600 text-white font-bold shadow-md">
                {usernameInitial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 lg:text-xl truncate">
                    {selectedPlayer.username}
                  </h2>
                  <span className="inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shrink-0">
                    #{selectedPlayer.id}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {selectedPlayer.full_name || 'Player Profile'}
                  </p>
                  {selectedPlayer.created && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600 text-[10px] shrink-0">•</span>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-none shrink-0">
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
              className="flex items-center gap-1.5 sm:gap-2 shrink-0 touch-manipulation"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span className="hidden sm:inline">Edit</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Full Width Content - Mobile App Style */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-safe">
        {/* Hero Stats Banner - Compact on mobile */}
        <div className="mb-3 sm:mb-6 bg-gray-100 dark:bg-gray-900 p-2 sm:p-6 shadow-xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className="flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0">
                  <svg className="h-3 w-3 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Credit</p>
                  <p className="mt-0.5 text-sm sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{creditBalance}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className="flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0">
                  <svg className="h-3 w-3 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Winning</p>
                  <p className="mt-0.5 text-sm sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{winningBalance}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className="flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0">
                  <svg className="h-3 w-3 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Status</p>
                  <div className="mt-0.5">
                    <Badge
                      variant={selectedPlayer.is_active ? 'success' : 'danger'}
                      className="text-[10px] sm:text-sm px-1.5 sm:px-3 py-0.5 sm:py-1"
                    >
                      {selectedPlayer.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-1 sm:mb-2">
                <div className="flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 shrink-0">
                  <svg className="h-3 w-3 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] sm:text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">Agent</p>
                  <p className="mt-0.5 text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
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

        {/* Three Column Grid Layout - Mobile First */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Column 1: Quick Actions, Personal Information & Account Details - Show first on mobile */}
          <div className="space-y-4 order-1 lg:order-1">
            {/* Quick Actions Card - Mobile App Style */}
            <section className="border border-gray-200 bg-white p-4 sm:p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  onClick={handleResetPassword}
                  variant="secondary"
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  <span className="text-center leading-tight">Password</span>
                </Button>
                <Button
                  onClick={() => setShowDeactivateModal(true)}
                  variant={selectedPlayer.is_active ? 'danger' : 'primary'}
                  className="group flex flex-col items-center justify-center gap-2 rounded-lg px-3 py-4 text-xs font-semibold shadow-md transition-all active:scale-[0.95] touch-manipulation min-h-[80px]"
                >
                  <svg className="h-6 w-6 transition-transform group-active:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    {selectedPlayer.is_active ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                  <span className="text-center leading-tight">{selectedPlayer.is_active ? 'Deactivate' : 'Activate'}</span>
                </Button>
              </div>
            </section>

            {/* Agent Assignment Card - Show below Quick Actions on mobile */}
            <section className="border border-gray-200 bg-white p-4 sm:p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:hidden">
              <div className="mb-4 sm:mb-5 flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Agent Assignment</h2>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Select
                      value={selectedAgentId}
                      onChange={(value: string) => setSelectedAgentId(value)}
                      options={[
                        { value: '', label: 'Select an agent' },
                        ...agentOptions,
                      ]}
                      placeholder="Select an agent"
                      isLoading={isLoadingAgents}
                      disabled={isLoadingAgents}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleAssignAgent}
                    isLoading={isAssigningAgent}
                    disabled={!selectedAgentId || isLoadingAgents}
                    variant="primary"
                    className="group flex items-center justify-center gap-2 rounded-lg px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50 touch-manipulation"
                  >
                    <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Assign
                  </Button>
                </div>
                {selectedPlayer.agent_username && (
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700">
                    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Agent</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedPlayer.agent_username}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Personal Information Card */}
            <section className="border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-2 flex items-center gap-2">
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

          {/* Column 2: Agent Assignment & Transaction Summary - Show second on mobile */}
          <div className="space-y-4 sm:space-y-6 order-2 lg:order-2">
            {/* Agent Assignment Card - Desktop only */}
            <section className="hidden lg:block border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Agent Assignment</h2>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Select
                      value={selectedAgentId}
                      onChange={(value: string) => setSelectedAgentId(value)}
                      options={[
                        { value: '', label: 'Select an agent' },
                        ...agentOptions,
                      ]}
                      placeholder="Select an agent"
                      isLoading={isLoadingAgents}
                      disabled={isLoadingAgents}
                      className="w-full"
                    />
                  </div>
                  <Button
                    onClick={handleAssignAgent}
                    isLoading={isAssigningAgent}
                    disabled={!selectedAgentId || isLoadingAgents}
                    variant="primary"
                    className="group flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold shadow-md transition-all hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Assign
                  </Button>
                </div>
                {selectedPlayer.agent_username && (
                  <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-4 py-3 border border-gray-200 dark:border-gray-700">
                    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Current Agent</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedPlayer.agent_username}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Transaction Summary Card */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-md">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Transaction Summary</h2>
                </div>
                {isLoadingDetails && (
                  <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="group border border-gray-200 bg-gray-50 dark:bg-gray-800 p-3 sm:p-5 transition-all hover:shadow-md dark:border-gray-700">
                  <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm shrink-0">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 truncate">Purchases</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-7 w-full sm:w-24 animate-pulse bg-gray-200 dark:bg-gray-800" />
                  ) : (
                    <p className="text-base sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{purchasesTotal}</p>
                  )}
                </div>
                <div className="group border border-gray-200 bg-gray-50 dark:bg-gray-800 p-3 sm:p-5 transition-all hover:shadow-md dark:border-gray-700">
                  <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm shrink-0">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 truncate">Cashouts</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-7 w-full sm:w-24 animate-pulse bg-gray-200 dark:bg-gray-800" />
                  ) : (
                    <p className="text-base sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{cashoutsTotal}</p>
                  )}
                </div>
                <div className="group border border-gray-200 bg-gray-50 dark:bg-gray-800 p-3 sm:p-5 transition-all hover:shadow-md dark:border-gray-700">
                  <div className="mb-2 sm:mb-3 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 shadow-sm shrink-0">
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </div>
                    <h5 className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 truncate">Transfers</h5>
                  </div>
                  {isLoadingDetails ? (
                    <div className="h-5 sm:h-7 w-full sm:w-24 animate-pulse bg-gray-200 dark:bg-gray-800" />
                  ) : (
                    <p className="text-base sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">{transfersTotal}</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Column 3: Player Games - Show third on mobile */}
          <div className="space-y-4 sm:space-y-6 order-3 lg:order-3">
            {/* Player Games Card */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-5 flex items-center justify-between">
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
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">Click "Add Game" to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {games.map((game: PlayerGame) => (
                    <div
                      key={game.id}
                      className="group border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm transition-all hover:shadow-md hover:border-gray-300 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900 dark:hover:border-gray-600"
                    >
                      {/* Top Section: Title, ID, and Status */}
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="mb-1 truncate text-base font-semibold text-gray-900 dark:text-gray-100">
                            {game.game__title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">ID: {game.game__id}</p>
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

                      {/* Divider */}
                      <div className="my-3 border-t border-gray-200 dark:border-gray-700" />

                      {/* Bottom Section: Balance, Date, and Actions */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Balance Button */}
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

                        {/* Date */}
                        {game.created && (
                          <div className="flex flex-1 items-center justify-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(game.created)}</span>
                          </div>
                        )}

                        {/* Three-dot Menu */}
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
                              onClick={() => setGameToChange(game)}
                              className="flex items-center gap-2"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                              </svg>
                              Change Status
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

      <PasswordResetDrawer
        isOpen={passwordResetState.isOpen}
        onClose={handleCancelPasswordReset}
        onConfirm={handleConfirmPasswordReset}
        username={selectedPlayer?.username}
        isLoading={passwordResetState.isLoading}
        title="Reset Player Password"
      />

      {selectedPlayer && (
        <AddGameDrawer
          isOpen={isAddGameDrawerOpen}
          onClose={() => setIsAddGameDrawerOpen(false)}
          playerId={selectedPlayer.id}
          playerUsername={selectedPlayer.username}
          playerGames={games}
          onGameAdded={() => {}}
          onSubmit={handleAddGame}
          isSubmitting={isAddingGame}
        />
      )}
    </div>
  );
}

