'use client';

import { useEffect, useState } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Affiliate, UpdateAffiliateRequest, AddManualAffiliateRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, AffiliateForm, AddManualAffiliateForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Drawer, Badge } from '@/components/ui';

export function AffiliatesSection() {
  const { user } = useAuth();
  const { 
    affiliates: data, 
    isLoading: loading, 
    error, 
    currentPage, 
    searchTerm, 
    pageSize,
    fetchAffiliates,
    updateAffiliate,
    addManualAffiliate, 
    setPage, 
    setSearchTerm 
  } = useAffiliatesStore();

  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const canManageAffiliates = user?.role === USER_ROLES.SUPERADMIN || user?.role === USER_ROLES.COMPANY;

  useEffect(() => {
    if (canManageAffiliates) {
      fetchAffiliates();
    }
  }, [fetchAffiliates, canManageAffiliates]);

  if (!canManageAffiliates) {
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
            You need <strong>company</strong> or <strong>superadmin</strong> privileges to access Affiliate Management.
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
  if (error) return <ErrorState message={error} onRetry={fetchAffiliates} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title="No affiliates found" />;
  }

  const handleUpdateAffiliate = async (formData: UpdateAffiliateRequest) => {
    if (!selectedAffiliate) return;

    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await updateAffiliate(selectedAffiliate.id, formData);
      
      setIsEditDrawerOpen(false);
      setSelectedAffiliate(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update affiliate';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddManualAffiliate = async (formData: AddManualAffiliateRequest) => {
    try {
      setIsSubmitting(true);
      setSubmitError('');
      
      await addManualAffiliate(formData);
      
      setIsAddDrawerOpen(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add affiliate';
      setSubmitError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseEditDrawer = () => {
    setIsEditDrawerOpen(false);
    setSelectedAffiliate(null);
    setSubmitError('');
  };

  const handleCloseAddDrawer = () => {
    setIsAddDrawerOpen(false);
    setSubmitError('');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-foreground">Affiliate Network</h2>
              <p className="text-muted-foreground mt-1">
                Manage agent affiliates and commission tracking
              </p>
            </div>
          </div>
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => setIsAddDrawerOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
          >
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Manual Affiliate
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by agent name or email..."
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Affiliates</div>
            <div className="text-2xl font-bold text-foreground mt-1">{data?.count || 0}</div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Players</div>
            <div className="text-2xl font-bold text-primary mt-1">
              {data?.results?.reduce((sum, aff) => sum + aff.total_players, 0) || 0}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Earnings</div>
            <div className="text-2xl font-bold text-green-500 mt-1">
              {formatCurrency(data?.results?.reduce((sum, aff) => sum + aff.total_earnings, 0) || 0)}
            </div>
          </div>
        </div>
        <div className="relative bg-card/95 backdrop-blur-sm p-4 border border-border/50 shadow-lg hover:shadow-md transition-all duration-200">
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          <div className="relative">
            <div className="text-sm text-muted-foreground">Total Topup</div>
            <div className="text-2xl font-bold text-primary mt-1">
              {formatCurrency(data?.results?.reduce((sum, aff) => sum + aff.total_topup, 0) || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Players</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Fees</TableHead>
              <TableHead className="text-right">Total Topup</TableHead>
              <TableHead className="text-right">Total Cashout</TableHead>
              <TableHead className="text-right">Earnings</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results?.map((affiliate) => (
              <TableRow key={affiliate.id}>
                <TableCell>{affiliate.id}</TableCell>
                <TableCell className="font-medium">{affiliate.name}</TableCell>
                <TableCell>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {affiliate.email}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="info">{affiliate.total_players}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {affiliate.affiliate_percentage}%
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    <div>Aff: {affiliate.affiliate_fee}%</div>
                    <div>PMF: {affiliate.payment_method_fee}%</div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(affiliate.total_topup)}
                </TableCell>
                <TableCell className="text-right font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(affiliate.total_cashout)}
                </TableCell>
                <TableCell className="text-right font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(affiliate.total_earnings)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedAffiliate(affiliate);
                      setIsEditDrawerOpen(true);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.count > pageSize && (
        <div className="relative bg-card/95 backdrop-blur-sm border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.015]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
          </div>
          
          <div className="relative">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(data.count / pageSize)}
              hasNext={!!data.next}
              hasPrevious={!!data.previous}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Edit Affiliate Commission Drawer */}
      <Drawer
        isOpen={isEditDrawerOpen}
        onClose={handleCloseEditDrawer}
        title="Update Affiliate Commission"
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
        {selectedAffiliate && (
          <AffiliateForm
            onSubmit={handleUpdateAffiliate}
            onCancel={handleCloseEditDrawer}
            initialData={selectedAffiliate}
          />
        )}
      </Drawer>

      {/* Add Manual Affiliate Drawer */}
      <Drawer
        isOpen={isAddDrawerOpen}
        onClose={handleCloseAddDrawer}
        title="Add Manual Affiliate"
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
        <AddManualAffiliateForm
          onSubmit={handleAddManualAffiliate}
          onCancel={handleCloseAddDrawer}
          isLoading={isSubmitting}
        />
      </Drawer>
    </div>
  );
}

