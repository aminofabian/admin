'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { formatCurrency } from '@/lib/utils/formatters';
import type { TransactionQueue, GameActionType } from '@/types';

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game' || type === 'create_game') return 'Add User';
  return type;
};

interface GameActionFormProps {
  queue: TransactionQueue | null;
  onSubmit: (data: {
    txn_id: string | number;
    type: GameActionType;
    new_password?: string;
    new_balance?: string;
    new_username?: string;
    game_username?: string;
    game_password?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function GameActionForm({ queue, onSubmit, onCancel }: GameActionFormProps) {
  const [newPassword, setNewPassword] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteFields, setShowCompleteFields] = useState(false);
  const [pendingAction, setPendingAction] = useState<GameActionType | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const gameUsername = useMemo(() => {
    if (!queue) return null;
    if (typeof queue.game_username === 'string' && queue.game_username.trim()) {
      return queue.game_username.trim();
    }
    if (queue.data && typeof queue.data === 'object' && queue.data !== null) {
      const dataUsername = queue.data.username;
      if (typeof dataUsername === 'string' && dataUsername.trim()) {
        return dataUsername.trim();
      }
    }
    return null;
  }, [queue]);

  // Bonus amount calculation
  const bonusAmount = useMemo(() => {
    if (!queue) return null;
    const bonus = queue.bonus_amount || queue.data?.bonus_amount;
    if (!bonus) return null;
    const bonusValue = typeof bonus === 'string' || typeof bonus === 'number' 
      ? parseFloat(String(bonus)) 
      : 0;
    return bonusValue > 0 ? bonus : null;
  }, [queue]);

  const formattedBonus = useMemo(() => {
    return bonusAmount ? formatCurrency(String(bonusAmount)) : null;
  }, [bonusAmount]);

  // New credits and winnings from data object
  const newCreditsBalance = useMemo(() => {
    if (!queue) return null;
    const credits = queue.data?.new_credits_balance;
    if (credits === undefined || credits === null) return null;
    const creditsValue = typeof credits === 'string' || typeof credits === 'number'
      ? parseFloat(String(credits))
      : null;
    return creditsValue !== null && !isNaN(creditsValue) ? formatCurrency(String(creditsValue)) : null;
  }, [queue]);

  const newWinningBalance = useMemo(() => {
    if (!queue) return null;
    const winnings = queue.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [queue]);

  if (!queue) {
    return null;
  }

  const handleActionSelect = (selectedAction: GameActionType) => {
    if (selectedAction === 'complete') {
      // Show form fields for complete action
      setShowCompleteFields(true);
    } else {
      // Show confirmation for retry and cancel
      setPendingAction(selectedAction);
      setShowConfirmation(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    
    setShowConfirmation(false);
    await executeAction(pendingAction);
    setPendingAction(null);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingAction(null);
  };

  const executeAction = async (action: GameActionType, password?: string, balance?: string, username?: string) => {
    setIsSubmitting(true);
    
    try {
      const data: {
        txn_id: string | number;
        type: GameActionType;
        new_password?: string;
        new_balance?: string;
        new_username?: string;
        game_username?: string;
        game_password?: string;
      } = {
        txn_id: queue.id,
        type: action,
      };

      if (action === 'complete') {
        // For add_user_game and create_game types, use game_username and game_password
        const isAddUserType = queue.type === 'add_user_game' || queue.type === 'create_game';
        
        if (isAddUserType) {
          if (username?.trim()) data.game_username = username.trim();
          if (password?.trim()) data.game_password = password.trim();
        } else {
          if (username?.trim()) data.new_username = username.trim();
          if (password?.trim()) data.new_password = password.trim();
        }
        
        if (balance?.trim()) data.new_balance = balance.trim();
      }

      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAction('complete', newPassword, newBalance, newUsername);
  };

  // Determine required fields based on queue type
  const getRequiredFields = () => {
    if (queue.type === 'recharge_game' || queue.type === 'redeem_game') {
      return { balance: true, password: false, username: false };
    }
    if (queue.type === 'add_user_game' || queue.type === 'create_game') {
      return { balance: false, password: true, username: true };
    }
    // For future types like change_password_game
    if ((queue.type as string).includes('password')) {
      return { balance: false, password: true, username: false };
    }
    return { balance: false, password: false, username: false };
  };

  const requiredFields = getRequiredFields();

  const isFormValid = () => {
    if (requiredFields.balance && !newBalance.trim()) return false;
    if (requiredFields.password && !newPassword.trim()) return false;
    if (requiredFields.username && !newUsername.trim()) return false;
    return true;
  };

  // Type checks for layout rendering
  const isRechargeOrRedeem = queue.type === 'recharge_game' || queue.type === 'redeem_game';
  const isRedeem = queue.type === 'redeem_game';
  const isResetPassword = (queue.type as string).includes('password');

  const amountContainerClass = isRedeem
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/30'
    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30';
  const amountTextClass = isRedeem
    ? 'text-base font-bold text-red-600 dark:text-red-400'
    : 'text-base font-bold text-green-600 dark:text-green-400';
  const dividerColorClass = isRedeem
    ? 'bg-red-300 dark:bg-red-700'
    : 'bg-green-300 dark:bg-green-700';
  const bonusTextClass = isRedeem
    ? 'text-base font-bold text-red-500 dark:text-red-300'
    : 'text-base font-bold text-emerald-600 dark:text-emerald-400';

  const renderCompleteFormDetails = () => {
    if (isRechargeOrRedeem) {
      // For recharge and redeem: Type-Status, Game - Game Username, User - Email, New Credits - New Winnings
      return (
        <div className="space-y-2">
          {/* Transaction Type and Status */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {queue.type === 'recharge_game' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">{mapTypeToLabel(queue.type)}</div>
              </div>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              queue.status === 'failed' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {queue.status.toUpperCase()}
            </div>
          </div>

          {/* Game Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
              <div className="text-xs font-medium text-foreground">{queue.game}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
              <div className="text-xs font-medium text-foreground">{gameUsername || '—'}</div>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
              <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
              <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
            </div>
          </div>

          {/* Balance Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/30">
              <div className="text-[10px] text-muted-foreground mb-0.5">New Credits</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {newCreditsBalance || '—'}
              </div>
            </div>
            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/30">
              <div className="text-[10px] text-muted-foreground mb-0.5">New Winnings</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                {newWinningBalance || '—'}
              </div>
            </div>
          </div>

          {/* Transaction Amount */}
          <div className={`p-2 border rounded ${amountContainerClass}`}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-0.5">Amount</div>
                <div className={amountTextClass}>
                  {formatCurrency(queue.amount || '0')}
                </div>
              </div>
              {formattedBonus && (
                <>
                  <div className={`h-6 w-px ${dividerColorClass} mx-2`} />
                  <div className="flex-1 text-right">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Bonus</div>
                    <div className={bonusTextClass}>
                      +{formattedBonus}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isResetPassword) {
      // For Reset: Type-Status, Game - Game username, User - Email
      return (
        <div className="space-y-2">
          {/* Transaction Type and Status */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Reset</div>
              </div>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              queue.status === 'failed' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {queue.status.toUpperCase()}
            </div>
          </div>

          {/* Game Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
              <div className="text-xs font-medium text-foreground">{queue.game}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
              <div className="text-xs font-medium text-foreground">{gameUsername || '—'}</div>
            </div>
          </div>

          {/* User Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
              <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
              <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
            </div>
          </div>
        </div>
      );
    }

    // For Create Game
    return (
      <div className="space-y-2">
        {/* Transaction Type and Status */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">{mapTypeToLabel(queue.type)}</div>
            </div>
          </div>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            queue.status === 'failed' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
          }`}>
            {queue.status.toUpperCase()}
          </div>
        </div>

        {/* Game Information */}
        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800/30">
          <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
          <div className="text-xs font-semibold text-foreground">{queue.game}</div>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
            <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
            <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
          </div>
        </div>
        {gameUsername && (
          <div className="pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
            <div className="text-xs font-medium text-foreground">{gameUsername}</div>
          </div>
        )}
      </div>
    );
  };

  if (showCompleteFields) {
    return (
      <form onSubmit={handleCompleteSubmit} className="space-y-2">
        {/* Transaction Details */}
        <div className="border border-border rounded-lg">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold text-foreground">#{queue.id}</h3>
              </div>
              <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
                Manual Completion
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="px-3 py-2">
            {renderCompleteFormDetails()}
            
            {queue.remarks && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="p-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded">
                  <h4 className="text-[10px] font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                    Remarks
                  </h4>
                  <p className="text-[10px] text-amber-800 dark:text-amber-300">{queue.remarks}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete Action Fields */}
        <div className="border border-blue-200 dark:border-blue-800/30 rounded p-2 bg-blue-50 dark:bg-blue-900/10">
          <div className="mb-2">
            <h4 className="text-[10px] font-semibold text-foreground mb-0.5">
              {queue.type === 'recharge_game' 
                ? 'Recharge Operation - Required Field'
                : queue.type === 'redeem_game'
                ? 'Redeem Operation - Required Field'
                : queue.type === 'add_user_game' || queue.type === 'create_game'
                ? 'Create Game Account - Required Fields'
                : 'Complete Operation - Required Fields'}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {queue.type === 'recharge_game' || queue.type === 'redeem_game' 
                ? 'Enter the new game balance after manually completing the operation.'
                : queue.type === 'add_user_game' || queue.type === 'create_game'
                ? 'Enter the game username and password that were created.'
                : 'Enter the required information to complete this operation.'}
            </p>
          </div>
          
          <div className="space-y-2">
              {requiredFields.username && (
                <Input
                  label="New Game Username *"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter the game username"
                  required
                />
              )}
              
              {requiredFields.password && (
                <Input
                  label="Password *"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter the password"
                  required
                />
              )}
              
              {requiredFields.balance && (
                <Input
                  label="New Game Balance *"
                  type="text"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  placeholder="Enter the new balance (e.g., 1000.50)"
                  required
                />
              )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowCompleteFields(false);
              setNewPassword('');
              setNewBalance('');
              setNewUsername('');
            }}
            disabled={isSubmitting}
            size="sm"
            className="flex items-center gap-1 text-xs h-7 px-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
            size="sm"
            className="flex items-center gap-1 text-xs h-7 px-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete
              </>
            )}
          </Button>
        </div>
      </form>
    );
  }

  const renderTransactionDetails = () => {
    if (isRechargeOrRedeem) {
      // For recharge and redeem: Type-Status, Game - Game Username, User - Email, New Credits - New Winnings
      return (
        <div className="space-y-2">
          {/* Type - Status */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {queue.type === 'recharge_game' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  )}
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">{mapTypeToLabel(queue.type)}</div>
              </div>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              queue.status === 'failed' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : queue.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
            }`}>
              {queue.status.toUpperCase()}
            </div>
          </div>

          {/* Game - Game Username */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
              <div className="text-xs font-medium text-foreground">{queue.game}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
              <div className="text-xs font-medium text-foreground">{gameUsername || '—'}</div>
            </div>
          </div>

          {/* User - Email */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
              <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
              <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
            </div>
          </div>

          {/* New Credits - New Winnings */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800/30">
              <div className="text-[10px] text-muted-foreground mb-0.5">New Credits</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {newCreditsBalance || '—'}
              </div>
            </div>
            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800/30">
              <div className="text-[10px] text-muted-foreground mb-0.5">New Winnings</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
                {newWinningBalance || '—'}
              </div>
            </div>
          </div>

          {/* Amount and Bonus */}
          <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-[10px] text-muted-foreground mb-0.5">Amount</div>
                <div className="text-base font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(queue.amount || '0')}
                </div>
              </div>
              {formattedBonus && (
                <>
                  <div className="h-6 w-px bg-green-300 dark:bg-green-700 mx-2" />
                  <div className="flex-1 text-right">
                    <div className="text-[10px] text-muted-foreground mb-0.5">Bonus</div>
                    <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      +{formattedBonus}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isResetPassword) {
      // For Reset: Type-Status, Game - Game username, User - Email
      return (
        <div className="space-y-2">
          {/* Type - Status */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">Reset</div>
              </div>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
              queue.status === 'failed' 
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
                : queue.status === 'pending'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
            }`}>
              {queue.status.toUpperCase()}
            </div>
          </div>

          {/* Game - Game Username */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
              <div className="text-xs font-medium text-foreground">{queue.game}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
              <div className="text-xs font-medium text-foreground">{gameUsername || '—'}</div>
            </div>
          </div>

          {/* User - Email */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
              <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
            </div>
            <div className="flex flex-col">
              <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
              <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
            </div>
          </div>
        </div>
      );
    }

    // For Create Game
    return (
      <div className="space-y-2">
        {/* Type - Status */}
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <div className="text-xs font-semibold text-foreground">{mapTypeToLabel(queue.type)}</div>
            </div>
          </div>
          <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            queue.status === 'failed' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' 
              : queue.status === 'pending'
              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
          }`}>
            {queue.status.toUpperCase()}
          </div>
        </div>

        {/* Game Information */}
        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded border border-indigo-200 dark:border-indigo-800/30">
          <div className="text-[10px] text-muted-foreground mb-0.5">Game</div>
          <div className="text-xs font-semibold text-foreground">{queue.game}</div>
        </div>

        {/* User Information */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <div className="text-[10px] text-muted-foreground mb-0.5">User</div>
            <div className="text-xs font-medium text-foreground">{queue.user_username || '—'}</div>
          </div>
          <div className="flex flex-col">
            <div className="text-[10px] text-muted-foreground mb-0.5">Email</div>
            <div className="text-xs font-medium text-foreground truncate">{queue.user_email || '—'}</div>
          </div>
        </div>
        {gameUsername && (
          <div className="pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-0.5">Game Username</div>
            <div className="text-xs font-medium text-foreground">{gameUsername}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Transaction Details */}
      <div className="border border-border rounded-lg">
        {/* Header */}
        <div className="px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-foreground">#{queue.id}</h3>
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          {renderTransactionDetails()}
          
          {queue.remarks && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="p-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded">
                <h4 className="text-[10px] font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                  Remarks
                </h4>
                <p className="text-[10px] text-amber-800 dark:text-amber-300">{queue.remarks}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {isSubmitting && (
        <div className="flex items-center justify-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded">
          <svg className="animate-spin h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-[10px] font-medium text-foreground">Processing...</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-medium text-muted-foreground">Select Action</label>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleActionSelect('retry')}
            disabled={isSubmitting}
            size="sm"
            className="flex items-center justify-center gap-1 text-xs h-7 px-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] font-medium">Retry</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleActionSelect('cancel')}
            disabled={isSubmitting}
            size="sm"
            className="flex items-center justify-center gap-1 text-xs h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-[10px] font-medium">Cancel</span>
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleActionSelect('complete')}
            disabled={isSubmitting}
            size="sm"
            className="flex items-center justify-center gap-1 text-xs h-7 px-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-[10px] font-medium">Complete</span>
          </Button>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-1.5 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
          size="sm"
          className="text-xs h-7 px-2"
        >
          Close
        </Button>
      </div>

      {/* Confirmation Modal for Retry/Cancel */}
      <ConfirmModal
        isOpen={showConfirmation}
        onClose={handleCancelConfirmation}
        onConfirm={handleConfirmAction}
        title={pendingAction === 'retry' ? 'Confirm Retry' : 'Confirm Cancellation'}
        description={
          pendingAction === 'retry'
            ? `Are you sure you want to retry this ${mapTypeToLabel(queue.type).toLowerCase()} operation for ${queue.user_username || `User ${queue.user_id}`}? This will re-queue the task for processing.`
            : `Are you sure you want to cancel this ${mapTypeToLabel(queue.type).toLowerCase()} operation for ${queue.user_username || `User ${queue.user_id}`}? This action will mark the transaction as cancelled and may trigger refunds.`
        }
        confirmText={pendingAction === 'retry' ? 'Yes, Retry' : 'Yes, Cancel'}
        cancelText="No, Go Back"
        variant={pendingAction === 'retry' ? 'info' : 'danger'}
        isLoading={isSubmitting}
      />
    </div>
  );
}

