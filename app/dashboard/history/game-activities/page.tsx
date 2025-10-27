'use client';

import { useEffect } from 'react';
import { useTransactionQueuesStore } from '@/stores';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell,
  Badge,
  Pagination,
} from '@/components/ui';
import { LoadingState, ErrorState, EmptyState } from '@/components/features';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';

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

  // Set filter to history on mount
  useEffect(() => {
    setFilter('history');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initial load
  useEffect(() => {
    fetchQueues();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'cancelled': return 'default';
      case 'pending': return 'warning';
      case 'failed': return 'danger';
      default: return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'recharge_game':
        return '➕';
      case 'redeem_game':
        return '➖';
      case 'add_user_game':
        return '👤';
      default:
        return '🎮';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'recharge_game':
        return 'Recharge';
      case 'redeem_game':
        return 'Redeem';
      case 'add_user_game':
        return 'Add User';
      default:
        return type;
    }
  };

  // Calculate stats
  const completedCount = queues?.results?.filter(q => q.status === 'completed').length || 0;
  const cancelledCount = queues?.results?.filter(q => q.status === 'cancelled').length || 0;
  const totalAmount = queues?.results?.reduce((sum, q) => sum + parseFloat(q.amount || '0'), 0) || 0;

  if (isLoading && !queues) {
    return <LoadingState />;
  }

  if (error && !queues) {
    return <ErrorState message={error} onRetry={fetchQueues} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Game Activity History</h1>
          <p className="text-muted-foreground mt-1">
            View completed and cancelled game activities
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Activities</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{queues?.count || 0}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Completed</span>
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Total Value</span>
            <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-2xl font-bold">{formatCurrency(totalAmount.toString())}</div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {queues?.results.length === 0 ? (
          <div className="py-12">
            <EmptyState 
              title="No game activity history" 
              description="No completed or cancelled game activities found"
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Game</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queues?.results.map((activity) => (
                    <TableRow key={activity.id}>
                      {/* Activity Type */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getTypeIcon(activity.type)}</span>
                          <Badge variant="info" className="capitalize">
                            {getTypeLabel(activity.type)}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Game Info */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{activity.game}</div>
                          <code className="text-xs text-muted-foreground">{activity.game_code}</code>
                        </div>
                      </TableCell>

                      {/* Amount */}
                      <TableCell>
                        <div className="font-bold">{formatCurrency(activity.amount)}</div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge variant={getStatusVariant(activity.status)} className="capitalize">
                          {activity.status}
                        </Badge>
                      </TableCell>

                      {/* Remarks */}
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
                          {activity.remarks || '-'}
                        </div>
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">{formatDate(activity.created_at)}</div>
                          {activity.updated_at !== activity.created_at && (
                            <div className="text-xs text-muted-foreground">
                              Updated {formatDate(activity.updated_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {queues && queues.count > 10 && (
              <div className="border-t border-border px-4 py-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(queues.count / 10)}
                  onPageChange={setPage}
                  hasNext={!!queues.next}
                  hasPrevious={!!queues.previous}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
