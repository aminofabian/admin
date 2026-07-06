'use client';

import { Button } from '@/components/ui';

interface PlayerDetailHeaderActionsProps {
  onPrevious: () => void;
  onNext: () => void;
  onChat: () => void;
  previousDisabled?: boolean;
  nextDisabled?: boolean;
  previousLoading?: boolean;
  nextLoading?: boolean;
}

export function PlayerDetailHeaderActions({
  onPrevious,
  onNext,
  onChat,
  previousDisabled = false,
  nextDisabled = false,
  previousLoading = false,
  nextLoading = false,
}: PlayerDetailHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div
        className="flex items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/50"
        role="group"
        aria-label="Player navigation"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={previousDisabled}
          isLoading={previousLoading}
          className="rounded-none border-0 px-2.5 py-1.5 sm:px-3 sm:py-2 hover:bg-white dark:hover:bg-gray-900"
          aria-label="Previous player"
        >
          <span className="hidden sm:inline text-xs sm:text-sm">Prev</span>
          <span className="sm:hidden text-xs">◀</span>
        </Button>
        <div className="h-5 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={nextDisabled}
          isLoading={nextLoading}
          className="rounded-none border-0 px-2.5 py-1.5 sm:px-3 sm:py-2 hover:bg-white dark:hover:bg-gray-900"
          aria-label="Next player"
        >
          <span className="hidden sm:inline text-xs sm:text-sm">Next</span>
          <span className="sm:hidden text-xs">▶</span>
        </Button>
      </div>

      <Button
        variant="primary"
        size="sm"
        onClick={onChat}
        className="flex items-center gap-1.5 touch-manipulation px-2.5 sm:px-3 py-1.5 sm:py-2"
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="hidden sm:inline text-xs sm:text-sm">Chat</span>
      </Button>
    </div>
  );
}
