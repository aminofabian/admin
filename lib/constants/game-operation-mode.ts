import type { GameOperationMode } from '@/types';

export const GAME_OPERATION_MODES = {
  AUTO: 'auto',
  MANUAL: 'manual',
} as const satisfies Record<string, GameOperationMode>;

export const DEFAULT_GAME_OPERATION_MODE: GameOperationMode = GAME_OPERATION_MODES.AUTO;

export function normalizeGameOperationMode(value?: string | null): GameOperationMode {
  if (value === GAME_OPERATION_MODES.MANUAL) {
    return GAME_OPERATION_MODES.MANUAL;
  }

  return GAME_OPERATION_MODES.AUTO;
}

export function formatGameOperationModeLabel(mode: GameOperationMode): string {
  return mode === GAME_OPERATION_MODES.MANUAL ? 'Manual' : 'Auto';
}

export function isManualGameMode(mode?: string | null): boolean {
  return normalizeGameOperationMode(mode) === GAME_OPERATION_MODES.MANUAL;
}
