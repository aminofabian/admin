'use client';

import { Modal, Button } from '@/components/ui';
import type { CheckPlayerGameBalanceResponse } from '@/types';

interface PlayerGameBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  playerUsername: string;
  balanceData: CheckPlayerGameBalanceResponse | null;
  isLoading: boolean;
  error: string | null;
}

export const PlayerGameBalanceModal = ({
  isOpen,
  onClose,
  gameTitle,
  playerUsername,
  balanceData,
  isLoading,
  error,
}: PlayerGameBalanceModalProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Player Game Balance">
      <div className="space-y-4">
        {/* Game and Player Info */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Game</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
                {gameTitle}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Player</p>
              <p className="text-base font-medium text-gray-900 dark:text-gray-100 mt-1">
                {playerUsername}
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400" />
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Checking game balance...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Success State */}
        {balanceData && balanceData.status === 'success' && !isLoading && !error && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800/50 rounded-lg p-6 text-center">
              <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                Game Balance
              </p>
              <p className="text-4xl font-bold text-green-700 dark:text-green-300">
                {formatCurrency(balanceData.balance)}
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
              <p className="flex items-center gap-2">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{balanceData.message}</span>
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

