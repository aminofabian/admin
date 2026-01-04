'use client';

import React, { memo } from 'react';
import Image from 'next/image';
import type { ChatMessage, ChatUser } from '@/types';
import {
  isImageUrl,
  extractImageUrls,
  hasHtmlContent,
  linkifyText,
  MESSAGE_HTML_CONTENT_CLASS,
  isAutoMessage,
  isPurchaseNotification,
  formatTransactionMessage,
} from '../utils/message-helpers';

interface MessageBubbleProps {
  message: ChatMessage;
  selectedPlayer: ChatUser;
  isAdmin: boolean;
  showAvatar: boolean;
  isConsecutive: boolean;
  isPinning: boolean;
  onExpandImage: (url: string) => void;
  onTogglePin: (messageId: string, isPinned: boolean) => void;
}

/**
 * MessageBubble - Renders a single message with all its features
 * Memoized for performance optimization
 */
export const MessageBubble = memo(function MessageBubble({
  message,
  selectedPlayer,
  isAdmin,
  showAvatar,
  isConsecutive,
  isPinning,
  onExpandImage,
  onTogglePin,
}: MessageBubbleProps) {
  const messageHasHtml = hasHtmlContent(message.text);
  const isAuto = isAutoMessage(message);
  const isPurchase = isPurchaseNotification(message);

  // Render purchase notifications and auto messages in a centered, neutral style
  if (isAuto || isPurchase) {
    // Format transaction messages according to the specified format
    // Pass operationType if available (workaround for backend bug)
    const formattedMessage = formatTransactionMessage({
      ...message,
      operationType: message.operationType,
    });
    
    // Convert line breaks to <br> tags for HTML rendering
    const formattedText = formattedMessage
      .replace(/\n/g, '<br />')
      .replace(/<br\s*\/?>/gi, '<br />');

    return (
      <div className="flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200 my-4">
        <div className="max-w-[85%] md:max-w-[75%]">
          <div className={`bg-muted/50 border border-border/30 rounded-lg px-4 py-3 shadow-sm ${
            isPurchase ? 'bg-blue-500/10 border-blue-500/30' : ''
          }`}>
            <div 
              className={`text-center text-[13px] md:text-sm leading-relaxed break-words space-y-1 ${
                isPurchase 
                  ? 'text-foreground [&_b]:not-italic [&_b]:font-semibold' 
                  : 'text-muted-foreground italic [&_b]:not-italic [&_b]:font-semibold'
              }`}
              dangerouslySetInnerHTML={{ __html: formattedText }}
            />
            
            {message.time && (
              <div className="flex items-center justify-center gap-1.5 mt-2.5 pt-2 border-t border-border/30">
                <span className={`text-[10px] md:text-xs font-medium ${
                  isPurchase ? 'text-muted-foreground' : 'text-muted-foreground/70 italic'
                }`}>
                  {message.time}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
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
            {/* Image or File */}
            <MessageAttachment
              message={message}
              isAdmin={isAdmin}
              onExpandImage={onExpandImage}
            />
            
            {/* Comment badge */}
            {message.isComment && (
              <CommentBadge isAdmin={isAdmin} />
            )}
            
            {/* Message Text */}
            <MessageText
              message={message}
              isAdmin={isAdmin}
              messageHasHtml={messageHasHtml}
            />
          </div>
          
          {/* Message Meta */}
          <MessageMeta
            message={message}
            isAdmin={isAdmin}
          />
          
          {/* Pin Button */}
          <PinButton
            messageId={message.id}
            isPinned={message.isPinned}
            isPinning={isPinning}
            onTogglePin={onTogglePin}
          />
        </div>
      </div>
    </div>
  );
});

// Sub-components for better organization
function MessageAttachment({ message, isAdmin, onExpandImage }: {
  message: ChatMessage;
  isAdmin: boolean;
  onExpandImage: (url: string) => void;
}) {
  const imageUrls = extractImageUrls(message.text);
  const fileUrl = message.fileUrl || imageUrls[0];
  const isImage = fileUrl && isImageUrl(fileUrl);

  if (isImage) {
    return (
      <div className="mb-2 space-y-2">
        <div 
          className="relative rounded-lg overflow-hidden cursor-pointer group/image hover:opacity-90 transition-opacity"
          onClick={() => onExpandImage(fileUrl)}
          title="Click to expand"
        >
          <Image 
            src={fileUrl} 
            alt="Uploaded image"
            width={800}
            height={600}
            className="max-w-full h-auto max-h-96 rounded-lg object-contain w-full"
            loading="lazy"
            unoptimized
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="flex items-center gap-2 p-2 rounded-md bg-muted/20"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span class="text-xs">Failed to load image</span></div>`;
              }
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/20">
            <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-2">
              <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-opacity hover:opacity-70 ${
              isAdmin ? 'text-muted-foreground' : 'text-white/50'
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
              isAdmin ? 'text-muted-foreground' : 'text-white/50'
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
  }

  if (message.isFile && fileUrl) {
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
}

function CommentBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
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
  );
}

function MessageText({ message, isAdmin, messageHasHtml }: {
  message: ChatMessage;
  isAdmin: boolean;
  messageHasHtml: boolean;
}) {
  const imageUrls = extractImageUrls(message.text);
  const fileUrl = message.fileUrl || imageUrls[0];
  const hasRenderedImage = fileUrl && isImageUrl(fileUrl);
  const hasImages = imageUrls.length > 0;

  if (hasRenderedImage) return null;

  let displayText = message.text;
  if (hasImages) {
    imageUrls.forEach(url => {
      displayText = displayText.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    });
    displayText = displayText.trim();
  }

  if (!displayText && hasImages) return null;

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
}

function MessageMeta({ message, isAdmin }: {
  message: ChatMessage;
  isAdmin: boolean;
}) {
  return (
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
  );
}

function PinButton({ messageId, isPinned, isPinning, onTogglePin }: {
  messageId: string;
  isPinned?: boolean;
  isPinning: boolean;
  onTogglePin: (messageId: string, isPinned: boolean) => void;
}) {
  return (
    <button
      onClick={() => onTogglePin(messageId, Boolean(isPinned))}
      disabled={isPinning}
      className="absolute -right-6 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-60 hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40 transition-opacity duration-200"
      aria-label={isPinned ? 'Unpin message' : 'Pin message'}
      title={isPinned ? 'Unpin message' : 'Pin message'}
    >
      {isPinning ? (
        <svg
          className="h-3.5 w-3.5 animate-spin text-muted-foreground/70"
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
        <svg 
          className={`h-3.5 w-3.5 transition-colors ${
            isPinned 
              ? 'text-amber-500/70 dark:text-amber-400/70 hover:text-amber-600 dark:hover:text-amber-400' 
              : 'text-muted-foreground/50 hover:text-muted-foreground'
          }`} 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
        </svg>
      )}
    </button>
  );
}

