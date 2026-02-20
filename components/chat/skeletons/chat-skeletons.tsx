import { Skeleton } from '@/components/ui';
import { memo } from 'react';

export const PlayerListItemSkeleton = memo(() => (
  <div className="flex items-center gap-1.5 p-1.5 rounded-md">
    <div className="relative">
      <Skeleton variant="circular" className="h-6 w-6" />
      <Skeleton variant="circular" className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5" />
    </div>
    <div className="flex-1 min-w-0 space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-8" />
      </div>
      <Skeleton className="h-2.5 w-full" />
    </div>
  </div>
));

PlayerListItemSkeleton.displayName = 'PlayerListItemSkeleton';

export const PlayerListSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: count }).map((_, i) => (
      <PlayerListItemSkeleton key={i} />
    ))}
  </div>
));

PlayerListSkeleton.displayName = 'PlayerListSkeleton';

export const MessageSkeleton = memo(({ isAdmin = false }: { isAdmin?: boolean }) => (
  <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-3`}>
    <div className={`flex items-end gap-2 max-w-[85%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
      {!isAdmin && <Skeleton variant="circular" className="h-6 w-6 shrink-0" />}
      <div className="space-y-1.5">
        <Skeleton className={`h-12 ${isAdmin ? 'w-44' : 'w-52'} rounded-2xl`} />
        <Skeleton className="h-2.5 w-14" />
      </div>
    </div>
  </div>
));

MessageSkeleton.displayName = 'MessageSkeleton';

export const MessageListSkeleton = memo(({ count = 10 }: { count?: number }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} isAdmin={i % 3 === 0} />
    ))}
  </div>
));

MessageListSkeleton.displayName = 'MessageListSkeleton';

export const PlayerInfoSkeleton = memo(() => (
  <div className="p-4 space-y-4">
    <div className="flex flex-col items-center text-center space-y-2">
      <Skeleton variant="circular" className="h-16 w-16" />
      <div className="space-y-1.5 w-full">
        <Skeleton className="h-4 w-28 mx-auto" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <Skeleton className="h-16 rounded-md" />
      <Skeleton className="h-16 rounded-md" />
    </div>

    <div className="space-y-1.5">
      <Skeleton className="h-8 w-full rounded-md" />
      <Skeleton className="h-8 w-full rounded-md" />
      <Skeleton className="h-8 w-full rounded-md" />
    </div>

    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <div className="space-y-1.5">
        <Skeleton className="h-7 rounded-md" />
        <Skeleton className="h-7 rounded-md" />
        <Skeleton className="h-7 rounded-md" />
      </div>
    </div>

    <div className="space-y-2">
      <Skeleton className="h-4 w-14" />
      <Skeleton className="h-20 rounded-md" />
    </div>
  </div>
));

PlayerInfoSkeleton.displayName = 'PlayerInfoSkeleton';

export const ChatHeaderSkeleton = memo(() => (
  <div className="flex items-center justify-between px-3 py-2 border-b bg-card/80">
    <div className="flex items-center gap-2">
      <Skeleton variant="circular" className="h-7 w-7" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-18" />
      </div>
    </div>
    <div className="flex items-center gap-1">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
  </div>
));

ChatHeaderSkeleton.displayName = 'ChatHeaderSkeleton';

export const EmptyStateSkeleton = memo(() => (
  <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
    <Skeleton variant="circular" className="h-20 w-20" />
    <div className="space-y-2 text-center">
      <Skeleton className="h-5 w-44 mx-auto" />
      <Skeleton className="h-3.5 w-56 mx-auto" />
    </div>
  </div>
));

EmptyStateSkeleton.displayName = 'EmptyStateSkeleton';

export const LoadingMoreSkeleton = memo(() => (
  <div className="flex justify-center py-3">
    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 rounded-full">
      <Skeleton variant="circular" className="h-3.5 w-3.5" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  </div>
));

LoadingMoreSkeleton.displayName = 'LoadingMoreSkeleton';
