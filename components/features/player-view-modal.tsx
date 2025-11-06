'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types';
import { Modal, Badge, useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';

interface PlayerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
}

export function PlayerViewModal({ isOpen, onClose, player }: PlayerViewModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(player);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    if (isOpen && player) {
      setSelectedPlayer(player);
      setIsLoadingDetails(true);

      playersApi.viewDetails(player.id)
        .then((details) => {
          setSelectedPlayer((prev) => ({
            ...prev!,
            total_purchases: details.total_purchases,
            total_cashouts: details.total_cashouts,
            total_transfers: details.total_transfers,
          }));
        })
        .catch((error) => {
          console.error('Failed to load player details:', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          if (!errorMessage.includes('timeout')) {
            addToast({
              type: 'error',
              title: 'Could not load transaction summary',
              description: 'Please try again or check your connection.',
            });
          }
        })
        .finally(() => {
          setIsLoadingDetails(false);
        });
    }
  }, [isOpen, player, addToast]);

  if (!selectedPlayer) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Player Details"
      size="md"
    >
      <div className="space-y-6">
        {/* Player Avatar & Basic Info */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-purple-200 dark:border-purple-800/50">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 dark:from-purple-600 dark:to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-purple-500/20">
            {selectedPlayer.username.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {selectedPlayer.username}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{selectedPlayer.full_name}</p>
            <Badge variant={selectedPlayer.is_active ? 'success' : 'danger'} className="mt-1">
              {selectedPlayer.is_active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</h4>
            <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.email}</p>
          </div>
          
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</h4>
            <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.mobile_number || 'Not provided'}</p>
          </div>
          
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</h4>
            <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.dob || 'Not provided'}</p>
          </div>
          
          <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</h4>
            <p className="text-gray-900 dark:text-gray-100">{selectedPlayer.state || 'Not provided'}</p>
          </div>
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Credit Balance</h4>
            </div>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{formatCurrency(selectedPlayer.balance)}</p>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800/50 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Winning Balance</h4>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(selectedPlayer.winning_balance)}</p>
          </div>
        </div>

        {/* Transaction Summary */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800/50">
          <h4 className="text-base font-bold text-purple-900 dark:text-purple-200 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Transaction Summary
            {isLoadingDetails && (
              <svg className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Purchases */}
            <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h5 className="text-xs font-semibold text-purple-700 dark:text-purple-300">Total Purchases</h5>
              </div>
              {isLoadingDetails ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-7 bg-purple-300/30 dark:bg-purple-700/30 rounded w-24"></div>
                </div>
              ) : (
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400 transition-all duration-300">
                  {formatCurrency(selectedPlayer.total_purchases || 0)}
                </p>
              )}
            </div>
            
            {/* Total Cashouts */}
            <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-indigo-200/50 dark:border-indigo-700/50 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h5 className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Total Cashouts</h5>
              </div>
              {isLoadingDetails ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-7 bg-indigo-300/30 dark:bg-indigo-700/30 rounded w-24"></div>
                </div>
              ) : (
                <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400 transition-all duration-300">
                  {formatCurrency(selectedPlayer.total_cashouts || 0)}
                </p>
              )}
            </div>
            
            {/* Total Transfers */}
            <div className="bg-white/60 dark:bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-violet-200/50 dark:border-violet-700/50 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-violet-500/20 dark:bg-violet-500/30 flex items-center justify-center">
                  <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <h5 className="text-xs font-semibold text-violet-700 dark:text-violet-300">Total Transfers</h5>
              </div>
              {isLoadingDetails ? (
                <div className="space-y-2 animate-pulse">
                  <div className="h-7 bg-violet-300/30 dark:bg-violet-700/30 rounded w-24"></div>
                </div>
              ) : (
                <p className="text-xl font-bold text-violet-600 dark:text-violet-400 transition-all duration-300">
                  {formatCurrency(selectedPlayer.total_transfers || 0)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account Created</h4>
          </div>
          <p className="text-gray-900 dark:text-gray-100 font-medium">{formatDate(selectedPlayer.created)}</p>
        </div>
      </div>
    </Modal>
  );
}

