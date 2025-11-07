'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Badge,
  Button,
} from '@/components/ui';
import type { TransactionQueue } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

interface GameActivityTableProps {
  activities: TransactionQueue[];
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
  compact?: boolean;
  className?: string;
}

interface GameActivityRowProps {
  activity: TransactionQueue;
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
}

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  return type;
};

const mapTypeToVariant = (type: string): 'success' | 'danger' | 'info' | 'default' => {
  if (type === 'recharge_game') return 'success';
  if (type === 'redeem_game') return 'danger';
  return 'info';
};

const getStatusVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' => {
  switch (status.toLowerCase()) {
    case 'completed': return 'success';
    case 'pending': return 'warning';
    case 'failed': case 'cancelled': return 'danger';
    default: return 'info';
  }
};

function GameActivityRow({ 
  activity, 
  onViewDetails, 
  showActions = true,
  actionLoading = false 
}: GameActivityRowProps) {
  const statusVariant = getStatusVariant(activity.status);
  const typeLabel = mapTypeToLabel(activity.type);
  const typeVariant = mapTypeToVariant(activity.type);
  const formattedAmount = formatCurrency(activity.amount || '0');
  
  const bonusAmount = useMemo(() => {
    const bonus = activity.bonus_amount || activity.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [activity.bonus_amount, activity.data?.bonus_amount]);

  const formattedBonus = bonusAmount ? formatCurrency(String(bonusAmount)) : null;

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

  const zeroCurrency = formatCurrency('0');
  const creditsDisplay = useMemo(() => newCreditsBalance ?? zeroCurrency, [newCreditsBalance, zeroCurrency]);
  const winningsDisplay = useMemo(() => newWinningBalance ?? zeroCurrency, [newWinningBalance, zeroCurrency]);

  const websiteUsername = typeof activity.user_username === 'string' && activity.user_username.trim()
    ? activity.user_username.trim()
    : null;

  const websiteEmail = typeof activity.user_email === 'string' && activity.user_email.trim()
    ? activity.user_email.trim()
    : null;

  const gameName = activity.game || 'Unknown Game';
  const gameUsername = activity.game_username || null;

  const userInitial = websiteUsername
    ? websiteUsername.charAt(0).toUpperCase()
    : activity.user_id
      ? String(activity.user_id).charAt(0)
      : '—';

  const formattedCreatedAt = formatDate(activity.created_at);
  const formattedUpdatedAt = formatDate(activity.updated_at);
  const showUpdatedAt = activity.updated_at !== activity.created_at;

  const handleViewClick = useCallback(() => {
    onViewDetails?.(activity);
  }, [activity, onViewDetails]);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-semibold">
            {userInitial}
          </div>
          <div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {websiteUsername || `User ${activity.user_id}`}
            </div>
            {websiteEmail && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {websiteEmail}
              </div>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={typeVariant} className="capitalize">
          {typeLabel}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="font-medium">{gameName}</div>
      </TableCell>
      <TableCell>
        {gameUsername ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            {gameUsername}
          </div>
        ) : activity.status === 'cancelled' ? (
          <Badge variant="default" className="text-xs">
            Cancelled
          </Badge>
        ) : (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            —
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="text-sm font-bold text-green-600 dark:text-green-400">
          {formattedAmount}
          {formattedBonus && (
            <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-0.5">
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-muted-foreground">
            C: {creditsDisplay}
          </div>
          <div className="text-sm font-semibold text-muted-foreground">
            W: {winningsDisplay}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariant} className="capitalize">
          {activity.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && (
            <div>{formattedUpdatedAt}</div>
          )}
        </div>
      </TableCell>
      {showActions && (
        <TableCell className="text-right">
          <Button
            size="sm"
            variant="primary"
            disabled={actionLoading}
            onClick={handleViewClick}
          >
            View
          </Button>
        </TableCell>
      )}
    </TableRow>
  );
}

export function GameActivityTable({ 
  activities, 
  onViewDetails,
  showActions = true,
  actionLoading = false,
  compact = false,
  className = '',
}: GameActivityTableProps) {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return null;
  }

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card ${className}`}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Activity</TableHead>
              <TableHead>Game</TableHead>
              <TableHead>Game Username</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>New Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              {showActions && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((activity: TransactionQueue) => (
              <GameActivityRow
                key={activity.id}
                activity={activity}
                onViewDetails={onViewDetails}
                showActions={showActions}
                actionLoading={actionLoading}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

