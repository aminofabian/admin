'use client';

import { memo, useMemo } from 'react';
import { Badge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import type { TransactionQueue } from '@/types';
import {
  ActionModalWrapper,
  ModalHeader,
} from './action-modal-wrapper';

interface GameActivityViewModalProps {
  activity: TransactionQueue;
  isOpen: boolean;
  onClose: () => void;
}

export const GameActivityViewModal = memo(function GameActivityViewModal({
  activity,
  isOpen,
  onClose,
}: GameActivityViewModalProps) {
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

  const totalAmountSent = useMemo(() => {
    const dataAmount = activity.data?.amount;
    if (dataAmount === undefined || dataAmount === null) return null;
    return formatCurrency(String(dataAmount));
  }, [activity.data?.amount]);

  // New credits and winnings from data object
  const newCreditsBalance = useMemo(() => {
    const credits = activity.data?.new_credits_balance;
    if (credits === undefined || credits === null) return null;
    const creditsValue = typeof credits === 'string' || typeof credits === 'number'
      ? parseFloat(String(credits))
      : null;
    return creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;
  }, [activity.data?.new_credits_balance]);

  const newWinningBalance = useMemo(() => {
    const winnings = activity.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [activity.data?.new_winning_balance]);

  // Website user (actual user on the platform)
  const websiteUsername = useMemo(() => {
    if (typeof activity.user_username === 'string' && activity.user_username.trim()) {
      return activity.user_username.trim();
    }
    return null;
  }, [activity.user_username]);

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

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);
  const formattedUpdatedAt = useMemo(() => formatDate(activity.updated_at), [activity.updated_at]);
  const showUpdatedAt = useMemo(() => activity.updated_at !== activity.created_at, [activity.updated_at, activity.created_at]);

  return (
    <ActionModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Activity Details"
    >
      <ModalHeader
        badges={
          <>
            <Badge variant={statusVariant} className="text-sm px-3 py-1">
              {activity.status}
            </Badge>
            <Badge variant={typeVariant} className="text-sm px-3 py-1 capitalize">
              {typeLabel}
            </Badge>
          </>
        }
        amount={formattedAmount}
        bonus={formattedBonus ? `+${formattedBonus} bonus` : undefined}
      />

      {/* Amount Breakdown for Recharge */}
      {activity.type === 'recharge_game' && formattedBonus && totalAmountSent && (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
            <h3 className="text-sm font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-3">
              Recharge Breakdown
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-blue-700 dark:text-blue-300">Recharge Amount:</span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">{formattedAmount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-green-700 dark:text-green-300">Bonus Amount:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">+{formattedBonus}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="text-blue-700 dark:text-blue-300">Total Sent to Game:</span>
                <span className="font-bold text-blue-900 dark:text-blue-100">{totalAmountSent}</span>
              </div>
              {newCreditsBalance && (
                <div className="flex justify-between items-center">
                  <span className="text-blue-700 dark:text-blue-300">New Credits Balance:</span>
                  <span className="font-bold text-blue-900 dark:text-blue-100">{newCreditsBalance}</span>
                </div>
              )}
              {newWinningBalance && (
                <div className="flex justify-between items-center">
                  <span className="text-green-700 dark:text-green-300">New Winnings Balance:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{newWinningBalance}</span>
                </div>
              )}
              {!newCreditsBalance && !newWinningBalance && (
                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-800">
                  <span className="text-blue-700 dark:text-blue-300">New Game Balance:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formattedBalance}</span>
                </div>
              )}
            </div>
        </div>
      )}

      {/* Activity ID */}
      <div className="space-y-1">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity ID</label>
          <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
            {activity.id}
          </div>
      </div>

      {/* Game Information */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/30">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Game</label>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{activity.game}</div>
          </div>
          {/* Show balance information only if not in recharge breakdown */}
          {!(activity.type === 'recharge_game' && formattedBonus && totalAmountSent) && (
            <div className="space-y-3 mt-3">
              {(newCreditsBalance || newWinningBalance) ? (
                <>
                  {newCreditsBalance && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">New Credits Balance</label>
                      <div className="text-lg font-bold text-blue-900 dark:text-blue-100">{newCreditsBalance}</div>
                    </div>
                  )}
                  {newWinningBalance && (
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Winnings Balance</label>
                      <div className="text-lg font-bold text-green-900 dark:text-green-100">{newWinningBalance}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide">New Game Balance</label>
                  <div className="text-lg font-bold text-green-900 dark:text-green-100">{formattedBalance}</div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* User Information */}
      <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">User Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Username</label>
              <div className="text-sm font-semibold text-foreground">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Email</label>
              <div className="text-sm text-foreground">{activity.user_email || '—'}</div>
            </div>
          </div>
      </div>

      {/* Game Information */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Game Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Game Username</label>
              <div className="text-sm font-semibold text-foreground">
                {gameUsername || '—'}
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-muted-foreground">Operator</label>
              <div className="text-sm text-foreground">{activity.operator || '—'}</div>
            </div>
          </div>
      </div>

      {/* Timestamps */}
      <div className="space-y-3">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">Dates</h3>
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
    </ActionModalWrapper>
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
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  if (type === 'change_password' || type === 'reset_password') return 'Reset';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success';
  if (type === 'redeem_game') return 'danger';
  return 'info';
};
