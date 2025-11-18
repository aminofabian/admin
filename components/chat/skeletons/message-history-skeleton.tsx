import { Skeleton } from '@/components/ui';
import { memo } from 'react';

/**
 * Skeleton loader for message history loading state
 * Displays when loading older messages in the chat
 */
export const MessageHistorySkeleton = memo(() => (
  <div className="space-y-4 py-3">
    {/* User message skeleton (right side) */}
    {/* <div className="flex items-start justify-end gap-3">
      <div className="flex flex-col items-end max-w-[70%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
      <Skeleton variant="circular" className="h-8 w-8" />
    </div> */}

    {/* Admin message skeleton (left side) */}
    <div className="flex items-start gap-3">
      <Skeleton variant="circular" className="h-8 w-8" />
      <div className="flex flex-col max-w-[70%]">
        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 space-y-2">
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
    </div>

    {/* Another user message skeleton */}
    <div className="flex items-start justify-end gap-3">
      <div className="flex flex-col items-end max-w-[70%]">
        <div className="rounded-2xl rounded-tr-sm bg-primary/10 px-4 py-2.5">
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-3 w-16 mt-1" />
      </div>
      <Skeleton variant="circular" className="h-8 w-8" />
    </div>
  </div>
));

MessageHistorySkeleton.displayName = 'MessageHistorySkeleton';

