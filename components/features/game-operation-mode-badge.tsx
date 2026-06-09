'use client';

import { Badge } from '@/components/ui';
import {
  formatGameOperationModeLabel,
  isManualGameMode,
  normalizeGameOperationMode,
} from '@/lib/constants/game-operation-mode';
import type { Game } from '@/types';

interface GameOperationModeBadgeProps {
  mode?: Game['game_operation_mode'] | string | null;
  className?: string;
}

export function GameOperationModeBadge({ mode, className }: GameOperationModeBadgeProps) {
  const normalizedMode = normalizeGameOperationMode(mode);

  return (
    <Badge variant={isManualGameMode(normalizedMode) ? 'warning' : 'info'} className={className}>
      {formatGameOperationModeLabel(normalizedMode)}
    </Badge>
  );
}
