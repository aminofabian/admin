'use client';

import { Button } from '@/components/ui';
import {
  getPlayerIdentityStatusLabel,
  isPlayerIdentityVerified,
  isPlayerPhoneVerified,
} from '@/lib/players/player-verification';
import type { Player } from '@/types';
import { PlayerVerificationActions } from '@/components/dashboard/players/player-verification-actions';

interface PlayerProfileAdminBarProps {
  player: Player;
  canEditVerification: boolean;
  onEdit: () => void;
  onUpdated: (player: Player) => void;
}

function StatusPill({
  label,
  value,
  tone,
}: {
  label: string;
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
    <div
      className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 sm:px-3 sm:py-2 ${toneClass}`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-xs font-semibold sm:text-sm">{value}</span>
    </div>
  );
}

export function PlayerProfileAdminBar({
  player,
  canEditVerification,
  onEdit,
  onUpdated,
}: PlayerProfileAdminBarProps) {
  const phoneVerified = isPlayerPhoneVerified(player);
  const identityVerified = isPlayerIdentityVerified(player);
  const identityLabel = getPlayerIdentityStatusLabel(player);

  const identityTone: 'success' | 'warning' | 'neutral' = identityVerified
    ? 'success'
    : identityLabel.toLowerCase().includes('pending')
      ? 'warning'
      : 'neutral';

  return (
    <section className="mb-4 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:mb-6">
      <div className="border-b border-gray-100 bg-gray-50/70 px-3 py-2.5 dark:border-gray-800 dark:bg-gray-800/40 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 sm:text-base">
              Profile management
            </h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 sm:text-xs">
              Edit player details and manage manual KYC verification overrides.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4">
        <div className="flex flex-wrap gap-2">
          <StatusPill
            label="Phone"
            value={phoneVerified ? 'Verified' : 'Unverified'}
            tone={phoneVerified ? 'success' : 'warning'}
          />
          <StatusPill label="Identity" value={identityLabel} tone={identityTone} />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
          <PlayerVerificationActions
            player={player}
            canEdit={canEditVerification}
            onUpdated={onUpdated}
            variant="menu"
          />
        </div>
      </div>
    </section>
  );
}
