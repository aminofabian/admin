'use client';

import type { PlayerGame } from '@/types';
import { DropdownMenuItem } from '@/components/ui';

interface PlayerGameOperationMenuItemsProps {
  game: PlayerGame;
  onRecharge: (game: PlayerGame) => void;
  onRedeem: (game: PlayerGame) => void;
  onResetPassword: (game: PlayerGame) => void;
}

export function PlayerGameOperationMenuItems({
  game,
  onRecharge,
  onRedeem,
  onResetPassword,
}: PlayerGameOperationMenuItemsProps) {
  return (
    <>
      <DropdownMenuItem
        onClick={() => onRecharge(game)}
        className="flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
        Recharge
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onRedeem(game)}
        className="flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
        Redeem full balance
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onResetPassword(game)}
        className="flex items-center gap-2"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        Reset game password
      </DropdownMenuItem>
    </>
  );
}
