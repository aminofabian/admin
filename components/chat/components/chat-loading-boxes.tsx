'use client';

/**
 * Compact green bouncing cards for the chat connect banner.
 * Used while the first WebSocket handshake / history load is in progress.
 */
export function ChatLoadingBoxes({
  className = '',
  label = 'Loading chats...',
}: {
  className?: string;
  label?: string;
}) {
  const boxes = [
    { h: 'h-2.5', delay: '0ms' },
    { h: 'h-3.5', delay: '140ms' },
    { h: 'h-2.5', delay: '280ms' },
  ] as const;

  return (
    <div
      className={`flex items-center justify-center gap-2.5 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex h-4 items-end gap-1" aria-hidden>
        {boxes.map((box, i) => (
          <span
            key={i}
            className={`block w-2.5 ${box.h} rounded-[3px] bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-[0_1px_2px_rgba(16,185,129,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] animate-bounce`}
            style={{ animationDelay: box.delay, animationDuration: '0.9s' }}
          />
        ))}
      </div>
      <span className="text-[11px] font-medium tracking-wide text-emerald-700 dark:text-emerald-400">
        {label}
      </span>
    </div>
  );
}
