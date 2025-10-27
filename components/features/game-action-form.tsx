'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TransactionQueue, GameActionType } from '@/types';

interface GameActionFormProps {
  queue: TransactionQueue | null;
  onSubmit: (data: {
    txn_id: number;
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
        txn_id: number;
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
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <h3 className="text-sm font-bold">Transaction Queue #{queue.id}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><span className="text-muted-foreground text-xs">Type:</span> <span className="font-semibold capitalize">{queue.type.replace(/_/g, ' ')}</span></div>
            <div><span className="text-muted-foreground text-xs">Status:</span> <span className={`font-bold ${queue.status === 'failed' ? 'text-red-600' : 'text-yellow-600'}`}>{queue.status.toUpperCase()}</span></div>
            <div><span className="text-muted-foreground text-xs">Game:</span> <span className="font-semibold">{queue.game}</span></div>
            <div><span className="text-muted-foreground text-xs">Amount:</span> <span className="font-bold text-green-600">${queue.amount}</span></div>
          </div>
        </div>

        {/* Complete Action Fields */}
        <div className="space-y-3 p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-bold text-green-700">Mark as Complete</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Optional: Override system-generated values
          </p>
          
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
        <div className="flex gap-3 justify-end pt-2 border-t border-border/50">
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
            className="bg-green-600 hover:bg-green-700 font-bold min-w-[140px]"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Complete Transaction'
            )}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* Transaction Details */}
      <div className="bg-gradient-to-br from-muted/50 to-muted/30 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
          <h3 className="text-sm font-bold">Transaction Queue #{queue.id}</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Type:</span>
            <span className="font-semibold capitalize">{queue.type.replace(/_/g, ' ')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Status:</span>
            <span className={`font-bold px-2 py-0.5 rounded text-xs ${
              queue.status === 'failed' ? 'bg-red-500/20 text-red-600 border border-red-500/30' : 
              queue.status === 'pending' ? 'bg-yellow-500/20 text-yellow-600 border border-yellow-500/30' : 
              'bg-muted text-muted-foreground'
            }`}>
              {queue.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Game:</span>
            <span className="font-semibold">{queue.game}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Amount:</span>
            <span className="font-bold text-green-600">${queue.amount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">User ID:</span>
            <span className="font-semibold">{queue.user_id}</span>
          </div>
        </div>
        
        {queue.remarks && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <span className="text-muted-foreground text-xs font-medium">Remarks:</span>
            <p className="text-sm mt-1.5 bg-yellow-500/10 border border-yellow-500/20 p-2 rounded">{queue.remarks}</p>
          </div>
        )}
      </div>

      {/* Action Dropdown */}
      <div>
        <label className="block text-sm font-bold mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Select Action
        </label>
        <select
          value={actionType}
          onChange={(e) => handleActionSelect(e.target.value as GameActionType)}
          disabled={isSubmitting}
          className="w-full px-4 py-3 text-base font-medium border-2 border-border rounded-xl bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        >
          <option value="">-- Choose an action --</option>
          <option value="retry">🔄 Retry - Re-queue the task</option>
          <option value="cancel">❌ Cancel - Refund and rollback</option>
          <option value="complete">✅ Complete - Mark as success</option>
        </select>
        <p className="text-xs text-muted-foreground mt-2">
          Retry and Cancel execute immediately. Complete allows optional overrides.
        </p>
      </div>

      {isSubmitting && (
        <div className="flex items-center justify-center gap-3 p-4 bg-primary/10 rounded-xl border-2 border-primary/30">
          <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="font-semibold text-primary">Processing action...</span>
        </div>
      )}

      {/* Close Button */}
      <div className="flex justify-end pt-2 border-t border-border/50">
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

