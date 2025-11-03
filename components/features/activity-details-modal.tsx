'use client';

import { memo, useMemo } from 'react';
import { Badge, Modal } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { TransactionQueue } from '@/types';

interface ActivityDetailsModalProps {
  activity: TransactionQueue;
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityDetailsModal = memo(function ActivityDetailsModal({
  activity,
  isOpen,
  onClose,
}: ActivityDetailsModalProps) {
  // Memoize expensive computations
  const statusVariant = useMemo(() => mapStatusToVariant(activity.status), [activity.status]);
  const typeLabel = useMemo(() => mapTypeToLabel(activity.type), [activity.type]);
  const typeVariant = useMemo(() => mapTypeToVariant(activity.type), [activity.type]);
  const formattedAmount = useMemo(() => formatCurrency(activity.amount), [activity.amount]);
  
  const bonusAmount = useMemo(() => {
    const bonus = activity.bonus_amount || activity.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [activity.bonus_amount, activity.data?.bonus_amount]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  const formattedBalance = useMemo(() => {
    return formatCurrency(String(activity.data?.balance ?? '0'));
  }, [activity.data?.balance]);

  // Website user (actual user on the platform)
  const websiteUsername = useMemo(() => {
    if (typeof activity.user_username === 'string' && activity.user_username.trim()) {
      return activity.user_username.trim();
    }
    return null;
  }, [activity.user_username]);

  const websiteEmail = useMemo(() => {
    if (typeof activity.user_email === 'string' && activity.user_email.trim()) {
      return activity.user_email.trim();
    }
    return null;
  }, [activity.user_email]);

  // Game username (username used in the game)
  const gameUsername = useMemo(() => {
    // 1. Top-level game_username field
    if (typeof activity.game_username === 'string' && activity.game_username.trim()) {
      return activity.game_username.trim();
    }
    // 2. Username in data object (for completed transactions)
    if (activity.data && typeof activity.data === 'object' && activity.data !== null) {
      const dataUsername = activity.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [activity.game_username, activity.data]);

  const operator = useMemo(() => {
    return activity.operator || (typeof activity.data?.operator === 'string' ? activity.data.operator : '—');
  }, [activity.operator, activity.data?.operator]);

  const operationType = useMemo(() => {
    return typeof activity.data?.operation_type === 'string' ? activity.data.operation_type : '—';
  }, [activity.data?.operation_type]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
  const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Activity Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Header Section - Status and Type */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant} className="text-sm px-3 py-1">
              {activity.status}
            </Badge>
            <Badge variant={typeVariant} className="text-sm px-3 py-1 capitalize">
              {typeLabel}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-foreground">{formattedAmount}</div>
            {formattedBonus && (
              <div className="text-sm font-semibold text-green-600">
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>

        {/* Activity IDs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity ID</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {activity.id}
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Operator</label>
            <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
              {operator}
            </div>
          </div>
        </div>

        {/* Game Balance Section */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Game</label>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{activity.game}</div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Game Balance</label>
            <div className="text-lg font-bold text-green-900 dark:text-green-100">{formattedBalance}</div>
          </div>
        </div>

        {/* User Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Website User</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Username</label>
              <div className="text-sm font-semibold text-foreground">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Email</label>
              <div className="text-sm text-foreground">
                {websiteEmail || '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Game Username */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Game Username</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Game Username</label>
              {gameUsername ? (
                <div className="text-sm font-semibold text-foreground">
                  {gameUsername}
                </div>
              ) : activity.status === 'cancelled' ? (
                <Badge variant="default" className="text-xs">
                  Cancelled
                </Badge>
              ) : (
                <div className="text-sm font-semibold text-foreground">
                  —
                </div>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Operation Type</label>
              <Badge variant="default" className="text-xs uppercase">
                {operationType}
              </Badge>
            </div>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Timestamps</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Created</label>
              <div className="text-sm font-medium text-foreground">{formattedCreatedAt}</div>
            </div>
            {showUpdatedAt && (
              <div className="space-y-1">
                <label className="block text-xs font-medium text-muted-foreground">Updated</label>
                <div className="text-sm font-medium text-foreground">{formattedUpdatedAt}</div>
              </div>
            )}
          </div>
        </div>

        {/* Remarks */}
        {activity.remarks && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Remarks</h3>
            <div className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
              {activity.remarks}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
});

// Helper functions
const mapStatusToVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'completed') return 'success';
  if (status === 'pending') return 'warning';
  if (status === 'failed') return 'danger';
  return 'default';
};

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game') return 'Add User';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success';
  if (type === 'redeem_game') return 'danger';
  return 'info';
};

