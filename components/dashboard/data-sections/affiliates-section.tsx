'use client';

import { useEffect, useState } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Affiliate, UpdateAffiliateRequest, AddManualAffiliateRequest } from '@/types';
import { ErrorState, EmptyState, AffiliateForm, AddManualAffiliateForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Drawer, Badge, Skeleton } from '@/components/ui';

const SECTION_TITLE = 'Managers';
const ADD_BUTTON_LABEL = 'Add Manager';
const SEARCH_PLACEHOLDER = 'Search by username or email...';
const EMPTY_HEADING = 'No managers found';
const ROLE_LABEL = 'manager';

const AFFILIATE_STATUS_LABELS = {
  active: 'Active',
  new: 'New',
} as const;

type AffiliateStatus = keyof typeof AFFILIATE_STATUS_LABELS;

const RELATIVE_TIME_FORMATTER = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatDateTime(value: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRelativeTime(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  const diff = parsed.getTime() - Date.now();
  const minute = 60 * 1000;
  const hour = minute * 60;
  const day = hour * 24;

  if (Math.abs(diff) < hour) {
    return RELATIVE_TIME_FORMATTER.format(Math.round(diff / minute), 'minute');
  }
  if (Math.abs(diff) < day) {
    return RELATIVE_TIME_FORMATTER.format(Math.round(diff / hour), 'hour');
  }
  return RELATIVE_TIME_FORMATTER.format(Math.round(diff / day), 'day');
}

function getInitials(name: string) {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function getAffiliateStatus(affiliate: Affiliate): AffiliateStatus {
  const hasActivity = affiliate.total_players > 0 || affiliate.total_topup > 0 || affiliate.total_cashout > 0;
  return hasActivity ? 'active' : 'new';
}

function StatusBadge({ status }: { status: AffiliateStatus }) {
  const label = AFFILIATE_STATUS_LABELS[status];
  const variant = status === 'active' ? 'success' : 'info';
  return <Badge variant={variant}>{label}</Badge>;
}

function ManagersHeader({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
      <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
        {/* Icon */}
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
          <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        
        {/* Title */}
        <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
          {SECTION_TITLE}
        </h2>
        
        {/* Spacer */}
        <div className="flex-1 min-w-0" />
        
        {/* Add Manager Button */}
        <Button variant="primary" size="sm" onClick={onAdd} className="shrink-0">
          {ADD_BUTTON_LABEL}
        </Button>
      </div>
    </div>
  );
}

function ManagersSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (text: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <SearchInput value={value} onChange={(event) => onChange(event.target.value)} placeholder={SEARCH_PLACEHOLDER} />
    </section>
  );
}

function ManagersTable({
  affiliates,
  onEdit,
}: {
  affiliates: Affiliate[];
  onEdit: (affiliate: Affiliate) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Dates</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {affiliates.map((affiliate) => (
            <ManagersTableRow key={affiliate.id} affiliate={affiliate} onEdit={onEdit} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ManagersTableRow({
  affiliate,
  onEdit,
}: {
  affiliate: Affiliate;
  onEdit: (item: Affiliate) => void;
}) {
  const status = getAffiliateStatus(affiliate);
  const createdAt = formatDateTime(affiliate.created);
  const relative = formatRelativeTime(affiliate.created);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm">
            {getInitials(affiliate.name)}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-100">{affiliate.name}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{ROLE_LABEL}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-600 dark:text-gray-400">{affiliate.email || '—'}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-400">
          <span>{createdAt}</span>
          {relative && <span className="text-xs text-gray-500 dark:text-gray-400">{relative}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(affiliate)}
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            title="Deactivation workflow is not available yet"
            className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 opacity-50 cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Deactivate
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AccessDenied({ role }: { role?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-700/60 dark:bg-red-950/20">
        <svg className="mx-auto mb-4 h-16 w-16 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">Access Denied</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You need company or superadmin privileges to manage managers.
        </p>
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Current role: <span className="font-semibold text-gray-700 dark:text-gray-200">{role || 'unknown'}</span>
        </p>
      </div>
    </div>
  );
}

function DrawerError({ message }: { message: string }) {
  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-700/60 dark:bg-red-950/20 dark:text-red-200">
      <svg className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

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
    setSearchTerm,
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
    return <AccessDenied role={user?.role} />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-32 shrink-0" />
            <div className="flex-1 min-w-0" />
            <Skeleton className="h-9 w-32 rounded-md shrink-0" />
          </div>
        </div>

        {/* Search Skeleton */}
        <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Skeleton className="h-10 w-full" />
        </section>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-5 gap-4 px-4 py-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-24" />
                  ))}
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="grid grid-cols-5 gap-4 px-4 py-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <div className="flex flex-col gap-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Skeleton className="h-8 w-20 rounded-full" />
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) return <ErrorState message={error} onRetry={fetchAffiliates} />;

  const handleUpdateAffiliate = async (formData: UpdateAffiliateRequest) => {
    if (!selectedAffiliate) return;
    try {
      setIsSubmitting(true);
      setSubmitError('');
      await updateAffiliate(selectedAffiliate.id, formData);
      setIsEditDrawerOpen(false);
      setSelectedAffiliate(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update manager';
      setSubmitError(message);
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
      const message = err instanceof Error ? err.message : 'Failed to add manager';
      setSubmitError(message);
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

  const affiliates = data?.results ?? [];

  return (
    <div className="space-y-6">
      <ManagersHeader onAdd={() => setIsAddDrawerOpen(true)} />
      <ManagersSearch value={searchTerm} onChange={setSearchTerm} />
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {!data || affiliates.length === 0 ? (
          <div className="py-12">
            <EmptyState title={EMPTY_HEADING} />
          </div>
        ) : (
          <>
            <ManagersTable affiliates={affiliates} onEdit={(affiliate) => {
              setSelectedAffiliate(affiliate);
              setIsEditDrawerOpen(true);
            }} />
            {data && data.count > pageSize && (
              <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-t border-gray-200 dark:border-gray-700">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(data.count / pageSize)}
                  hasNext={Boolean(data.next)}
                  hasPrevious={Boolean(data.previous)}
                  onPageChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>
      <Drawer isOpen={isEditDrawerOpen} onClose={handleCloseEditDrawer} title="Edit Manager" size="lg">
        {submitError && <DrawerError message={submitError} />}
        {selectedAffiliate ? (
          <AffiliateForm onSubmit={handleUpdateAffiliate} onCancel={handleCloseEditDrawer} initialData={selectedAffiliate} />
        ) : null}
      </Drawer>
      <Drawer isOpen={isAddDrawerOpen} onClose={handleCloseAddDrawer} title="Add Manager" size="lg">
        {submitError && <DrawerError message={submitError} />}
        <AddManualAffiliateForm onSubmit={handleAddManualAffiliate} onCancel={handleCloseAddDrawer} isLoading={isSubmitting} />
      </Drawer>
    </div>
  );
}

