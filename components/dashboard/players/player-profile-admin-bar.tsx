'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui';
import {
  getAdminIdentityVerificationAction,
  getAdminVerificationBlockReason,
  getPlayerIdentityStatusLabel,
  isPlayerIdentityVerified,
  isPlayerKycComplete,
} from '@/lib/players/player-verification';
import { canRefreshBinpayKyc } from '@/lib/players/binpay-verification';
import type { Player } from '@/types';
import { PlayerBinpayKycRefreshButton } from '@/components/dashboard/players/player-binpay-kyc-refresh-button';
import { PlayerVerificationActions } from '@/components/dashboard/players/player-verification-actions';
import { PlayerClearSsnHashButton } from '@/components/dashboard/players/player-clear-ssn-hash-button';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

interface PlayerProfileAdminBarProps {
  player: Player;
  canEditVerification: boolean;
  /** Sync from BinPay — staff/agents allowed; broader than manual mark/reset. */
  canSyncBinpay: boolean;
  /** Clear stored SSN hash — admins and managers only. */
  canClearSsnHash: boolean;
  onEdit: () => void;
  onUpdated: (player: Player) => void;
}

function StatusBadge({
  value,
  tone,
}: {
  value: string;
  tone: 'success' | 'warning' | 'neutral';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200'
        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 border px-2 py-0.5 text-[11px] font-medium ${toneClass}`}
    >
      {value}
    </span>
  );
}

function AdminActionRow({
  title,
  description,
  trailing,
}: {
  title: string;
  description: string;
  trailing: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{trailing}</div>
    </div>
  );
}

export function PlayerProfileAdminBar({
  player,
  canEditVerification,
  canSyncBinpay,
  canClearSsnHash,
  onEdit,
  onUpdated,
}: PlayerProfileAdminBarProps) {
  const identityVerified = isPlayerIdentityVerified(player);
  const identityLabel = getPlayerIdentityStatusLabel(player);
  const identityAction = canEditVerification
    ? getAdminIdentityVerificationAction(player)
    : null;
  const identityBlockReason = canEditVerification
    ? getAdminVerificationBlockReason(player)
    : null;
  const kycComplete = isPlayerKycComplete(player);

  const identityTone: 'success' | 'warning' | 'neutral' = identityVerified
    ? 'success'
    : identityLabel.toLowerCase().includes('pending')
      ? 'warning'
      : 'neutral';

  const showBinpaySync = canSyncBinpay && canRefreshBinpayKyc(player);
  const isPendingBinpay = identityLabel.toLowerCase().includes('pending');

  const identityDescription = identityBlockReason
    ? identityBlockReason
    : showBinpaySync
      ? isPendingBinpay
        ? 'Pending with BinPay — sync status if the webhook never arrived.'
        : 'Pull the latest BinPay KYC status for this player.'
      : identityAction === 'mark'
        ? 'Manually approve identity when documents cannot be verified through the provider.'
        : identityAction === 'unmark'
          ? 'Remove a manual verification override and reset identity to not submitted.'
          : 'Current identity verification status for this player.';

  const profileDescription = kycComplete
    ? 'Profile is read-only while KYC is complete.'
    : 'Update name, contact info, and address.';

  return (
    <PlayerDetailPanel title="Profile management" noPadding className="mb-3 sm:mb-4">
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <AdminActionRow
          title="Identity verification"
          description={identityDescription}
          trailing={
            <>
              <StatusBadge value={identityLabel} tone={identityTone} />
              <PlayerBinpayKycRefreshButton
                player={player}
                canSync={canSyncBinpay}
                onUpdated={onUpdated}
              />
              <PlayerVerificationActions
                player={player}
                canEdit={canEditVerification}
                onUpdated={onUpdated}
              />
            </>
          }
        />

        {canClearSsnHash && (
          <AdminActionRow
            title="SSN hash"
            description="Clear the stored SSN hash after verifying an email-change request so the same SSN can be used on another player account."
            trailing={
              <PlayerClearSsnHashButton
                player={player}
                canClear={canClearSsnHash}
                onUpdated={onUpdated}
              />
            }
          />
        )}

        <AdminActionRow
          title="Player details"
          description={profileDescription}
          trailing={
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5"
            >
              Edit profile
            </Button>
          }
        />
      </div>
    </PlayerDetailPanel>
  );
}
