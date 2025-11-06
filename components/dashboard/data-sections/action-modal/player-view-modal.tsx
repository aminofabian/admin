'use client';

import { memo, useEffect, useState, useMemo } from 'react';
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

export const PlayerViewModal = memo(function PlayerViewModal({ 
  isOpen, 
  onClose, 
  player 
}: PlayerViewModalProps) {
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

  // Memoize computed values
  const statusColor = useMemo(
    () => selectedPlayer?.is_active ? 'green' : 'red',
    [selectedPlayer?.is_active]
  );

  const formattedBalance = useMemo(
    () => formatCurrency(selectedPlayer?.balance || 0),
    [selectedPlayer?.balance]
  );

  const formattedWinningBalance = useMemo(
    () => formatCurrency(selectedPlayer?.winning_balance || 0),
    [selectedPlayer?.winning_balance]
  );

  const formattedCreatedAt = useMemo(
    () => selectedPlayer?.created ? formatDate(selectedPlayer.created) : '—',
    [selectedPlayer?.created]
  );

  const formattedPurchases = useMemo(
    () => formatCurrency(selectedPlayer?.total_purchases || 0),
    [selectedPlayer?.total_purchases]
  );

  const formattedCashouts = useMemo(
    () => formatCurrency(selectedPlayer?.total_cashouts || 0),
    [selectedPlayer?.total_cashouts]
  );

  const formattedTransfers = useMemo(
    () => formatCurrency(selectedPlayer?.total_transfers || 0),
    [selectedPlayer?.total_transfers]
  );

  if (!selectedPlayer) {
    return null;
  }

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

          {/* User Information */}
          <DetailsRow>
            <DetailsField label="Full Name" value={selectedPlayer.full_name || '—'} />
            <DetailsField label="Email" value={selectedPlayer.email} />
          </DetailsRow>

          {/* Contact Information */}
          <DetailsRow>
            <DetailsField label="Phone" value={selectedPlayer.mobile_number || '—'} />
            <DetailsField label="DOB" value={selectedPlayer.dob || '—'} />
          </DetailsRow>

          {/* Location and Created */}
          <DetailsRow>
            <DetailsField label="State" value={selectedPlayer.state || '—'} />
            <DetailsField label="Created" value={formattedCreatedAt} />
          </DetailsRow>

          {/* Balance Information */}
          <DetailsRow>
            <DetailsHighlightBox
              label="Credit Balance"
              value={formattedBalance}
              variant="blue"
            />
            <DetailsHighlightBox
              label="Winning Balance"
              value={formattedWinningBalance}
              variant="green"
            />
          </DetailsRow>

          {/* Transaction Summary */}
          <div className="pt-2 border-t border-border">
            <DetailsRow>
              <DetailsHighlightBox
                label="Total Purchases"
                value={isLoadingDetails ? '—' : formattedPurchases}
                variant="purple"
              />
              <DetailsHighlightBox
                label="Total Cashouts"
                value={isLoadingDetails ? '—' : formattedCashouts}
                variant="purple"
              />
            </DetailsRow>
            <DetailsRow>
              <DetailsField label="Total Transfers" value={isLoadingDetails ? '—' : formattedTransfers} />
            </DetailsRow>
          </div>
        </div>
      </DetailsCard>

      <DetailsCloseButton onClose={onClose} />
    </DetailsModalWrapper>
  );
});

