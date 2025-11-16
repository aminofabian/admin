'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi, agentsApi } from '@/lib/api';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/constants/api';
import { Badge, Button, Input, Select, ConfirmModal } from '@/components/ui';
import type { UpdateUserRequest } from '@/types';
import { LoadingState, ErrorState } from '@/components/features';

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
  const [isEditing, setIsEditing] = useState(false);
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

  const handleFieldChange = useCallback((field: keyof EditableFields, value: string) => {
    setEditableFields((prev) => ({ ...prev, [field]: value }));
  }, []);

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

      setIsEditing(false);
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
      const agentId = parseInt(selectedAgentId, 10);
      if (isNaN(agentId)) {
        throw new Error('Invalid agent ID');
      }

      // Update player with agent_id
      await playersApi.update(selectedPlayer.id, {
        agent_id: agentId,
      });

      // Find the agent in options to get username
      const selectedAgent = agentOptions.find((opt) => opt.value === selectedAgentId);

      // Update local state
      setSelectedPlayer((prev) => ({
        ...prev!,
        agent_id: agentId,
        agent: selectedAgent ? { id: agentId, username: selectedAgent.label } : undefined,
        agent_username: selectedAgent?.label,
      }));

      addToast({
        type: 'success',
        title: 'Agent assigned',
        description: `Player has been assigned to agent "${selectedAgent?.label || 'Unknown'}".`,
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
                className="rounded-lg p-2.5 text-gray-500 transition-colors active:bg-gray-100 active:text-gray-700 dark:text-gray-400 dark:active:bg-gray-800 dark:active:text-gray-200"
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
              {!isEditing ? (
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="flex-1 sm:flex-none">
                  Edit Details
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="flex-1 sm:flex-none">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} isLoading={isSaving} className="flex-1 sm:flex-none">
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl space-y-4 p-3 sm:space-y-6 sm:p-4 md:space-y-8 md:p-6 lg:p-8">
        {/* Player Header Section */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-4 sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-lg font-bold text-white shadow-md dark:from-purple-600 dark:to-indigo-500 sm:h-16 sm:w-16 sm:text-xl md:h-20 md:w-20 md:text-2xl">
              {usernameInitial}
            </div>
            <div className="flex-1 space-y-1.5 sm:space-y-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 sm:text-xl md:text-2xl">
                  {selectedPlayer.username}
                </h3>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400 sm:mt-1 sm:text-sm">
                  {selectedPlayer.full_name || '—'}
                </p>
              </div>
              <div>
                <Badge
                  variant={selectedPlayer.is_active ? 'success' : 'danger'}
                  className="inline-flex text-xs sm:text-sm"
                >
                  {selectedPlayer.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:mb-5 sm:text-sm">
            Quick Actions
          </h3>
          <div className="space-y-4 sm:space-y-5">
            {/* History Actions */}
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
              <Button
                onClick={handleViewTransactions}
                className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-lg active:scale-[0.98] dark:from-indigo-600 dark:to-indigo-700 dark:hover:from-indigo-700 dark:hover:to-indigo-800 sm:w-auto"
              >
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="hidden sm:inline">View Transactions</span>
                <span className="sm:hidden">Transactions</span>
              </Button>
              <Button
                onClick={handleViewGameActivities}
                className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 px-5 py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-purple-700 hover:to-purple-800 hover:shadow-lg active:scale-[0.98] dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-700 dark:hover:to-purple-800 sm:w-auto"
              >
                <svg
                  className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="hidden sm:inline">View Game Activities</span>
                <span className="sm:hidden">Game Activities</span>
              </Button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                  Management
                </span>
              </div>
            </div>

            {/* Agent Assignment */}
            <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50 p-4 shadow-sm transition-all duration-200 hover:shadow-md dark:border-gray-700 dark:from-gray-800/50 dark:to-gray-800/30 sm:p-5">
              <div className="mb-3 flex items-center gap-2 sm:mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <svg
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                    />
                  </svg>
                </div>
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Assign to Agent
                </label>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-3">
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
                  className="group flex w-full items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-md transition-all duration-200 hover:from-emerald-700 hover:to-emerald-800 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 dark:from-emerald-600 dark:to-emerald-700 dark:hover:from-emerald-700 dark:hover:to-emerald-800 sm:w-auto"
                >
                  <svg
                    className="h-4 w-4 transition-transform duration-200 group-hover:scale-110"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Assign
                </Button>
              </div>
              {selectedPlayer.agent_username && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 dark:bg-emerald-950/20 sm:mt-4">
                  <svg
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 sm:text-sm">
                    <span className="font-medium">Current Agent:</span>{' '}
                    <span className="font-semibold">{selectedPlayer.agent_username}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Status Toggle */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <Button
                onClick={() => setShowDeactivateModal(true)}
                variant={selectedPlayer.is_active ? 'danger' : 'primary'}
                className="group flex w-full items-center justify-center gap-2.5 rounded-lg px-5 py-3 text-sm font-medium shadow-md transition-all duration-200 hover:shadow-lg active:scale-[0.98] sm:w-auto"
              >
                <svg
                  className={`h-4 w-4 transition-transform duration-200 group-hover:scale-110 ${
                    selectedPlayer.is_active ? 'rotate-0' : 'rotate-180'
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  {selectedPlayer.is_active ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  )}
                </svg>
                {selectedPlayer.is_active ? 'Deactivate Player' : 'Activate Player'}
              </Button>
            </div>
          </div>
        </section>

        {/* Personal Information Section */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:mb-4 md:mb-5 sm:text-sm">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4 md:gap-6">
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                Agent
              </label>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                {selectedPlayer.agent_username || 
                 (selectedPlayer.agent && typeof selectedPlayer.agent === 'object' && 'username' in selectedPlayer.agent 
                   ? selectedPlayer.agent.username 
                   : 'Not assigned')}
              </p>
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                Email
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editableFields.email}
                  onChange={(e) => handleFieldChange('email', e.target.value)}
                  className="w-full text-sm sm:text-base"
                />
              ) : (
                <p className="break-all text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                  {selectedPlayer.email}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                Full Name
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableFields.full_name}
                  onChange={(e) => handleFieldChange('full_name', e.target.value)}
                  className="w-full text-sm sm:text-base"
                />
              ) : (
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                  {selectedPlayer.full_name || 'Not provided'}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                Date of Birth
              </label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editableFields.dob}
                  onChange={(e) => handleFieldChange('dob', e.target.value)}
                  className="w-full text-sm sm:text-base"
                />
              ) : (
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                  {selectedPlayer.dob || 'Not provided'}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                State
              </label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editableFields.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="w-full text-sm sm:text-base"
                />
              ) : (
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                  {selectedPlayer.state || 'Not provided'}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2 sm:space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-xs">
                Phone Number
              </label>
              {isEditing ? (
                <Input
                  type="tel"
                  value={editableFields.mobile_number}
                  onChange={(e) => handleFieldChange('mobile_number', e.target.value)}
                  className="w-full text-sm sm:text-base"
                />
              ) : (
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">
                  {selectedPlayer.mobile_number || 'Not provided'}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Balance Section */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:mb-4 md:mb-5 sm:text-sm">
            Account Balances
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-3.5 dark:border-indigo-800/50 dark:from-indigo-950/40 dark:to-indigo-900/40 sm:p-4">
              <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50 sm:h-8 sm:w-8">
                  <svg
                    className="h-4 w-4 text-indigo-600 dark:text-indigo-400 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 sm:text-sm">
                  Credit Balance
                </h4>
              </div>
              <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 sm:text-2xl">
                {creditBalance}
              </p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-3.5 dark:border-emerald-800/50 dark:from-emerald-950/40 dark:to-emerald-900/40 sm:p-4">
              <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/50 sm:h-8 sm:w-8">
                  <svg
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400 sm:h-5 sm:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 sm:text-sm">
                  Winning Balance
                </h4>
              </div>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 sm:text-2xl">
                {winningBalance}
              </p>
            </div>
          </div>
        </section>

        {/* Transaction Summary */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4 md:mb-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:text-sm">
              Transaction Summary
            </h3>
            {isLoadingDetails && (
              <svg
                className="h-3.5 w-3.5 animate-spin text-gray-400 sm:h-4 sm:w-4"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all duration-200 active:border-gray-300 active:shadow-sm dark:border-gray-800 dark:bg-gray-800/50 dark:active:border-gray-700 sm:p-4">
              <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50 sm:h-8 sm:w-8">
                  <svg
                    className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 sm:h-4 sm:w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </div>
                <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 sm:text-xs">
                  Total Purchases
                </h5>
              </div>
              {isLoadingDetails ? (
                <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:h-7 sm:w-24" />
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                  {purchasesTotal}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all duration-200 active:border-gray-300 active:shadow-sm dark:border-gray-800 dark:bg-gray-800/50 dark:active:border-gray-700 sm:p-4">
              <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50 sm:h-8 sm:w-8">
                  <svg
                    className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 sm:h-4 sm:w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 sm:text-xs">
                  Total Cashouts
                </h5>
              </div>
              {isLoadingDetails ? (
                <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:h-7 sm:w-24" />
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                  {cashoutsTotal}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 transition-all duration-200 active:border-gray-300 active:shadow-sm dark:border-gray-800 dark:bg-gray-800/50 dark:active:border-gray-700 sm:p-4">
              <div className="mb-2.5 flex items-center gap-2 sm:mb-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/50 sm:h-8 sm:w-8">
                  <svg
                    className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 sm:h-4 sm:w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
                <h5 className="text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400 sm:text-xs">
                  Total Transfers
                </h5>
              </div>
              {isLoadingDetails ? (
                <div className="h-6 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700 sm:h-7 sm:w-24" />
              ) : (
                <p className="text-lg font-bold text-gray-900 dark:text-gray-100 sm:text-xl">
                  {transfersTotal}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Account Information */}
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-xl sm:p-5 md:p-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 sm:mb-4 md:mb-5 sm:text-sm">
            Account Information
          </h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <svg
                className="h-3.5 w-3.5 shrink-0 text-gray-400 dark:text-gray-500 sm:h-4 sm:w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span className="font-medium text-gray-600 dark:text-gray-400">Created:</span>
              <span className="text-gray-900 dark:text-gray-100">
                {selectedPlayer.created ? formatDate(selectedPlayer.created) : 'Not available'}
              </span>
            </div>
          </div>
        </section>
      </div>

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

