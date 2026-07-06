import type { ReactNode } from 'react';
import { PlayerBinpayVerificationBadge } from '@/components/dashboard/players/player-binpay-verification-badge';
import {
  getPlayerBinpayVerificationLabel,
  getPlayerBinpayVerificationProvider,
  getPlayerBinpayVerificationStatus,
} from '@/lib/players/binpay-verification';
import { isPlayerPhoneVerified } from '@/lib/players/player-verification';
import type { Player } from '@/types';

type PlayerBinpayVerificationCardProps = {
  player: Player;
  formatDate?: (date: string) => string;
};

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 px-2 py-1.5 sm:px-2.5 sm:py-2">
      <dt className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="min-w-0 text-right text-[11px] font-semibold leading-tight text-gray-900 dark:text-gray-100 sm:text-xs">
        {value}
      </dd>
    </div>
  );
}

export function PlayerBinpayVerificationCard({
  player,
  formatDate,
}: PlayerBinpayVerificationCardProps) {
  const status = getPlayerBinpayVerificationStatus(player);
  const provider = getPlayerBinpayVerificationProvider(player);
  const verifiedAt = player.identity_verified_at?.trim();
  const formattedVerifiedAt = verifiedAt && formatDate ? formatDate(verifiedAt) : verifiedAt;

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-3">
      <div className="mb-1.5 flex items-center justify-between gap-2 sm:mb-2">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 sm:h-7 sm:w-7">
            <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">BinPay verification</h2>
        </div>
        <PlayerBinpayVerificationBadge player={player} className="text-[10px] px-2 py-0.5" />
      </div>

      <dl className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-100 bg-gray-50/50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-800/30">
        <InfoRow label="Status" value={getPlayerBinpayVerificationLabel(player)} />
        <InfoRow label="Provider" value={provider ?? '—'} />
        <InfoRow
          label="Phone verified"
          value={isPlayerPhoneVerified(player) ? 'Yes' : 'No'}
        />
        {formattedVerifiedAt ? (
          <InfoRow label="Verified at" value={formattedVerifiedAt} />
        ) : null}
        {player.kyc_manual_status ? (
          <InfoRow label="Manual review" value={player.kyc_manual_status} />
        ) : null}
        {status === 'not_submitted' ? (
          <div className="px-2.5 py-2 text-[10px] leading-snug text-gray-500 dark:text-gray-400 sm:text-xs">
            Player has not completed BinPay cashout identity verification yet.
          </div>
        ) : null}
      </dl>
    </section>
  );
}
