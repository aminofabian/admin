'use client';

import { cn } from '@/lib/utils/formatters';

interface IdentityVerifiedTickProps {
  className?: string;
  /** Slightly larger icon for sidebar / profile headers. */
  size?: 'sm' | 'md';
}

/** Theme-colored circle + white shield check — identity verified badge beside player names. */
export function IdentityVerifiedTick({
  className,
  size = 'sm',
}: IdentityVerifiedTickProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 text-primary drop-shadow-[0_1px_1px_rgba(0,0,0,0.18)]',
        size === 'md' ? 'h-[18px] w-[18px]' : 'h-3.5 w-3.5',
        className,
      )}
      title="Identity verified"
      aria-label="Identity verified"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
        {/* Theme disc */}
        <circle cx="12" cy="12" r="12" fill="currentColor" />
        {/* Soft rim highlight */}
        <circle
          cx="12"
          cy="12"
          r="11.15"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.7"
        />
        {/* White shield */}
        <path
          fill="#FFFFFF"
          d="M12 4.15c.4 0 .78.07 1.42.3l4.05 1.42c.58.2.93.74.93 1.35v4.7c0 3.72-2.42 6.82-6.05 8.28a1.1 1.1 0 0 1-.7 0C7.02 18.49 4.6 15.39 4.6 11.67v-4.7c0-.61.35-1.15.93-1.35l4.05-1.42c.64-.23 1.02-.3 1.42-.3z"
        />
        {/* Theme-colored check cutout */}
        <path
          fill="currentColor"
          d="M10.42 14.95 7.7 12.23l1.2-1.2 1.52 1.52 3.9-3.9 1.2 1.2z"
        />
      </svg>
    </span>
  );
}
