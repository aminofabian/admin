'use client';

import { Check } from 'lucide-react';
import {
  GAME_API_VERSIONS,
  GAME_API_VERSION_OPTIONS,
  type GameApiVersion,
  type GameApiVersionOption,
} from '@/lib/constants/game-api-version';

const ACTIVE_STYLES: Record<GameApiVersion, string> = {
  [GAME_API_VERSIONS.V1]: 'bg-amber-500 text-white shadow-sm',
  [GAME_API_VERSIONS.V2]: 'bg-emerald-600 text-white shadow-sm',
};

const INACTIVE_STYLES =
  'text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white';

interface GameApiVersionPickerProps {
  activeVersion: GameApiVersion | null;
  disabled: boolean;
  onSelect: (version: GameApiVersion) => void;
}

function VersionSegment({
  option,
  isActive,
  disabled,
  onSelect,
}: {
  option: GameApiVersionOption;
  isActive: boolean;
  disabled: boolean;
  onSelect: (version: GameApiVersion) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={isActive}
      disabled={disabled}
      title={isActive ? `Currently on ${option.label}` : `Switch to ${option.label}. ${option.summary}`}
      onClick={() => onSelect(option.version)}
      className={`flex min-w-[7.5rem] items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60 ${
        isActive ? ACTIVE_STYLES[option.version] : INACTIVE_STYLES
      }`}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center">
        {isActive && <Check className="h-4 w-4" aria-hidden />}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold">{option.label}</span>
        <span className={`text-[11px] ${isActive ? 'text-white/85' : 'text-gray-500 dark:text-gray-400'}`}>
          {option.role}
        </span>
      </span>
    </button>
  );
}

export function GameApiVersionPicker({ activeVersion, disabled, onSelect }: GameApiVersionPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Game API version for category 2 games"
      className="inline-flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-900"
    >
      {GAME_API_VERSION_OPTIONS.map((option) => (
        <VersionSegment
          key={option.version}
          option={option}
          isActive={option.version === activeVersion}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
