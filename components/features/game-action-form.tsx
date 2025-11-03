'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TransactionQueue, GameActionType } from '@/types';

const mapTypeToLabel = (type: string): string => {
  if (type === 'recharge_game') return 'Recharge';
  if (type === 'redeem_game') return 'Redeem';
  if (type === 'add_user_game') return 'Add User';
  return type;
};

interface GameActionFormProps {
  queue: TransactionQueue | null;
  onSubmit: (data: {
    txn_id: string | number;
    type: GameActionType;
    new_password?: string;
    new_balance?: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export function GameActionForm({ queue, onSubmit, onCancel }: GameActionFormProps) {
  const [actionType, setActionType] = useState<GameActionType | ''>('');
  const [newPassword, setNewPassword] = useState('');
  const [newBalance, setNewBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompleteFields, setShowCompleteFields] = useState(false);

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

  if (!queue) {
    return null;
  }

  const handleActionSelect = async (selectedAction: GameActionType) => {
    setActionType(selectedAction);
    
    if (selectedAction === 'complete') {
      // Show optional fields for complete action
      setShowCompleteFields(true);
    } else {
      // Execute immediately for retry and cancel
      await executeAction(selectedAction);
    }
  };

  const executeAction = async (action: GameActionType, password?: string, balance?: string) => {
    setIsSubmitting(true);
    
    try {
      const data: {
        txn_id: string | number;
        type: GameActionType;
        new_password?: string;
        new_balance?: string;
      } = {
        txn_id: queue.id,
        type: action,
      };

      if (action === 'complete') {
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
    await executeAction('complete', newPassword, newBalance);
  };

  if (showCompleteFields) {
    return (
      <form onSubmit={handleCompleteSubmit} className="space-y-4">
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
              <span className={`ml-2 font-medium ${queue.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{queue.status.toUpperCase()}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Game:</span>
              <span className="ml-2 font-medium">{queue.game}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Amount:</span>
              <span className="ml-2 font-medium text-green-600">${queue.amount}</span>
            </div>
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
        </div>

        {/* Complete Action Fields */}
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Optional: Override system-generated values</p>
          <Input
            label="New Password"
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave empty for system value"
          />
          <Input
            label="New Balance"
            type="text"
            value={newBalance}
            onChange={(e) => setNewBalance(e.target.value)}
            placeholder="Leave empty for system value"
          />
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
            }}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
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
          </div>
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
          <div className="mt-3 pt-3 border-t">
            <span className="text-muted-foreground text-xs">Remarks:</span>
            <p className="text-sm mt-1.5 text-muted-foreground">{queue.remarks}</p>
          </div>
        )}
      </div>

      {/* Action Dropdown */}
      <div>
        <label className="block text-sm font-medium mb-2">Select Action</label>
        <select
          value={actionType}
          onChange={(e) => handleActionSelect(e.target.value as GameActionType)}
          disabled={isSubmitting}
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-card focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">-- Choose an action --</option>
          <option value="retry">Retry</option>
          <option value="cancel">Cancel</option>
          <option value="complete">Complete</option>
        </select>
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
    </div>
  );
}

