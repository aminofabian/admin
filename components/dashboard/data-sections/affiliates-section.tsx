'use client';

import { useEffect, useState } from 'react';
import { useAffiliatesStore } from '@/stores';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { Affiliate, UpdateAffiliateRequest, AddManualAffiliateRequest } from '@/types';
import { LoadingState, ErrorState, EmptyState, AffiliateForm, AddManualAffiliateForm } from '@/components/features';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell, Pagination, SearchInput, Button, Drawer, Badge } from '@/components/ui';

const SECTION_TITLE = 'Managers';
const SECTION_SUBTITLE = 'Manage all manager accounts and permissions';
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
    <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#6366f1] dark:bg-[#312e81] dark:text-[#a5b4fc]">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{SECTION_TITLE}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">{SECTION_SUBTITLE}</p>
        </div>
      </div>
      <Button variant="primary" size="md" onClick={onAdd} className="lg:self-auto">
        {ADD_BUTTON_LABEL}
      </Button>
    </section>
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
  const hasAffiliates = affiliates.length > 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <Table>
        <TableHeader>
          <TableRow className="uppercase tracking-wide text-xs text-gray-500 dark:text-gray-400">
            <TableHead className="w-[220px]">Username</TableHead>
            <TableHead className="w-[240px]">Email</TableHead>
            <TableHead className="w-[140px]">Status</TableHead>
            <TableHead className="w-[220px]">Dates</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hasAffiliates ? (
            affiliates.map((affiliate) => (
              <ManagersTableRow key={affiliate.id} affiliate={affiliate} onEdit={onEdit} />
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                {EMPTY_HEADING}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
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
    <TableRow className="border-b border-border/40 last:border-0 dark:border-slate-700/80">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff] text-sm font-semibold text-[#6366f1] dark:bg-[#312e81] dark:text-[#a5b4fc]">
            {getInitials(affiliate.name)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{affiliate.name}</span>
            <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{ROLE_LABEL}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-sm text-gray-600 dark:text-gray-300">{affiliate.email || '—'}</span>
      </TableCell>
      <TableCell>
        <StatusBadge status={status} />
      </TableCell>
      <TableCell>
        <div className="flex flex-col text-sm text-gray-600 dark:text-gray-300">
          <span>{createdAt}</span>
          {relative && <span className="text-xs text-gray-500 dark:text-gray-400">{relative}</span>}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => onEdit(affiliate)}>
            Edit
          </Button>
          <Button variant="danger" size="sm" disabled title="Deactivation workflow is not available yet">
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

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={fetchAffiliates} />;
  if (!data?.results?.length && !searchTerm) {
    return <EmptyState title={EMPTY_HEADING} />;
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
      <ManagersTable affiliates={affiliates} onEdit={(affiliate) => {
        setSelectedAffiliate(affiliate);
        setIsEditDrawerOpen(true);
      }} />
      {data && data.count > pageSize ? (
        <section className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(data.count / pageSize)}
            hasNext={Boolean(data.next)}
            hasPrevious={Boolean(data.previous)}
            onPageChange={setPage}
          />
        </section>
      ) : null}
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

