'use client';

import { memo } from 'react';
import type { ChatMessage, ChatUser } from '@/types';
import { formatMessageDate, isAutoMessage, isPurchaseNotification, isKycVerificationMessage } from '../utils/message-helpers';
import { MessageBubble } from '../components/message-bubble';
import { LoadingMoreSkeleton } from '../skeletons';

interface MessagesContainerProps {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  groupedMessages: Record<string, ChatMessage[]>;
  isHistoryLoadingMessages: boolean;
  selectedPlayer: ChatUser;
  pendingPinMessageId: string | null;
  isUserAtLatest: boolean;
  unseenMessageCount: number;
  remoteTyping: boolean;
  setExpandedImage: (url: string | null) => void;
  handleTogglePin: (messageId: string, isPinned: boolean) => void;
  scrollToLatest: (behavior?: ScrollBehavior, force?: boolean) => void;
}

export const MessagesContainer = memo(function MessagesContainer({
  messagesContainerRef,
  groupedMessages,
  isHistoryLoadingMessages,
  selectedPlayer,
  pendingPinMessageId,
  isUserAtLatest,
  unseenMessageCount,
  remoteTyping,
  setExpandedImage,
  handleTogglePin,
  scrollToLatest,
}: MessagesContainerProps) {
  return (
    <div 
      ref={messagesContainerRef}
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
      className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6 space-y-6 bg-gradient-to-b from-background/50 to-background"
    >
      {/* Top buffer spacer */}
      <div className="h-[500px] shrink-0" aria-hidden="true" />
      
      {isHistoryLoadingMessages && <LoadingMoreSkeleton />}
      
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-3">
          {/* Date Separator */}
          <div className="flex items-center justify-center my-8 first:mt-0">
            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 py-1 bg-muted/80 backdrop-blur-sm text-[8px] font-medium text-muted-foreground rounded-full border border-border/50 shadow-sm uppercase">
                  {formatMessageDate(date)}
                </span>
              </div>
            </div>
          </div>

          {dateMessages.map((message, idx) => {
            const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
            const isAuto = isAutoMessage(message);
            const isPurchase = isPurchaseNotification(message);
            const isKyc = isKycVerificationMessage(message);
            const isSystemMessage = isAuto || isPurchase || isKyc;
            const showAvatar = !isSystemMessage && message.sender === 'player' && (
              !prevMessage || prevMessage.sender !== message.sender || 
              (prevMessage.time && message.time && 
               Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() - 
                        new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
            );
            const isConsecutive = !isSystemMessage && prevMessage && !isAutoMessage(prevMessage) && !isPurchaseNotification(prevMessage) && !isKycVerificationMessage(prevMessage) && prevMessage.sender === message.sender;
            const isAdmin = !isSystemMessage && message.sender === 'admin';
            const isPinning = pendingPinMessageId === message.id;

            return (
              <div
                key={message.id}
                data-message-id={message.id}
              >
                <MessageBubble
                  message={message}
                  selectedPlayer={selectedPlayer}
                  isAdmin={isAdmin}
                  showAvatar={Boolean(showAvatar)}
                  isConsecutive={Boolean(isConsecutive)}
                  isPinning={isPinning}
                  onExpandImage={setExpandedImage}
                  onTogglePin={handleTogglePin}
                />
              </div>
            );
          })}
        </div>
      ))}

      {/* Jump to Latest Button */}
      {!isUserAtLatest && (
        <div className="pointer-events-none sticky bottom-12 sm:bottom-16 z-20 flex justify-end pr-0">
          <div className="pointer-events-auto -mr-3 sm:-mr-8">
            <button
              type="button"
              onClick={() => scrollToLatest('smooth', true)}
              aria-label="Jump to latest messages"
              className="group relative flex w-12 flex-col items-center gap-3 rounded-full border border-border/40 bg-background/95 px-0 py-5 text-primary shadow-xl backdrop-blur-md transition-transform duration-200 hover:-translate-x-0.5 hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <span className="absolute right-full mr-3 hidden translate-x-2 items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg opacity-0 transition-all duration-200 group-hover:flex group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:flex group-focus-visible:translate-x-0 group-focus-visible:opacity-100">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                Jump to latest
                {unseenMessageCount > 0 && (
                  <span className="rounded-full bg-primary-foreground/10 px-2 py-0.5 text-[0.65rem] font-semibold text-primary-foreground">
                    {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
                  </span>
                )}
              </span>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              {unseenMessageCount > 0 && (
                <span className="flex flex-col items-center gap-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-primary">
                  <span className="rounded-full bg-primary text-primary-foreground px-2 py-1">
                    {unseenMessageCount > 9 ? '9+' : unseenMessageCount}
                  </span>
                  <span className="text-[0.55rem] tracking-[0.4em] text-primary/80">
                    behind
                  </span>
                </span>
              )}
              <span className="font-semibold uppercase tracking-[0.35em] text-[0.68rem] text-primary">
                ↓
              </span>
            </button>
          </div>
        </div>
      )}
      
      {remoteTyping && (
        <div className="flex justify-start mt-2">
          <div className="flex items-center gap-2">
            <div className="w-6 md:w-7 shrink-0" />
            <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-border/50">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-primary rounded-full typing-indicator-smooth" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full typing-indicator-smooth" />
                <div className="w-1.5 h-1.5 bg-primary rounded-full typing-indicator-smooth" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
