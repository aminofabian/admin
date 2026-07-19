'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { playersApi } from '@/lib/api';
import {
  canRefreshBinpayKyc,
  getPlayerBinpayVerificationLabel,
} from '@/lib/players/binpay-verification';
import type { Player } from '@/types';

interface PlayerBinpayKycRefreshButtonProps {
  player: Player;
  canSync: boolean;
  onUpdated: (player: Player) => void;
}

export function PlayerBinpayKycRefreshButton({
  player,
  canSync,
  onUpdated,
}: PlayerBinpayKycRefreshButtonProps) {
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  if (!canSync || !canRefreshBinpayKyc(player)) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const previousLabel = getPlayerBinpayVerificationLabel(player);
      const refreshed = await playersApi.refreshBinpayKyc(player.id);
      onUpdated(refreshed);

      const nextLabel = getPlayerBinpayVerificationLabel(refreshed);
      const statusChanged = previousLabel !== nextLabel;

      addToast({
        type: 'success',
        title: 'BinPay KYC synced',
        description: statusChanged
          ? `Status updated: ${previousLabel} → ${nextLabel}.`
          : `Status is still ${nextLabel}. BinPay has not changed this player's KYC yet.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync BinPay KYC status';
      addToast({
        type: 'error',
        title: 'Sync failed',
        description: message,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-1.5 px-3 py-2"
      aria-label="Sync BinPay KYC verification status"
    >
      <svg
        className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {isRefreshing ? 'Syncing…' : 'Sync BinPay status'}
    </Button>
  );
}
