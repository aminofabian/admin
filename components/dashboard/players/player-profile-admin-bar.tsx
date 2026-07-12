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
import type { Player } from '@/types';
import { PlayerVerificationActions } from '@/components/dashboard/players/player-verification-actions';

interface PlayerProfileAdminBarProps {
  player: Player;
  canEditVerification: boolean;
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

  const dotClass =
    tone === 'success'
      ? 'bg-emerald-500'
      : tone === 'warning'
        ? 'bg-amber-500'
        : 'bg-gray-400';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} aria-hidden />
      {value}
    </span>
  );
}

function AdminActionRow({
  icon,
  iconClassName,
  title,
  description,
  trailing,
}: {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  trailing: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
      <div className="flex min-w-0 items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 pl-11 sm:justify-end sm:pl-0">
        {trailing}
      </div>
    </div>
  );
}

export function PlayerProfileAdminBar({
  player,
  canEditVerification,
  onEdit,
  onUpdated,
}: PlayerProfileAdminBarProps) {
  const identityVerified = isPlayerIdentityVerified(player);
  const identityLabel = getPlayerIdentityStatusLabel(player);
  // Mark/unmark copy and actions are admin/manager-only (`canEditVerification`).
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

  const identityDescription =
    identityBlockReason ??
    (identityAction === 'mark'
      ? 'Manually approve identity when documents cannot be verified through the provider.'
      : identityAction === 'unmark'
        ? 'Remove a manual verification override and reset identity to not submitted.'
        : 'Current identity verification status for this player.');

  const profileDescription = kycComplete
    ? 'Profile is read-only while KYC is complete.'
    : 'Update name, contact info, and address.';

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mb-6">
      <div className="border-b border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40 sm:px-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
          Profile management
        </h2>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        <AdminActionRow
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          }
          iconClassName="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          title="Identity verification"
          description={identityDescription}
          trailing={
            <>
              <StatusBadge value={identityLabel} tone={identityTone} />
              <PlayerVerificationActions
                player={player}
                canEdit={canEditVerification}
                onUpdated={onUpdated}
              />
            </>
          }
        />

        <AdminActionRow
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          iconClassName="bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
          title="Player details"
          description={profileDescription}
          trailing={
            <Button
              variant="secondary"
              size="sm"
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit profile
            </Button>
          }
        />
      </div>
    </section>
  );
}
