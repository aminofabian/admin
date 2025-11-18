import { Skeleton, SkeletonAvatar } from '@/components/ui';
import { memo } from 'react';

/**
 * Skeleton for player list item
 * Displays during initial load of chat users
 */
export const PlayerListItemSkeleton = memo(() => (
  <div className="flex items-center gap-3 p-3 rounded-lg bg-card">
    <div className="relative">
      <SkeletonAvatar size="default" />
      <Skeleton variant="circular" className="absolute bottom-0 right-0 h-3 w-3" />
    </div>
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
));

PlayerListItemSkeleton.displayName = 'PlayerListItemSkeleton';

/**
 * Skeleton for multiple player list items
 * Used when loading the entire player list
 */
export const PlayerListSkeleton = memo(({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <PlayerListItemSkeleton key={i} />
    ))}
  </div>
));

PlayerListSkeleton.displayName = 'PlayerListSkeleton';

/**
 * Skeleton for chat message bubble
 * Used when loading message history
 */
export const MessageSkeleton = memo(({ isAdmin = false }: { isAdmin?: boolean }) => (
  <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-4`}>
    <div className={`flex items-end gap-2 max-w-[85%] ${isAdmin ? 'flex-row-reverse' : ''}`}>
      {!isAdmin && <SkeletonAvatar size="sm" />}
      <div className="space-y-2">
        <Skeleton className={`h-16 ${isAdmin ? 'w-48' : 'w-56'} rounded-2xl`} />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </div>
));

MessageSkeleton.displayName = 'MessageSkeleton';

/**
 * Skeleton for multiple messages
 * Used when loading chat history
 */
export const MessageListSkeleton = memo(({ count = 10 }: { count?: number }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <MessageSkeleton key={i} isAdmin={i % 3 === 0} />
    ))}
  </div>
));

MessageListSkeleton.displayName = 'MessageListSkeleton';

/**
 * Skeleton for player info sidebar
 * Used when loading player details
 */
export const PlayerInfoSkeleton = memo(() => (
  <div className="p-6 space-y-6">
    {/* Avatar and basic info */}
    <div className="flex flex-col items-center text-center space-y-3">
      <SkeletonAvatar size="lg" className="h-20 w-20" />
      <div className="space-y-2 w-full">
        <Skeleton className="h-5 w-32 mx-auto" />
        <Skeleton className="h-4 w-24 mx-auto" />
      </div>
    </div>

    {/* Balance cards */}
    <div className="grid grid-cols-2 gap-3">
      <Skeleton className="h-20 rounded-lg" />
      <Skeleton className="h-20 rounded-lg" />
    </div>

    {/* Action buttons */}
    <div className="space-y-2">
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-10 w-full rounded-lg" />
    </div>

    {/* Games section */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-20" />
      <div className="space-y-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    </div>

    {/* Notes section */}
    <div className="space-y-3">
      <Skeleton className="h-5 w-16" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  </div>
));

PlayerInfoSkeleton.displayName = 'PlayerInfoSkeleton';

/**
 * Skeleton for chat header
 * Used during initial player selection
 */
export const ChatHeaderSkeleton = memo(() => (
  <div className="flex items-center justify-between p-4 border-b bg-card">
    <div className="flex items-center gap-3">
      <SkeletonAvatar size="default" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="h-9 w-9 rounded-lg" />
    </div>
  </div>
));

ChatHeaderSkeleton.displayName = 'ChatHeaderSkeleton';

/**
 * Skeleton for empty state
 * Used while determining if there are any players
 */
export const EmptyStateSkeleton = memo(() => (
  <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
    <Skeleton variant="circular" className="h-24 w-24" />
    <div className="space-y-2 text-center">
      <Skeleton className="h-6 w-48 mx-auto" />
      <Skeleton className="h-4 w-64 mx-auto" />
    </div>
  </div>
));

EmptyStateSkeleton.displayName = 'EmptyStateSkeleton';

/**
 * Compact skeleton for "loading more messages" indicator
 * Shows at the top of message list when loading history
 */
export const LoadingMoreSkeleton = memo(() => (
  <div className="flex justify-center py-4">
    <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
      <Skeleton variant="circular" className="h-4 w-4" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
));

LoadingMoreSkeleton.displayName = 'LoadingMoreSkeleton';

