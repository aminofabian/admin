'use client';

import type { Player } from '@/types';
import { getPlayerReferredByDisplay } from '@/lib/players/referred-by';
import { formatCurrency } from '@/lib/utils/formatters';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

export interface PlayerReferralDetailsSectionProps {
  player: Player;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-gray-100 py-1.5 last:border-b-0 dark:border-gray-800 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-xs font-medium text-gray-900 dark:text-gray-100 sm:text-sm">{children}</dd>
    </div>
  );
}

export function PlayerReferralDetailsSection({ player }: PlayerReferralDetailsSectionProps) {
  const details = player.referral_details;
  const referredBy = getPlayerReferredByDisplay(player);
  const referralCode = details?.referral_code?.trim() || '—';
  const referralLink = details?.referral_link?.trim() || '';
  const totalRewards = details?.total_referral_rewards_earned;
  const totalReferred =
    typeof details?.total_referred_players === 'number'
      ? details.total_referred_players
      : details?.total_referred_players != null
        ? Number(details.total_referred_players)
        : null;

  return (
    <PlayerDetailPanel title="Referral details">
      <dl>
        <DetailRow label="Referred by">{referredBy}</DetailRow>
        <DetailRow label="Code">
          <span className="font-mono">{referralCode}</span>
        </DetailRow>
        <DetailRow label="Link">
          {referralLink ? (
            <a
              href={referralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-blue-600 hover:underline dark:text-blue-400"
            >
              {referralLink}
            </a>
          ) : (
            '—'
          )}
        </DetailRow>
        <DetailRow label="Rewards">
          {totalRewards != null && String(totalRewards).trim() !== ''
            ? formatCurrency(totalRewards)
            : '—'}
        </DetailRow>
        <DetailRow label="Referred">
          {totalReferred != null && !Number.isNaN(totalReferred) ? totalReferred : '—'}
        </DetailRow>
      </dl>
    </PlayerDetailPanel>
  );
}
