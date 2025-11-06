'use client';

import { useEffect, useState } from 'react';
import type { Player } from '@/types';
import { useToast } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils/formatters';
import { playersApi } from '@/lib/api';
import {
  DetailsModalWrapper,
  DetailsCard,
  DetailsHeader,
  DetailsRow,
  DetailsField,
  DetailsHighlightBox,
  DetailsCloseButton,
} from './details-modal-wrapper';

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

  const statusColor = selectedPlayer.is_active ? 'green' : 'red';

  return (
    <DetailsModalWrapper isOpen={isOpen} onClose={onClose} title="Player Details">
      <DetailsCard id={String(selectedPlayer.id)}>
        <div className="space-y-2">
          {/* Header with Username and Status */}
          <DetailsHeader
            icon={
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label={selectedPlayer.username}
            status={selectedPlayer.is_active ? 'active' : 'inactive'}
            statusColor={statusColor}
          />

          {/* Full Name */}
          {selectedPlayer.full_name && (
            <DetailsRow>
              <DetailsField label="Full Name" value={selectedPlayer.full_name} />
              <DetailsField label="Email" value={selectedPlayer.email} />
            </DetailsRow>
          )}

          {/* Contact Information */}
          <DetailsRow>
            <DetailsField label="Phone" value={selectedPlayer.mobile_number || '—'} />
            <DetailsField label="DOB" value={selectedPlayer.dob || '—'} />
          </DetailsRow>

          {/* State */}
          {selectedPlayer.state && (
            <DetailsRow>
              <DetailsField label="State" value={selectedPlayer.state} />
              <DetailsField label="Created" value={formatDate(selectedPlayer.created)} />
            </DetailsRow>
          )}

          {/* Balance Information */}
          <DetailsRow>
            <DetailsHighlightBox
              label="Credit Balance"
              value={formatCurrency(selectedPlayer.balance)}
              variant="blue"
            />
            <DetailsHighlightBox
              label="Winning Balance"
              value={formatCurrency(selectedPlayer.winning_balance)}
              variant="green"
            />
          </DetailsRow>

          {/* Transaction Summary */}
          <div className="pt-2 border-t border-border">
            <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Transaction Summary
              {isLoadingDetails && (
                <svg className="w-3 h-3 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="p-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-0.5">Purchases</div>
                {isLoadingDetails ? (
                  <div className="h-4 bg-purple-300/30 dark:bg-purple-700/30 rounded animate-pulse"></div>
                ) : (
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(selectedPlayer.total_purchases || 0)}
                  </div>
                )}
              </div>
              <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-0.5">Cashouts</div>
                {isLoadingDetails ? (
                  <div className="h-4 bg-indigo-300/30 dark:bg-indigo-700/30 rounded animate-pulse"></div>
                ) : (
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(selectedPlayer.total_cashouts || 0)}
                  </div>
                )}
              </div>
              <div className="p-1.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/30 rounded">
                <div className="text-[10px] text-muted-foreground mb-0.5">Transfers</div>
                {isLoadingDetails ? (
                  <div className="h-4 bg-violet-300/30 dark:bg-violet-700/30 rounded animate-pulse"></div>
                ) : (
                  <div className="text-xs font-bold text-violet-600 dark:text-violet-400">
                    {formatCurrency(selectedPlayer.total_transfers || 0)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DetailsCard>

      <DetailsCloseButton onClose={onClose} />
    </DetailsModalWrapper>
  );
}

