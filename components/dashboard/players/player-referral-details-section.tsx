'use client';

import type { Player } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';

export interface PlayerReferralDetailsSectionProps {
  player: Player;
}

export function PlayerReferralDetailsSection({ player }: PlayerReferralDetailsSectionProps) {
  const details = player.referral_details;
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
    <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-3">
      <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 sm:h-7 sm:w-7">
          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h2 className="flex-1 text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">
          Referral Details
        </h2>
      </div>

      <div className="space-y-2.5 rounded-md border border-gray-100 bg-gray-50/50 px-2.5 py-2.5 dark:border-gray-800 dark:bg-gray-800/30">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Referral code
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 break-all">
            {referralCode}
          </p>
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Referral link
          </p>
          {referralLink ? (
            <a
              href={referralLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 block break-all text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              {referralLink}
            </a>
          ) : (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">—</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="rounded-md border border-gray-100 bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Rewards earned
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {totalRewards != null && String(totalRewards).trim() !== ''
                ? formatCurrency(totalRewards)
                : '—'}
            </p>
          </div>
          <div className="rounded-md border border-gray-100 bg-white px-2.5 py-2 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Referred players
            </p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">
              {totalReferred != null && !Number.isNaN(totalReferred) ? totalReferred : '—'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
