'use client';

import { useEffect, useState } from 'react';
import type { CreateUserRequest, UpdateUserRequest, Affiliate, UpdateAffiliateRequest, AddManualAffiliateRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, AgentForm, CommissionSettingsForm, ManualAffiliateForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Badge, Button, Drawer, Modal } from '@/components/ui';
import { useAgentsStore } from '@/stores/use-agents-store';

export function AgentsSection() {
  const {
    // Agent data
    agents,
    isLoadingAgents,
    agentsError,
    
    // Affiliate data
    affiliates,
    isLoadingAffiliates,
    affiliatesError,
    
    // UI state
    currentPage,
    searchTerm,
    pageSize,
    
    // Form states
    isCreating,
    isUpdatingAffiliate,
    isAddingManualAffiliate,
    operationError,
    
    // Actions
    fetchAgents,
    fetchAffiliates,
    createAgent,
    updateAgent,
    updateAffiliateCommission,
    addManualAffiliate,
    setPage,
    setSearchTerm,
    clearErrors,
  } = useAgentsStore();

  // Local state for UI
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'agents' | 'affiliates'>('agents');
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isCommissionModalOpen, setIsCommissionModalOpen] = useState(false);
  const [isManualAffiliateModalOpen, setIsManualAffiliateModalOpen] = useState(false);

  // Initialize data on component mount
  useEffect(() => {
    fetchAgents();
    fetchAffiliates();
  }, [fetchAgents, fetchAffiliates]);

  // Clear errors when component unmounts
  useEffect(() => {
    return () => {
      clearErrors();
    };
  }, [clearErrors]);

  const handleCreateAgent = async (formData: CreateUserRequest | UpdateUserRequest) => {
    try {
      await createAgent(formData as CreateUserRequest);
      setIsDrawerOpen(false);
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  const handleUpdateAgent = async (id: number, data: UpdateUserRequest) => {
    try {
      await updateAgent(id, data);
    } catch (error) {
      console.error('Error updating agent:', error);
    }
  };

  const handleUpdateCommission = async (data: UpdateAffiliateRequest) => {
    if (!selectedAffiliate) return;
    
    try {
      await updateAffiliateCommission(selectedAffiliate.id, data);
      setIsCommissionModalOpen(false);
      setSelectedAffiliate(null);
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  };

  const handleAddManualAffiliate = async (data: AddManualAffiliateRequest) => {
    try {
      await addManualAffiliate(data);
      setIsManualAffiliateModalOpen(false);
    } catch (error) {
      console.error('Error adding manual affiliate:', error);
    }
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Show loading state
  if ((isLoadingAgents || isLoadingAffiliates) && !agents && !affiliates) {
    return <LoadingState />;
  }

  // Show error state
  if (agentsError || affiliatesError) {
    const errorMessage = agentsError || affiliatesError || 'An error occurred';
    const retryFunction = agentsError ? fetchAgents : fetchAffiliates;
    return <ErrorState message={errorMessage} onRetry={retryFunction} />;
  }

  // Show empty state
  if (activeTab === 'agents' && !agents?.results?.length && !searchTerm) {
    return <EmptyState title="No agents found" />;
  }

  if (activeTab === 'affiliates' && !affiliates?.results?.length && !searchTerm) {
    return <EmptyState title="No affiliates found" />;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agents & Affiliates</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage agent accounts and their affiliate commission settings
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'agents' && (
            <Button 
              variant="primary" 
              size="md"
              onClick={() => setIsDrawerOpen(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Agent
            </Button>
          )}
          {activeTab === 'affiliates' && (
            <Button 
              variant="primary" 
              size="md"
              onClick={() => setIsManualAffiliateModalOpen(true)}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Manual Affiliate
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'agents'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Agents ({agents?.count || 0})
        </button>
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'affiliates'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
          }`}
        >
          Affiliates ({affiliates?.count || 0})
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder={activeTab === 'agents' ? 'Search agents by username or email...' : 'Search affiliates by name or email...'}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {activeTab === 'agents' ? (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Agents</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{agents?.count || 0}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                {agents?.results?.filter(a => a.is_active).length || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Inactive</div>
              <div className="text-2xl font-bold text-red-500 mt-1">
                {agents?.results?.filter(a => !a.is_active).length || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">This Page</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{agents?.results?.length || 0}</div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Affiliates</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{affiliates?.count || 0}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Players</div>
              <div className="text-2xl font-bold text-blue-500 mt-1">
                {affiliates?.results?.reduce((sum, a) => sum + a.total_players, 0) || 0}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</div>
              <div className="text-2xl font-bold text-green-500 mt-1">
                ${affiliates?.results?.reduce((sum, a) => sum + a.total_earnings, 0).toFixed(2) || '0.00'}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Topup</div>
              <div className="text-2xl font-bold text-purple-500 mt-1">
                ${affiliates?.results?.reduce((sum, a) => sum + a.total_topup, 0).toFixed(2) || '0.00'}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            {activeTab === 'agents' ? (
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            ) : (
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Commission %</TableHead>
                <TableHead>Total Players</TableHead>
                <TableHead>Total Earnings</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            )}
          </TableHeader>
          <TableBody>
            {activeTab === 'agents' ? (
              agents?.results?.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>{agent.id}</TableCell>
                  <TableCell className="font-medium">{agent.username}</TableCell>
                  <TableCell>{agent.email}</TableCell>
                  <TableCell>
                    <Badge variant="info">{agent.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={agent.is_active ? 'success' : 'danger'}>
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {formatDate(agent.created)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUpdateAgent(agent.id, { is_active: !agent.is_active })}
                      >
                        {agent.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              affiliates?.results?.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell>{affiliate.id}</TableCell>
                  <TableCell className="font-medium">{affiliate.name}</TableCell>
                  <TableCell>{affiliate.email}</TableCell>
                  <TableCell>
                    <Badge variant="info">{affiliate.affiliate_percentage}%</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{affiliate.total_players}</Badge>
                  </TableCell>
                  <TableCell className="text-green-600 dark:text-green-400 font-medium">
                    ${affiliate.total_earnings.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setSelectedAffiliate(affiliate);
                          setIsCommissionModalOpen(true);
                        }}
                      >
                        Edit Commission
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => window.open(affiliate.affiliate_link, '_blank')}
                      >
                        View Link
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {activeTab === 'agents' && agents && agents.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(agents.count / pageSize)}
          hasNext={!!agents.next}
          hasPrevious={!!agents.previous}
          onPageChange={setPage}
        />
      )}
      
      {activeTab === 'affiliates' && affiliates && affiliates.count > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalPages={Math.ceil(affiliates.count / pageSize)}
          hasNext={!!affiliates.next}
          hasPrevious={!!affiliates.previous}
          onPageChange={setPage}
        />
      )}

      {/* Add Agent Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title="Create New Agent"
        size="lg"
      >
        {operationError && (
          <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{operationError}</span>
          </div>
        )}
        <AgentForm
          onSubmit={handleCreateAgent}
          onCancel={handleCloseDrawer}
          isLoading={isCreating}
        />
      </Drawer>

      {/* Commission Settings Modal */}
      <Modal
        isOpen={isCommissionModalOpen}
        onClose={() => {
          setIsCommissionModalOpen(false);
          setSelectedAffiliate(null);
        }}
        title="Edit Commission Settings"
        size="md"
      >
        {selectedAffiliate && (
          <CommissionSettingsForm
            affiliate={selectedAffiliate}
            onSubmit={handleUpdateCommission}
            onCancel={() => {
              setIsCommissionModalOpen(false);
              setSelectedAffiliate(null);
            }}
            isLoading={isUpdatingAffiliate}
          />
        )}
      </Modal>

      {/* Add Manual Affiliate Modal */}
      <Modal
        isOpen={isManualAffiliateModalOpen}
        onClose={() => setIsManualAffiliateModalOpen(false)}
        title="Add Manual Affiliate"
        size="md"
      >
        <ManualAffiliateForm
          onSubmit={handleAddManualAffiliate}
          onCancel={() => setIsManualAffiliateModalOpen(false)}
          isLoading={isAddingManualAffiliate}
        />
      </Modal>
    </div>
  );
}

