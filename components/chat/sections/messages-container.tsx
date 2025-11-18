'use client';

import { memo } from 'react';
import type { ChatMessage, ChatUser } from '@/types';
import { formatCurrency } from '@/lib/utils/formatters';
import { 
  isImageUrl, 
  extractImageUrls, 
  hasHtmlContent, 
  linkifyText,
  MESSAGE_HTML_CONTENT_CLASS,
  formatMessageDate
} from '../utils/message-helpers';
import { LoadingMoreSkeleton } from '../skeletons';

interface MessagesContainerProps {
  messagesContainerRef: React.RefObject<HTMLDivElement>;
  groupedMessages: Record<string, ChatMessage[]>;
  isHistoryLoadingMessages: boolean;
  selectedPlayer: ChatUser;
  pendingPinMessageId: string | null;
  messageMenuOpen: string | null;
  messageMenuRef: React.RefObject<HTMLDivElement | null>;
  isUserAtLatest: boolean;
  unseenMessageCount: number;
  remoteTyping: boolean;
  setExpandedImage: (url: string | null) => void;
  setMessageMenuOpen: (id: string | null) => void;
  handleTogglePin: (messageId: string, isPinned: boolean) => void;
  scrollToLatest: (behavior?: ScrollBehavior, force?: boolean) => void;
}

export const MessagesContainer = memo(function MessagesContainer({
  messagesContainerRef,
  groupedMessages,
  isHistoryLoadingMessages,
  selectedPlayer,
  pendingPinMessageId,
  messageMenuOpen,
  messageMenuRef,
  isUserAtLatest,
  unseenMessageCount,
  remoteTyping,
  setExpandedImage,
  setMessageMenuOpen,
  handleTogglePin,
  scrollToLatest,
}: MessagesContainerProps) {
  return (
    <div 
      ref={messagesContainerRef}
      className="relative flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 md:px-6 md:py-6 space-y-6 bg-gradient-to-b from-background/50 to-background"
    >
      {/* Top buffer spacer - ensures visible scroll space at top when loading older messages */}
      <div className="h-[500px] shrink-0" aria-hidden="true" />
      
      {/* Loading indicator for message history */}
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
                <span className="px-4 py-1.5 bg-muted/80 backdrop-blur-sm text-xs font-medium text-muted-foreground rounded-full border border-border/50 shadow-sm">
                  {formatMessageDate(date)}
                </span>
              </div>
            </div>
          </div>

          {/* Messages for this date */}
          {dateMessages.map((message, idx) => {
            const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
            const showAvatar = message.sender === 'player' && (
              !prevMessage || prevMessage.sender !== message.sender || 
              (prevMessage.time && message.time && 
               Math.abs(new Date(`2000-01-01 ${prevMessage.time}`).getTime() - 
                        new Date(`2000-01-01 ${message.time || ''}`).getTime()) > 5 * 60 * 1000)
            );
            const isConsecutive = prevMessage && prevMessage.sender === message.sender;
            const isAdmin = message.sender === 'admin';
            const messageHasHtml = hasHtmlContent(message.text);
            const isPinning = pendingPinMessageId === message.id;
            const pinButtonLabel = message.isPinned ? 'Unpin message' : 'Pin message';

            return (
              <div
                key={message.id}
                className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200 ${isConsecutive ? 'mt-1' : 'mt-4'}`}
                style={{ willChange: 'transform, opacity' }}
              >
                <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] min-w-0 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  {showAvatar ? (
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md ring-2 ring-blue-500/20">
                      {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div className="w-7 md:w-8 shrink-0" />
                  )}
                  
                  {/* Message Bubble */}
                  <div className="relative group flex flex-col min-w-0">
                    <div
                      className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 shadow-md transition-all duration-200 ${
                        isAdmin
                          ? 'bg-card border border-border/50 text-foreground shadow-black/5 dark:shadow-black/20'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-500/25'
                      } ${
                        isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
                      } ${message.isPinned ? 'ring-2 ring-amber-400/60' : ''}`}
                    >
                      {/* Image or File indicator badge with download link */}
                      {(() => {
                        const imageUrls = extractImageUrls(message.text);
                        const fileUrl = message.fileUrl || imageUrls[0];
                        const isImage = fileUrl && isImageUrl(fileUrl);
                        
                        if (isImage) {
                          // Display image
                          return (
                            <div className="mb-2 space-y-2">
                              <div 
                                className="relative rounded-lg overflow-hidden cursor-pointer group/image hover:opacity-90 transition-opacity"
                                onClick={() => setExpandedImage(fileUrl)}
                                title="Click to expand"
                              >
                                <img 
                                  src={fileUrl} 
                                  alt="Uploaded image"
                                  className="max-w-full h-auto max-h-96 rounded-lg object-contain w-full"
                                  loading="lazy"
                                  decoding="async"
                                  onError={(e) => {
                                    // Fallback if image fails to load
                                    e.currentTarget.style.display = 'none';
                                    const parent = e.currentTarget.parentElement;
                                    if (parent) {
                                      parent.innerHTML = `<div class="flex items-center gap-2 p-2 rounded-md bg-muted/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span class="text-xs">Failed to load image</span></div>`;
                                    }
                                  }}
                                />
                                {/* Expand icon overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/20">
                                  <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-2">
                                    <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                                    </svg>
                                  </div>
                                </div>
                              </div>
                              {/* Subtle action buttons below image */}
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-opacity hover:opacity-70 ${
                                    isAdmin 
                                      ? 'text-muted-foreground' 
                                      : 'text-white/50'
                                  }`}
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                  Open
                                </a>
                                <span className={isAdmin ? 'text-muted-foreground/30' : 'text-white/20'}>•</span>
                                <a
                                  href={fileUrl}
                                  download
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-opacity hover:opacity-70 ${
                                    isAdmin 
                                      ? 'text-muted-foreground' 
                                      : 'text-white/50'
                                  }`}
                                >
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                  Download
                                </a>
                              </div>
                            </div>
                          );
                        } else if (message.isFile && fileUrl) {
                          // Display file attachment badge
                          return (
                            <div className={`flex items-center justify-between gap-2 mb-2 pb-2 border-b ${
                              isAdmin ? 'border-border/50' : 'border-white/20'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <svg className={`w-4 h-4 ${isAdmin ? 'text-primary' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                                <span className={`text-xs font-medium ${isAdmin ? 'text-muted-foreground' : 'text-white/90'}`}>
                                  File attachment{message.fileExtension && ` (.${message.fileExtension})`}
                                </span>
                              </div>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs font-medium hover:underline flex items-center gap-1 ${
                                  isAdmin ? 'text-primary hover:text-primary/80' : 'text-white hover:text-white/80'
                                }`}
                              >
                                Download
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </a>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Comment badge */}
                      {message.isComment && (
                        <div className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${
                          isAdmin ? 'border-border/50' : 'border-white/20'
                        }`}>
                          <svg className={`w-4 h-4 ${isAdmin ? 'text-amber-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                          </svg>
                          <span className={`text-xs font-medium ${isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-white/90'}`}>
                            Comment
                          </span>
                        </div>
                      )}
                      
                      {(() => {
                        const imageUrls = extractImageUrls(message.text);
                        const fileUrl = message.fileUrl || imageUrls[0];
                        const hasRenderedImage = fileUrl && isImageUrl(fileUrl);
                        const hasImages = imageUrls.length > 0;
                        
                        // If an image is being rendered above, hide the text completely
                        if (hasRenderedImage) {
                          return null;
                        }
                        
                        // Remove all image URLs from text for display
                        let displayText = message.text;
                        if (hasImages) {
                          imageUrls.forEach(url => {
                            displayText = displayText.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
                          });
                          displayText = displayText.trim();
                        }
                        
                        // Don't show text if there's no text left after removing URLs
                        if (!displayText && hasImages) {
                          return null;
                        }
                        
                        // Convert plain text URLs to links
                        const linkedText = messageHasHtml ? displayText : linkifyText(displayText ?? '');
                        const shouldRenderAsHtml = messageHasHtml || linkedText !== displayText;
                        
                        return shouldRenderAsHtml ? (
                          <div
                            className={MESSAGE_HTML_CONTENT_CLASS[isAdmin ? 'admin' : 'player']}
                            dangerouslySetInnerHTML={{ __html: linkedText ?? '' }}
                          />
                        ) : (
                          <p
                            className={`text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words ${
                              isAdmin ? 'text-foreground' : 'text-white'
                            }`}
                          >
                            {displayText}
                          </p>
                        );
                      })()}
                      
                      {/* User balance indicator (only for player messages) */}
                      {!isAdmin && message.userBalance !== undefined && (
                        <div className="mt-2 pt-2 border-t border-white/20">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-xs text-white/90 font-medium">
                              Balance: {formatCurrency(parseFloat(message.userBalance))}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Message Meta */}
                    <div className={`flex items-center gap-1.5 mt-1 px-1 ${
                      isAdmin ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                        {message.time || message.timestamp}
                      </span>
                      {message.isPinned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
                          </svg>
                          Pinned
                        </span>
                      )}
                      {isAdmin && (
                        <svg 
                          className={`w-3.5 h-3.5 ${
                            message.isRead 
                              ? 'text-blue-500 dark:text-blue-400' 
                              : 'text-muted-foreground/50'
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L8 8.586l3.293-3.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Options Button (Desktop) */}
                    {isAdmin && (
                      <button
                        onClick={() => setMessageMenuOpen(messageMenuOpen === message.id ? null : message.id)}
                        className="hidden md:flex absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-muted rounded-lg"
                        aria-label="Message options"
                      >
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Pin menu */}
                    {isAdmin && messageMenuOpen === message.id && (
                      <div
                        ref={messageMenuRef}
                        className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur"
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePin(message.id, Boolean(message.isPinned))}
                          disabled={isPinning}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isPinning ? (
                            <svg
                              className="h-4 w-4 animate-spin text-primary"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                d="M4 12a8 8 0 018-8"
                                strokeWidth="4"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
                            </svg>
                          )}
                          <span>{pinButtonLabel}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
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
      
      {/* Typing Indicator */}
      {remoteTyping && (
        <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200 mt-4" style={{ willChange: 'transform, opacity' }}>
          <div className="flex items-center gap-2">
            <div className="w-7 md:w-8 shrink-0" />
            <div className="flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-2xl rounded-bl-sm px-4 py-3 shadow-md border border-border/50">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
