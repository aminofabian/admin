'use client';

import { cn } from '@/lib/utils/formatters';

interface IdentityVerifiedTickProps {
  className?: string;
  /** Slightly larger icon for sidebar / profile headers. */
  size?: 'sm' | 'md';
}

/** Meta-style blue verified badge shown beside identity-verified player names. */
export function IdentityVerifiedTick({
  className,
  size = 'sm',
}: IdentityVerifiedTickProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-[#1877F2] text-white',
        size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5',
        className,
      )}
      title="Identity verified"
      aria-label="Identity verified"
    >
      <svg
        viewBox="0 0 12 12"
        className={size === 'md' ? 'h-2.5 w-2.5' : 'h-2 w-2'}
        aria-hidden
      >
        <path
          fill="currentColor"
          d="M4.65 8.85 2.1 6.3l.85-.85 1.7 1.7 3.9-3.9.85.85z"
        />
      </svg>
    </span>
  );
}
