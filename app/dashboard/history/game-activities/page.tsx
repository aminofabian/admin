'use client';

import { useEffect, useState } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { DashboardSectionHeader } from '@/components/dashboard/layout/dashboard-section-header';
import { DashboardActionBar } from '@/components/dashboard/layout/dashboard-action-bar';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Button, Modal, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import type { TransactionQueue } from '@/types';
import { HistoryGameActivitiesFilters, HistoryGameActivitiesFiltersState, QueueFilterOption } from '@/components/dashboard/history/history-game-activities-filters';

const HISTORY_BADGE = (
  <Badge variant="info" className="uppercase tracking-wide">
    History Only
  </Badge>
);

const HISTORY_EMPTY_STATE = (
  <EmptyState
    title="No game activity history"
    description="No completed or cancelled game activities matched your filters"
  />
);

const DEFAULT_GAME_ACTIVITY_FILTERS: HistoryGameActivitiesFiltersState = {
  status: '',
  userId: '',
};

function buildGameActivityFilterState(advanced: Record<string, string>): HistoryGameActivitiesFiltersState {
  return {
    status: advanced.status ?? '',
    userId: advanced.user_id ?? '',
  };
}

export default function HistoryGameActivitiesPage() {
  const { 
    queues,
    isLoading,
    error,
    currentPage,
    filter: queueFilter,
    setPage,
    setFilter,
    fetchQueues,
    advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters,
  } = useTransactionQueuesStore();

  const [filters, setFilters] = useState<HistoryGameActivitiesFiltersState>(() => buildGameActivityFilterState(advancedFilters));
  const [areFiltersOpen, setAreFiltersOpen] = useState(false);

  useEffect(() => {
    setFilter('history');
  }, [setFilter]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  useEffect(() => {
    setFilters(buildGameActivityFilterState(advancedFilters));

    if (Object.keys(advancedFilters).length > 0) {
      setAreFiltersOpen(true);
    }
  }, [advancedFilters]);

  const handleFilterChange = (key: keyof HistoryGameActivitiesFiltersState, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
  };

  const handleApplyFilters = () => {
    const nextFilters: Record<string, string> = {};

    if (filters.status.trim()) {
      nextFilters.status = filters.status.trim();
    }

    if (filters.userId.trim()) {
      nextFilters.user_id = filters.userId.trim();
    }

    setAdvancedFilters(nextFilters);
  };

  const handleClearFilters = () => {
    setFilters({ ...DEFAULT_GAME_ACTIVITY_FILTERS });
    clearAdvancedFilters();
  };

  const handleToggleFilters = () => {
    setAreFiltersOpen((previous) => !previous);
  };

  const handleQueueFilterChange = (value: QueueFilterOption) => {
    setFilter(value);
  };

  const results = queues?.results ?? [];
  const isInitialLoading = isLoading && !queues;
  const isEmpty = !results.length;

  return (
    <DashboardSectionContainer
      isLoading={isInitialLoading}
      error={error ?? ''}
      onRetry={fetchQueues}
      isEmpty={isEmpty}
      emptyState={HISTORY_EMPTY_STATE}
    >
      <HistoryTabs />
      <HistoryGameActivitiesLayout
        queueFilter={queueFilter as QueueFilterOption}
        onQueueFilterChange={handleQueueFilterChange}
        filters={filters}
        onFilterChange={handleFilterChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        areFiltersOpen={areFiltersOpen}
        onToggleFilters={handleToggleFilters}
        queues={results}
        currentPage={currentPage}
        totalCount={queues?.count ?? 0}
        onPageChange={setPage}
        pageSize={10}
      />
    </DashboardSectionContainer>
  );
}

interface HistoryGameActivitiesLayoutProps {
  queueFilter: QueueFilterOption;
  onQueueFilterChange: (value: QueueFilterOption) => void;
  filters: HistoryGameActivitiesFiltersState;
  onFilterChange: (key: keyof HistoryGameActivitiesFiltersState, value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  areFiltersOpen: boolean;
  onToggleFilters: () => void;
  queues: TransactionQueue[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryGameActivitiesLayout({
  queueFilter,
  onQueueFilterChange,
  filters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  areFiltersOpen,
  onToggleFilters,
  queues,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryGameActivitiesLayoutProps) {
  return (
    <>
      <DashboardSectionHeader
        title="Game Activity History"
        description="Audit completed and cancelled game operations across the platform"
        badge={HISTORY_BADGE}
      />
      <DashboardActionBar>
        <p className="text-sm text-muted-foreground">
          Showing activities completed or cancelled by system operators. Switch to processing to manage active queues.
        </p>
      </DashboardActionBar>
      <HistoryGameActivitiesFilters
        queueFilter={queueFilter}
        onQueueFilterChange={onQueueFilterChange}
        filters={filters}
        onFilterChange={onFilterChange}
        onApply={onApplyFilters}
        onClear={onClearFilters}
        isOpen={areFiltersOpen}
        onToggle={onToggleFilters}
      />
      <HistoryGameActivitiesTable
        queues={queues}
        currentPage={currentPage}
        totalCount={totalCount}
        onPageChange={onPageChange}
        pageSize={pageSize}
      />
    </>
  );
}

interface HistoryGameActivitiesTableProps {
  queues: TransactionQueue[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryGameActivitiesTable({
  queues,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
}: HistoryGameActivitiesTableProps) {
  const [selectedActivity, setSelectedActivity] = useState<TransactionQueue | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const handleViewActivity = (activity: TransactionQueue) => {
    setSelectedActivity(activity);
    setIsViewModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsViewModalOpen(false);
    setSelectedActivity(null);
  };

  if (!queues.length) {
    return null;
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Game</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>New Game Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((activity) => (
                <HistoryGameActivityRow key={activity.id} activity={activity} onView={handleViewActivity} />
              ))}
            </TableBody>
          </Table>
        </div>
        {totalCount > pageSize && (
          <div className="border-t border-border px-4 py-4">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / pageSize)}
              onPageChange={onPageChange}
              hasNext={currentPage * pageSize < totalCount}
              hasPrevious={currentPage > 1}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={isViewModalOpen}
        onClose={handleCloseModal}
        title="Activity Details"
        size="lg"
      >
        {selectedActivity && (
          <div className="space-y-6">
            {/* Header Section - Status and Type */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
              <div className="flex items-center gap-3">
                <Badge variant={mapStatusToVariant(selectedActivity.status)} className="text-sm px-3 py-1">
                  {selectedActivity.status}
                </Badge>
                <Badge variant="info" className="text-sm px-3 py-1 capitalize">
                  {mapTypeToLabel(selectedActivity.type)}
                </Badge>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{formatCurrency(selectedActivity.amount)}</div>
                {(() => {
                  const bonusAmount = selectedActivity.data?.bonus_amount;
                  const bonusValue = typeof bonusAmount === 'string' || typeof bonusAmount === 'number' 
                    ? parseFloat(String(bonusAmount)) 
                    : 0;
                  return bonusValue > 0 ? (
                    <div className="text-sm font-semibold text-green-600">
                      +{formatCurrency(String(bonusAmount))} bonus
                    </div>
                  ) : null;
                })()}
              </div>
            </div>

            {/* Activity IDs */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity ID</label>
                <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
                  {selectedActivity.id}
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operator</label>
                <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
                  {selectedActivity.operator || (typeof selectedActivity.data?.operator === 'string' ? selectedActivity.data.operator : '—')}
                </div>
              </div>
            </div>

            {/* Game Balance Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Game</label>
                <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{selectedActivity.game}</div>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Game Balance</label>
                <div className="text-lg font-bold text-green-900 dark:text-green-100">{formatCurrency(String(selectedActivity.data?.balance ?? '0'))}</div>
              </div>
            </div>

            {/* User Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">User Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Username</label>
                  <div className="text-sm font-semibold text-foreground">
                    {typeof selectedActivity.data?.username === 'string' ? selectedActivity.data.username : '—'}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">User ID</label>
                  <div className="text-sm text-foreground">
                    {selectedActivity.user_id}
                  </div>
                </div>
              </div>
            </div>

            {/* Operation Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Operation Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Operation Type</label>
                  <Badge variant="default" className="text-xs uppercase">
                    {typeof selectedActivity.data?.operation_type === 'string' ? selectedActivity.data.operation_type : '—'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Game Username</label>
                  <div className="text-sm text-foreground">
                    {typeof selectedActivity.data?.username === 'string' ? selectedActivity.data.username : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Timestamps</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Created</label>
                  <div className="text-sm font-medium text-foreground">{formatDate(selectedActivity.created_at)}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">Updated</label>
                  <div className="text-sm font-medium text-foreground">{formatDate(selectedActivity.updated_at)}</div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {selectedActivity.remarks && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Remarks</h3>
                <div className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
                  {selectedActivity.remarks}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

interface HistoryGameActivityRowProps {
  activity: TransactionQueue;
  onView: (activity: TransactionQueue) => void;
}

function HistoryGameActivityRow({ activity, onView }: HistoryGameActivityRowProps) {
  const statusVariant = mapStatusToVariant(activity.status);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {(() => {
              const username = typeof activity.data?.username === 'string' ? activity.data.username : null;
              return username ? username.charAt(0).toUpperCase() : '—';
            })()}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {typeof activity.data?.username === 'string' ? activity.data.username : '—'}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="info" className="capitalize">
          {mapTypeToLabel(activity.type)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{activity.game}</div>
      </TableCell>
      <TableCell>
        <div className="font-semibold">
          {formatCurrency(activity.amount)}
          {(() => {
            const bonusAmount = activity.data?.bonus_amount;
            const bonusValue = typeof bonusAmount === 'string' || typeof bonusAmount === 'number' 
              ? parseFloat(String(bonusAmount)) 
              : 0;
            return bonusValue > 0 ? (
              <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                +{formatCurrency(String(bonusAmount))} bonus
              </div>
            ) : null;
          })()}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(String(activity.data?.balance ?? '0'))}</div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {activity.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formatDate(activity.created_at)}</div>
          {activity.updated_at !== activity.created_at && (
            <div>{formatDate(activity.updated_at)}</div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onView(activity)}
        >
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

function mapStatusToVariant(status: string): 'success' | 'warning' | 'danger' | 'default' {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'default';
}

function mapTypeToIcon(type: string): string {
  if (type === 'recharge_game') return '➕';
  if (type === 'redeem_game') return '➖';
  if (type === 'add_user_game') return '👤';
  return '🎮';
}

function mapTypeToLabel(type: string): string {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game') return 'Add User';
  return type;
}
