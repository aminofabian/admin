'use client';

import { useEffect, useMemo } from 'react';
import type { JSX } from 'react';
import { DashboardSectionContainer } from '@/components/dashboard/layout/dashboard-section-container';
import { DashboardSectionHeader } from '@/components/dashboard/layout/dashboard-section-header';
import { DashboardStatGrid } from '@/components/dashboard/layout/dashboard-stat-grid';
import { DashboardStatCard } from '@/components/dashboard/layout/dashboard-stat-card';
import { DashboardActionBar } from '@/components/dashboard/layout/dashboard-action-bar';
import { HistoryTabs } from '@/components/dashboard/layout/history-tabs';
import { Badge, Pagination, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { EmptyState } from '@/components/features';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { useTransactionQueuesStore } from '@/stores';
import type { TransactionQueue } from '@/types';

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

export default function HistoryGameActivitiesPage() {
  const { 
    queues,
    isLoading,
    error,
    currentPage,
    setPage,
    setFilter,
    fetchQueues,
  } = useTransactionQueuesStore();

  useEffect(() => {
    setFilter('history');
  }, [setFilter]);

  useEffect(() => {
    fetchQueues();
  }, [fetchQueues]);

  const results = queues?.results ?? [];
  const stats = useMemo(() => buildActivityStats(results, queues?.count ?? 0), [results, queues?.count]);
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
        stats={stats}
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
  stats: ActivityStat[];
  queues: TransactionQueue[];
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

function HistoryGameActivitiesLayout({
  stats,
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
      <DashboardStatGrid>
        {stats.map((stat) => (
          <DashboardStatCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            helperText={stat.helper}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </DashboardStatGrid>
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

type ActivityStat = {
  title: string;
  value: string;
  helper?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  icon: JSX.Element;
};

function buildActivityStats(queues: TransactionQueue[], total: number): ActivityStat[] {
  const completed = queues.filter((queue) => queue.status === 'completed').length;
  const cancelled = queues.filter((queue) => queue.status === 'cancelled').length;
  const totalValue = queues.reduce((sum, queue) => sum + parseFloat(queue.amount || '0'), 0);
  const pending = queues.filter((queue) => queue.status === 'pending').length;

  return [
    {
      title: 'Total Activities',
      value: total.toLocaleString(),
      helper: 'History filter applied',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: 'Completed',
      value: completed.toLocaleString(),
      helper: `${total ? Math.round((completed / total) * 100) : 0}% success`,
      variant: 'success',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    {
      title: 'Cancelled',
      value: cancelled.toLocaleString(),
      helper: `${total ? Math.round((cancelled / total) * 100) : 0}% of total`,
      variant: 'danger',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    {
      title: 'Pending Follow-ups',
      value: pending.toLocaleString(),
      helper: 'Review outstanding queue items',
      variant: 'warning',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4h4m4 0a8 8 0 11-16 0 8 8 0 0116 0z" />
        </svg>
      ),
    },
    {
      title: 'Total Value',
      value: formatCurrency(totalValue.toString()),
      helper: 'Aggregated transaction amount',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];
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
  if (!queues.length) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Operation Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Bonus Amount</TableHead>
              <TableHead>New Game Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Operator</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {queues.map((activity) => (
              <HistoryGameActivityRow key={activity.id} activity={activity} />
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
  );
}

interface HistoryGameActivityRowProps {
  activity: TransactionQueue;
}

function HistoryGameActivityRow({ activity }: HistoryGameActivityRowProps) {
  const statusVariant = mapStatusToVariant(activity.status);

  return (
    <TableRow>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium text-foreground">{activity.user_username ?? '—'}</div>
          <div className="text-xs text-muted-foreground">{activity.user_email ?? '—'}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="text-xl">{mapTypeToIcon(activity.type)}</span>
          <Badge variant="info" className="capitalize">
            {mapTypeToLabel(activity.type)}
          </Badge>
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="font-medium">{activity.game}</div>
          <code className="text-xs text-muted-foreground">{activity.game_code}</code>
        </div>
      </TableCell>
      <TableCell>
          <Badge variant="default" className="uppercase">
            {typeof activity.data?.operation_type === 'string' ? activity.data.operation_type : '—'}
          </Badge>
      </TableCell>
      <TableCell>
        <div className="font-semibold">{formatCurrency(activity.amount)}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-muted-foreground">{formatCurrency(String(activity.data?.bonus_amount ?? '0'))}</div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-semibold text-foreground">{formatCurrency(String(activity.data?.new_game_balance ?? '0'))}</div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {activity.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Created:</span> {formatDate(activity.created_at)}
          </div>
          {activity.updated_at !== activity.created_at && (
            <div>
              <span className="font-medium text-foreground">Updated:</span> {formatDate(activity.updated_at)}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm text-foreground">
          {activity.operator ?? '—'}
          <div className="text-xs text-muted-foreground">
            {typeof activity.data?.role === 'string' ? activity.data.role : '—'}
          </div>
        </div>
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
