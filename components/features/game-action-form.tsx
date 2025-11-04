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
  }) => Promise<void>;
  onCancel: () => void;
}

export function GameActionForm({ queue, onSubmit, onCancel }: GameActionFormProps) {
  const [actionType, setActionType] = useState<GameActionType | ''>('');
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
  }, [queue?.data?.new_credits_balance]);

  const newWinningBalance = useMemo(() => {
    if (!queue) return null;
    const winnings = queue.data?.new_winning_balance;
    if (winnings === undefined || winnings === null) return null;
    const winningsValue = typeof winnings === 'string' || typeof winnings === 'number'
      ? parseFloat(String(winnings))
      : null;
    return winningsValue !== null && !isNaN(winningsValue) ? formatCurrency(String(winningsValue)) : null;
  }, [queue?.data?.new_winning_balance]);

  if (!queue) {
    return null;
  }

  const handleActionSelect = (selectedAction: GameActionType) => {
    setActionType(selectedAction);
    
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
    setActionType('');
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
      } = {
        txn_id: queue.id,
        type: action,
      };

      if (action === 'complete') {
        if (username?.trim()) data.new_username = username.trim();
        if (password?.trim()) data.new_password = password.trim();
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

  if (showCompleteFields) {
    return (
      <form onSubmit={handleCompleteSubmit} className="space-y-4">
        {/* Transaction Details */}
        <div className="p-4 border border-border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">#{queue.id}</h3>
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              Manual Completion
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Type:</span>
              <span className="ml-2 font-medium">{mapTypeToLabel(queue.type)}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status:</span>
              <span className={`ml-2 font-medium ${queue.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{queue.status.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Game:</span>
              <span className="ml-2 font-medium">{queue.game}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Amount:</span>
              <span className="ml-2 font-medium text-green-600">${queue.amount}</span>
              {formattedBonus && (
                <div className="ml-2 text-xs text-green-600 mt-0.5">
                  +{formattedBonus} bonus
                </div>
              )}
            </div>
            {newCreditsBalance && (
              <div>
                <span className="text-muted-foreground text-xs">New Credits:</span>
                <span className="ml-2 font-medium text-blue-600">{newCreditsBalance}</span>
              </div>
            )}
            {newWinningBalance && (
              <div>
                <span className="text-muted-foreground text-xs">New Winnings:</span>
                <span className="ml-2 font-medium text-green-600">{newWinningBalance}</span>
              </div>
            )}
            {queue.user_username && (
              <div>
                <span className="text-muted-foreground text-xs">User:</span>
                <span className="ml-2 font-medium">{queue.user_username}</span>
              </div>
            )}
            {queue.user_email && (
              <div>
                <span className="text-muted-foreground text-xs">Email:</span>
                <span className="ml-2 font-medium">{queue.user_email}</span>
              </div>
            )}
            {gameUsername && (
              <div>
                <span className="text-muted-foreground text-xs">Game Username:</span>
                <span className="ml-2 font-medium">{gameUsername}</span>
              </div>
            )}
          </div>
          
          {queue.remarks && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Remarks</h4>
              <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
                <p className="text-sm text-foreground">{queue.remarks}</p>
              </div>
            </div>
          )}
        </div>

        {/* Complete Action Fields */}
        <div className="space-y-3 p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/10">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-foreground">
                {queue.type === 'recharge_game' 
                  ? 'Recharge Operation - Required Field'
                  : queue.type === 'redeem_game'
                  ? 'Redeem Operation - Required Field'
                  : queue.type === 'add_user_game' || queue.type === 'create_game'
                  ? 'Create Game Account - Required Fields'
                  : 'Complete Operation - Required Fields'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {queue.type === 'recharge_game' || queue.type === 'redeem_game' 
                  ? 'Enter the new game balance after manually completing the operation in the game provider system.'
                  : queue.type === 'add_user_game' || queue.type === 'create_game'
                  ? 'Enter the game username and password that were created in the game provider system.'
                  : 'Enter the required information to complete this operation.'}
              </p>
            </div>
          </div>
          
          <div className="space-y-3 mt-3">
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
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setShowCompleteFields(false);
              setActionType('');
              setNewPassword('');
              setNewBalance('');
              setNewUsername('');
            }}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting ? 'Processing...' : 'Complete'}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transaction Details */}
      <div className="p-4 border border-border rounded-lg">
        <h3 className="text-sm font-semibold mb-3">#{queue.id}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">Type:</span>
            <span className="ml-2 font-medium">{mapTypeToLabel(queue.type)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Status:</span>
            <span className={`ml-2 font-medium ${queue.status === 'failed' ? 'text-red-600' : queue.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'}`}>
              {queue.status.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Game:</span>
            <span className="ml-2 font-medium">{queue.game}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Amount:</span>
            <span className="ml-2 font-medium text-green-600">${queue.amount}</span>
            {formattedBonus && (
              <div className="ml-2 text-xs text-green-600 mt-0.5">
                +{formattedBonus} bonus
              </div>
            )}
          </div>
          {newCreditsBalance && (
            <div>
              <span className="text-muted-foreground text-xs">New Credits:</span>
              <span className="ml-2 font-medium text-blue-600">{newCreditsBalance}</span>
            </div>
          )}
          {newWinningBalance && (
            <div>
              <span className="text-muted-foreground text-xs">New Winnings:</span>
              <span className="ml-2 font-medium text-green-600">{newWinningBalance}</span>
            </div>
          )}
          {queue.user_username && (
            <div>
              <span className="text-muted-foreground text-xs">User:</span>
              <span className="ml-2 font-medium">{queue.user_username}</span>
            </div>
          )}
          {queue.user_email && (
            <div>
              <span className="text-muted-foreground text-xs">Email:</span>
              <span className="ml-2 font-medium">{queue.user_email}</span>
            </div>
          )}
          {gameUsername && (
            <div>
              <span className="text-muted-foreground text-xs">Game Username:</span>
              <span className="ml-2 font-medium">{gameUsername}</span>
            </div>
          )}
        </div>
        
        {queue.remarks && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Remarks</h4>
            <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-lg">
              <p className="text-sm text-foreground">{queue.remarks}</p>
            </div>
          </div>
        )}
      </div>

      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <label className="block text-sm font-medium mb-2">Select Action</label>
        <div className="grid grid-cols-3 gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleActionSelect('retry')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleActionSelect('cancel')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => handleActionSelect('complete')}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Complete
          </Button>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
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

