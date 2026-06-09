'use client';

import {
  GAME_OPERATION_MODES,
  formatGameOperationModeLabel,
} from '@/lib/constants/game-operation-mode';
import type { GameOperationMode } from '@/types';

interface GameOperationModeSelectorProps {
  value: GameOperationMode;
  onChange: (mode: GameOperationMode) => void;
  disabled?: boolean;
  error?: string;
}

const MODE_OPTIONS: Array<{
  value: GameOperationMode;
  description: string;
}> = [
  {
    value: GAME_OPERATION_MODES.AUTO,
    description: 'API calls handle balances, recharges, and redeems automatically.',
  },
  {
    value: GAME_OPERATION_MODES.MANUAL,
    description: 'Transactions only — admins sync balances and limits manually later.',
  },
];

export function GameOperationModeSelector({
  value,
  onChange,
  disabled = false,
  error,
}: GameOperationModeSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-100">
        Game Mode
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {MODE_OPTIONS.map(option => {
          const isSelected = value === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`rounded-lg border p-3 text-left transition-colors ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40'
                  : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
              } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full border ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500 dark:border-indigo-400 dark:bg-indigo-400'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatGameOperationModeLabel(option.value)}
                </span>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
            </button>
          );
        })}
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
