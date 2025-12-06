'use client';

import { useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
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
  if (type === 'change_password' || type === 'reset_password') return 'Reset';
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
  const router = useRouter();
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
  
  const shouldShowDash = useMemo(() => {
    const amountValue = parseFloat(activity.amount || '0');
    const isZeroAmount = amountValue === 0 || isNaN(amountValue);
    const typeStr = String(activity.type);
    const isNonMonetaryType = typeStr === 'create_game' || 
                              typeStr === 'reset_password' || 
                              typeStr === 'change_password' ||
                              typeStr === 'add_user_game';
    return isZeroAmount && isNonMonetaryType;
  }, [activity.amount, activity.type]);
  
  const amountColorClass = activity.type === 'redeem_game'
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';
  const bonusColorClass = amountColorClass;

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
  
  // Check if this is a reset or add user action - these should show hyphen for balance
  const shouldShowBlankBalance = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'change_password' || typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const creditsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    return newCreditsBalance ?? zeroCurrency;
  }, [shouldShowBlankBalance, newCreditsBalance, zeroCurrency]);
  
  const winningsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    return newWinningBalance ?? zeroCurrency;
  }, [shouldShowBlankBalance, newWinningBalance, zeroCurrency]);

  const websiteUsername = typeof activity.user_username === 'string' && activity.user_username.trim()
    ? activity.user_username.trim()
    : null;

  const websiteEmail = typeof activity.user_email === 'string' && activity.user_email.trim()
    ? activity.user_email.trim()
    : null;

  const gameName = activity.game || 'Unknown Game';
  const gameUsername = activity.game_username || null;

  // Check if this is an "Add user" action - should show hyphen for game username
  const isAddUserAction = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

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

  const handleOpenChat = useCallback(() => {
    const chatUrl = `/dashboard/chat?playerId=${activity.user_id}`;
    router.push(chatUrl);
  }, [router, activity.user_id]);

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleOpenChat}
            className="flex-shrink-0 touch-manipulation"
            title="Open chat with this player"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-sm cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={handleOpenChat}
              className="text-left touch-manipulation"
              title="Open chat with this player"
            >
              <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {websiteUsername || `User ${activity.user_id}`}
              </div>
            </button>
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
        {isAddUserAction ? (
          <div className="font-medium text-gray-900 dark:text-gray-100">
            —
          </div>
        ) : gameUsername ? (
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
        <div className={`text-sm font-bold ${shouldShowDash ? '' : amountColorClass}`}>
          {shouldShowDash ? '—' : formattedAmount}
          {!shouldShowDash && formattedBonus && (
            <div className={`text-xs font-semibold ${bonusColorClass} mt-0.5`}>
              +{formattedBonus} bonus
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            C: {creditsDisplay}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
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
        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          <div>{formattedCreatedAt}</div>
          {showUpdatedAt && (
            <div>{formattedUpdatedAt}</div>
          )}
        </div>
      </TableCell>
      {showActions && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
              disabled={actionLoading}
              onClick={handleViewClick}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View
            </Button>
          </div>
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  compact = false,
  className = '',
}: GameActivityTableProps) {
  if (!activities || !Array.isArray(activities) || activities.length === 0) {
    return null;
  }

  const hasNoBorder = className.includes('border-0') || className.includes('no-border');
  const containerClasses = hasNoBorder
    ? `bg-transparent overflow-hidden ${className}`
    : `bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`;

  return (
    <div className={containerClasses}>
      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 px-3 sm:px-4 pb-4 pt-4">
        {activities.map((activity: TransactionQueue) => (
          <GameActivityCard
            key={activity.id}
            activity={activity}
            onViewDetails={onViewDetails}
            showActions={showActions}
            actionLoading={actionLoading}
          />
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
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

// Game Activity Card Component for Mobile
interface GameActivityCardProps {
  activity: TransactionQueue;
  onViewDetails?: (activity: TransactionQueue) => void;
  showActions?: boolean;
  actionLoading?: boolean;
}

const GameActivityCard = memo(function GameActivityCard({ 
  activity, 
  onViewDetails,
  showActions = true,
  actionLoading = false,
}: GameActivityCardProps) {
  const router = useRouter();
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
  const amountColorClass = activity.type === 'redeem_game'
    ? 'text-red-600 dark:text-red-400'
    : 'text-green-600 dark:text-green-400';
  const bonusColorClass = amountColorClass;

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

  const credit = useMemo(() => {
    const creditValue = activity.data?.credit;
    if (creditValue === undefined || creditValue === null) return null;
    return formatCurrency(String(creditValue));
  }, [activity.data?.credit]);

  const winnings = useMemo(() => {
    const winningsValue = activity.data?.winnings;
    if (winningsValue === undefined || winningsValue === null) return null;
    return formatCurrency(String(winningsValue));
  }, [activity.data?.winnings]);

  const zeroCurrency = formatCurrency('0');
  
  // Check if this is a reset or add user action - these should show hyphen for balance
  const shouldShowBlankBalance = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'change_password' || typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const creditsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newCreditsBalance) return newCreditsBalance;
    if (credit) return credit;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newCreditsBalance, credit, zeroCurrency]);

  const winningsDisplay = useMemo(() => {
    if (shouldShowBlankBalance) return '—';
    if (newWinningBalance) return newWinningBalance;
    if (winnings) return winnings;
    return zeroCurrency;
  }, [shouldShowBlankBalance, newWinningBalance, winnings, zeroCurrency]);

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

  const gameUsername = useMemo(() => {
    if (typeof activity.game_username === 'string' && activity.game_username.trim()) {
      return activity.game_username.trim();
    }
    if (activity.data && typeof activity.data === 'object' && activity.data !== null) {
      const dataUsername = activity.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [activity.game_username, activity.data]);

  // Check if this is an "Add user" action - should show hyphen for game username
  const isAddUserAction = useMemo(() => {
    const typeStr = String(activity.type);
    return typeStr === 'add_user_game' || typeStr === 'create_game';
  }, [activity.type]);

  const userInitial = useMemo(() => {
    if (websiteUsername) {
      return websiteUsername.charAt(0).toUpperCase();
    }
    return activity.user_id ? String(activity.user_id).charAt(0) : '—';
  }, [websiteUsername, activity.user_id]);

  const formattedCreatedAt = useMemo(() => formatDate(activity.created_at), [activity.created_at]);

  const shouldShowDash = useMemo(() => {
    const amountValue = parseFloat(activity.amount || '0');
    const isZeroAmount = amountValue === 0 || isNaN(amountValue);
    const typeStr = String(activity.type);
    const isNonMonetaryType = typeStr === 'create_game' || 
                              typeStr === 'reset_password' || 
                              typeStr === 'change_password' ||
                              typeStr === 'add_user_game';
    return isZeroAmount && isNonMonetaryType;
  }, [activity.amount, activity.type]);

  const amountColorClassFinal = useMemo(() => {
    if (shouldShowDash) return '';
    return amountColorClass;
  }, [shouldShowDash, amountColorClass]);

  const bonusColorClassFinal = useMemo(() => {
    if (shouldShowDash) return '';
    return bonusColorClass;
  }, [shouldShowDash, bonusColorClass]);

  const handleViewClick = useCallback(() => {
    onViewDetails?.(activity);
  }, [activity, onViewDetails]);

  const handleOpenChat = useCallback(() => {
    const chatUrl = `/dashboard/chat?playerId=${activity.user_id}`;
    router.push(chatUrl);
  }, [router, activity.user_id]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm overflow-hidden">
      {/* Top Section: User, Activity Type & Status */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={handleOpenChat}
            className="flex-shrink-0 touch-manipulation"
            title="Open chat with this player"
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold shadow-md cursor-pointer hover:opacity-80 transition-opacity">
              {userInitial}
            </div>
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={handleOpenChat}
                  className="text-left w-full touch-manipulation"
                  title="Open chat with this player"
                >
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {websiteUsername || `User ${activity.user_id}`}
                  </h3>
                </button>
                {websiteEmail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {websiteEmail}
                  </p>
                )}
              </div>
              <Badge variant={typeVariant} className="text-[10px] px-2 py-0.5 capitalize shrink-0">
                {typeLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant} className="text-[10px] px-2 py-0.5 capitalize">
                {activity.status}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Section: Game Info */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800 space-y-2">
        {/* Game Name */}
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-4 4h2M7 20l1-4h8l1 4M6 8h12l2 4-2 4H6L4 12l2-4zM9 4h6l1 4H8l1-4z" />
          </svg>
          <span className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex-1">
            {activity.game || 'Unknown Game'}
          </span>
        </div>

        {/* Game Username */}
        {isAddUserAction ? (
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              —
            </span>
          </div>
        ) : gameUsername && (
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
              {gameUsername}
            </span>
          </div>
        )}
      </div>

      {/* Amount Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">Amount</span>
          <div className="text-right">
            <div className={`text-base font-bold ${amountColorClassFinal}`}>
              {shouldShowDash ? '—' : formattedAmount}
            </div>
            {!shouldShowDash && formattedBonus && (
              <div className={`text-xs font-semibold mt-0.5 ${bonusColorClassFinal}`}>
                +{formattedBonus} bonus
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Section */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-md p-2">
            <div className="text-[10px] text-blue-700 dark:text-blue-300 uppercase mb-0.5 font-medium">Credit</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {creditsDisplay}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/20 rounded-md p-2">
            <div className="text-[10px] text-green-700 dark:text-green-300 uppercase mb-0.5 font-medium">Winning</div>
            <div className="text-sm font-bold text-green-600 dark:text-green-400">
              {winningsDisplay}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Date & Action */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{formattedCreatedAt}</span>
        </div>
        {showActions && (
          <Button
            size="sm"
            variant="ghost"
            onClick={handleViewClick}
            disabled={actionLoading}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium shadow-sm text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800 touch-manipulation"
            title="View activity"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <span className="hidden sm:inline">View</span>
          </Button>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.activity.id === nextProps.activity.id &&
    prevProps.activity.status === nextProps.activity.status &&
    prevProps.activity.type === nextProps.activity.type &&
    prevProps.activity.amount === nextProps.activity.amount &&
    prevProps.activity.bonus_amount === nextProps.activity.bonus_amount &&
    prevProps.onViewDetails === nextProps.onViewDetails &&
    prevProps.showActions === nextProps.showActions &&
    prevProps.actionLoading === nextProps.actionLoading
  );
});

