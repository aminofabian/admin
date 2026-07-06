'use client';

import { Badge } from '@/components/ui';
import {
  getPlayerBinpayVerificationBadgeVariant,
  getPlayerBinpayVerificationLabel,
} from '@/lib/players/binpay-verification';
import type { Player } from '@/types';

type PlayerBinpayVerificationBadgeProps = {
  player: Player | null | undefined;
  className?: string;
};

export function PlayerBinpayVerificationBadge({
  player,
  className = '',
}: PlayerBinpayVerificationBadgeProps) {
  return (
    <Badge
      variant={getPlayerBinpayVerificationBadgeVariant(player)}
      className={className}
    >
      {getPlayerBinpayVerificationLabel(player)}
    </Badge>
  );
}
