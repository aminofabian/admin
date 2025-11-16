'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi, agentsApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, Select, ConfirmModal } from '@/components/ui';
import type { UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState } from '@/components/features';
import { EditPlayerDetailsDrawer } from '@/components/dashboard/players/edit-player-drawer';
import { usePlayerGames } from '@/hooks/use-player-games';
import type { PlayerGame } from '@/types';

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
  const [editableFields, setEditableFields] = useState<EditableFields>({
    email: '',
    full_name: '',
    dob: '',
    state: '',
    mobile_number: '',
  });

  // Update document title when player is loaded
  useEffect(() => {
    if (selectedPlayer) {
      document.title = `${selectedPlayer.username} - Player Details`;
    } else {
      document.title = 'Player Details';
    }
  }, [selectedPlayer]);

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

        // Set selected agent if player already has one
        if (selectedPlayer?.agent_id) {
          const agentExists = mappedOptions.some((opt) => opt.value === String(selectedPlayer.agent_id));
          if (agentExists) {
            setSelectedAgentId(String(selectedPlayer.agent_id));
          }
        }
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
  }, [selectedPlayer?.agent_id]);

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
        
        // Fetch player using the detail endpoint
        const player = await apiClient.get<Player>(API_ENDPOINTS.PLAYERS.DETAIL(playerId));
        setSelectedPlayer(player);
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
          setSelectedPlayer((prev) => ({
            ...prev!,
            total_purchases: details.total_purchases,
            total_cashouts: details.total_cashouts,
            total_transfers: details.total_transfers,
          }));
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
  }, [playerId, addToast]);


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

      // Use the new assign-player-to-agent endpoint
      const response = await playersApi.assignToAgent({
        player_id: selectedPlayer.id,
        agent_username: selectedAgent.label,
      });

      // Update local state with response data
      setSelectedPlayer((prev) => ({
        ...prev!,
        agent_id: response.data.agent_id,
        agent: {
          id: response.data.agent_id,
          username: response.data.agent_username,
        },
        agent_username: response.data.agent_username,
      }));

      addToast({
        type: 'success',
        title: 'Agent assigned',
        description: response.message || `Player "${response.data.player_username}" has been assigned to agent "${response.data.agent_username}".`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to assign agent';
      addToast({
        type: 'error',
        title: 'Assignment failed',
        description: message,
      });
    } finally {
      setIsAssigningAgent(false);
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
  const { games, isLoading: isLoadingGames } = usePlayerGames(playerId);

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
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:px-6 sm:py-5">
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={handleBack}
                className="p-2.5 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200"
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
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl lg:text-2xl">
                {selectedPlayer.username}
              </h2>
            </div>
            <div className="flex w-full items-stretch gap-2 sm:w-auto sm:items-center">
              <Button variant="secondary" size="sm" onClick={() => setIsEditDrawerOpen(true)} className="flex-1 sm:flex-none">
                Edit Details
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 md:p-8">
        {/* Hero Section: Player Profile */}
        <section className="relative overflow-hidden bg-indigo-600 p-6 shadow-xl dark:bg-indigo-800 sm:p-8">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center bg-white/20 backdrop-blur-sm text-2xl font-bold text-white shadow-lg ring-4 ring-white/20 dark:bg-white/10">
                {usernameInitial}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">
                  {selectedPlayer.username}
                </h1>
                <p className="mt-1 text-base text-white/90 sm:text-lg">
                  {selectedPlayer.full_name || 'No full name provided'}
                </p>
                <div className="mt-3">
                  <Badge
                    variant={selectedPlayer.is_active ? 'success' : 'danger'}
                    className="bg-white/20 text-white backdrop-blur-sm border-white/30"
                  >
                    {selectedPlayer.is_active ? '✓ Active' : '✗ Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Quick Stats in Hero */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 sm:gap-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/20">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">Credit</p>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{creditBalance}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 ring-1 ring-white/20">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">Winning</p>
                <p className="mt-1 text-xl font-bold text-white sm:text-2xl">{winningBalance}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column: Personal Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Personal Information */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Personal Information
              </h2>
              <div className="space-y-4">
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100 break-all">{selectedPlayer.email}</p>
                </div>
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Full Name</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.full_name || '—'}</p>
                </div>
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Date of Birth</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.dob || '—'}</p>
                </div>
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">State</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.state || '—'}</p>
                </div>
                <div className="flex items-start justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">{selectedPlayer.mobile_number || '—'}</p>
                </div>
                <div className="flex items-start justify-between pt-1">
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Agent</span>
                  <p className="max-w-[60%] text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                    {selectedPlayer.agent_username || 
                     (selectedPlayer.agent && typeof selectedPlayer.agent === 'object' && 'username' in selectedPlayer.agent 
                       ? selectedPlayer.agent.username 
                       : 'Not assigned')}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Actions & Management */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  onClick={handleViewTransactions}
                  className="group relative flex items-center justify-center gap-3 bg-indigo-600 p-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-xl active:scale-[0.98] dark:bg-indigo-700"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  View Transactions
                </Button>
                <Button
                  onClick={handleViewGameActivities}
                  className="group relative flex items-center justify-center gap-3 bg-purple-600 p-4 text-sm font-semibold text-white shadow-md transition-all hover:bg-purple-700 hover:shadow-xl active:scale-[0.98] dark:bg-purple-700"
                >
                  <svg className="h-5 w-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Game Activities
                </Button>
                <Button
                  onClick={() => setShowDeactivateModal(true)}
                  variant={selectedPlayer.is_active ? 'danger' : 'primary'}
                  className="col-span-full p-4 text-sm font-semibold shadow-md transition-all hover:shadow-xl active:scale-[0.98]"
                >
                  {selectedPlayer.is_active ? 'Deactivate Player' : 'Activate Player'}
                </Button>
              </div>
            </section>

            {/* Agent Assignment */}
            <section className="border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-800/50 dark:bg-emerald-950/20">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center bg-emerald-500 text-white shadow-md">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Agent Assignment</h2>
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
                    className="group flex items-center justify-center gap-2 bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
                  >
                    <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Assign Agent
                  </Button>
                </div>
                {selectedPlayer.agent_username && (
                  <div className="flex items-center gap-3 bg-emerald-100 px-4 py-3 dark:bg-emerald-950/30">
                    <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Current Agent</p>
                      <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">{selectedPlayer.agent_username}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* Bottom Section: Stats & Games */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Transaction Summary */}
          <section className="lg:col-span-2 border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Transaction Summary
              </h2>
              {isLoadingDetails && (
                <svg className="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="group border border-purple-200 bg-purple-50 p-5 transition-all hover:shadow-md dark:border-purple-800/50 dark:bg-purple-950/40">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center bg-purple-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-300">Purchases</h5>
                </div>
                {isLoadingDetails ? (
                  <div className="h-7 w-24 animate-pulse bg-purple-200 dark:bg-purple-800" />
                ) : (
                  <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{purchasesTotal}</p>
                )}
              </div>
              <div className="group border border-indigo-200 bg-indigo-50 p-5 transition-all hover:shadow-md dark:border-indigo-800/50 dark:bg-indigo-950/40">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center bg-indigo-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Cashouts</h5>
                </div>
                {isLoadingDetails ? (
                  <div className="h-7 w-24 animate-pulse bg-indigo-200 dark:bg-indigo-800" />
                ) : (
                  <p className="text-xl font-bold text-indigo-900 dark:text-indigo-100">{cashoutsTotal}</p>
                )}
              </div>
              <div className="group border border-violet-200 bg-violet-50 p-5 transition-all hover:shadow-md dark:border-violet-800/50 dark:bg-violet-950/40">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center bg-violet-500 text-white shadow-sm">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </div>
                  <h5 className="text-xs font-semibold uppercase tracking-wide text-violet-700 dark:text-violet-300">Transfers</h5>
                </div>
                {isLoadingDetails ? (
                  <div className="h-7 w-24 animate-pulse bg-violet-200 dark:bg-violet-800" />
                ) : (
                  <p className="text-xl font-bold text-violet-900 dark:text-violet-100">{transfersTotal}</p>
                )}
              </div>
            </div>
          </section>

          {/* Player Games & Account Info */}
          <div className="space-y-6">
            {/* Player Games */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Player Games
              </h2>
              {isLoadingGames ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 animate-pulse bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : games.length === 0 ? (
                <div className="py-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-gray-500 dark:text-gray-400">No games assigned</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {games.map((game: PlayerGame) => (
                    <div key={game.id} className="flex items-center justify-between border border-gray-200 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800/50 dark:hover:bg-gray-800">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{game.game__title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">ID: {game.game__id}</p>
                      </div>
                      <Badge variant={game.status === 'active' ? 'success' : 'danger'} className="text-xs shrink-0">
                        {game.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Account Information */}
            <section className="border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Account Details
              </h2>
              <div className="flex items-center gap-3 bg-gray-50 p-4 dark:bg-gray-800/50">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {selectedPlayer.created ? formatDate(selectedPlayer.created) : 'Not available'}
                  </p>
                </div>
              </div>
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
    </div>
  );
}

