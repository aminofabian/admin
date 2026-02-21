'use client';

import { memo, useState, useCallback } from 'react';
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
  isKycVerificationMessage,
  parseKycMessage,
  formatTransactionMessage,
  parseTransactionMessage,
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
  const isKyc = isKycVerificationMessage(message);
  const isAuto = isAutoMessage(message);
  const isPurchase = isPurchaseNotification(message);

  if (isKyc) {
    return <KycVerificationMessage message={message} />;
  }
  if (isAuto || isPurchase) {
    return (
      <TransactionMessage message={message} isPurchase={isPurchase} />
    );
  }

  return (
    <div
      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'}`}
    >
      <div className={`flex items-end gap-2 max-w-[85%] md:max-w-[75%] min-w-0 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
        {showAvatar ? (
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-md shadow-blue-500/20 ring-2 ring-white/20 dark:ring-white/10">
            {selectedPlayer.avatar || selectedPlayer.username.charAt(0).toUpperCase()}
          </div>
        ) : (
          <div className="w-6 md:w-7 shrink-0" />
        )}

        <div className="relative group flex flex-col min-w-0">
          <div
            className={`rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 transition-all duration-200 ${isAdmin
              ? 'bg-card/95 backdrop-blur-sm border border-border/50 text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)]'
              : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
              } ${isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
              } ${message.isPinned ? 'ring-2 ring-amber-400/50' : ''}`}
          >
            <MessageAttachment
              message={message}
              isAdmin={isAdmin}
              onExpandImage={onExpandImage}
            />

            {message.isComment && (
              <CommentBadge isAdmin={isAdmin} />
            )}

            <MessageText
              message={message}
              isAdmin={isAdmin}
              messageHasHtml={messageHasHtml}
            />
          </div>

          <MessageMeta message={message} isAdmin={isAdmin} />

          {/* Action buttons */}
          <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 ${isAdmin ? '-left-14' : '-right-14'}`}>
            <CopyButton text={message.text} />
            <PinButton
              messageId={message.id}
              isPinned={message.isPinned}
              isPinning={isPinning}
              onTogglePin={onTogglePin}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

function TransactionMessage({ message, isPurchase }: {
  message: ChatMessage;
  isPurchase: boolean;
}) {
  const details = parseTransactionMessage(message.text, message.type, message.operationType);
  const isRecharge = details.type === 'recharge';
  const isRedeem = details.type === 'redeem';
  const isCashout = details.type === 'cashout';

  const formattedMessage = formatTransactionMessage({
    ...message,
    operationType: message.operationType,
  });

  const formattedText = formattedMessage
    .replace(/\n/g, '<br />')
    .replace(/<br\s*\/?>/gi, '<br />');

  const getTransactionBgClass = () => {
    if (details.type === 'recharge' || details.type === 'credit_purchase') {
      return 'bg-green-500/10 border-green-500/30';
    }
    if (details.type === 'cashout' || details.type === 'redeem') {
      return 'bg-red-500/10 border-red-500/30';
    }
    if (details.type) {
      return 'bg-purple-500/10 border-purple-500/30';
    }
    return '';
  };

  return (
    <div className="flex justify-center my-4">
      <div className="max-w-[85%] md:max-w-[75%]">
        <div className={`bg-muted/40 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 shadow-sm ${getTransactionBgClass()}`}>
          <div
            className="text-center text-[13px] md:text-sm leading-relaxed break-words space-y-1 text-foreground [&_b]:not-italic [&_b]:font-bold"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
          {message.time && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className={`text-[10px] md:text-xs font-medium ${isPurchase || isRecharge || isRedeem || isCashout ? 'text-muted-foreground/80' : 'text-muted-foreground/60 italic'}`}>
                {message.time}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KycVerificationMessage({ message }: { message: ChatMessage }) {
  const { link, bodyText } = parseKycMessage(message);

  return (
    <div className="flex justify-center my-4">
      <div className="max-w-[85%] md:max-w-[75%]">
        <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 dark:border-amber-500/40 rounded-xl px-4 py-4 shadow-sm backdrop-blur-sm">
          <p className="text-center text-[13px] md:text-sm font-bold text-amber-800 dark:text-amber-200 mb-1.5">
            Binpay KYC verification
          </p>
          <p className="text-center text-[13px] md:text-sm leading-relaxed break-words text-foreground/90">
            {bodyText || 'Please complete your KYC verification to proceed with your cashout.'}
          </p>
          {link && (
            <div className="flex justify-center mt-4">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-[40px] px-5 py-2.5 rounded-lg font-semibold text-sm bg-primary text-primary-foreground shadow-md hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Verify KYC
              </a>
            </div>
          )}
          {message.time && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80">
                {message.time}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageAttachment({ message, isAdmin, onExpandImage }: {
  message: ChatMessage;
  isAdmin: boolean;
  onExpandImage: (url: string) => void;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrls = extractImageUrls(message.text);
  const fileUrl = message.fileUrl || imageUrls[0];
  const isImage = fileUrl && isImageUrl(fileUrl);

  if (isImage) {
    if (imageError) {
      return (
        <div className="mb-2">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
            <svg className="w-4 h-4 text-muted-foreground/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-muted-foreground/70">Failed to load image</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-2 space-y-2">
        <div
          className="relative rounded-lg overflow-hidden cursor-pointer group/image hover:opacity-90 transition-opacity"
          onClick={() => onExpandImage(fileUrl)}
          title="Click to expand"
        >
          {!imageLoaded && (
            <div className="w-full h-48 rounded-lg bg-muted/40 animate-pulse flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <Image
            src={fileUrl}
            alt="Uploaded image"
            width={800}
            height={600}
            className={`max-w-full h-auto max-h-96 rounded-lg object-contain w-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            loading="lazy"
            unoptimized
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
          {imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity bg-black/20">
              <div className="bg-white/90 dark:bg-gray-900/90 rounded-full p-2">
                <svg className="w-5 h-5 text-gray-900 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.isFile && fileUrl) {
    return (
      <div className={`flex items-center justify-between gap-2 mb-2 pb-2 border-b ${isAdmin ? 'border-border/50' : 'border-white/20'}`}>
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
          className={`text-xs font-medium hover:underline flex items-center gap-1 ${isAdmin ? 'text-primary hover:text-primary/80' : 'text-white hover:text-white/80'}`}
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
    <div className={`flex items-center gap-1.5 mb-2 pb-2 border-b ${isAdmin ? 'border-border/50' : 'border-white/20'}`}>
      <svg className={`w-4 h-4 ${isAdmin ? 'text-amber-500' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
      <span className={`text-[9px] font-semibold uppercase tracking-wide ${isAdmin ? 'text-amber-600 dark:text-amber-400' : 'text-white/90'}`}>
        COMMENT
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
      className={`text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words ${isAdmin ? 'text-foreground' : 'text-white'}`}
    >
      {displayText}
    </p>
  );
}

function MessageMeta({ message, isAdmin }: {
  message: ChatMessage;
  isAdmin: boolean;
}) {
  const senderName = message.sentBy?.username || message.sentBy?.fullName;

  return (
    <div className={`flex items-center gap-1.5 mt-1 px-1 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
      {isAdmin && senderName && (
        <span className="text-[10px] md:text-xs text-primary/70 font-medium capitalize">
          {senderName}
        </span>
      )}
      {isAdmin && senderName && (
        <span className="text-muted-foreground/30">&bull;</span>
      )}
      <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium">
        {message.time || message.timestamp}
      </span>
      {message.isPinned && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
          </svg>
          PINNED
        </span>
      )}
      {isAdmin && (
        <svg
          className={`w-3.5 h-3.5 ${message.isRead
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      const plainText = text
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .trim();
      await navigator.clipboard.writeText(plainText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API may fail in insecure contexts
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="p-1 opacity-0 md:group-hover:opacity-60 hover:!opacity-100 transition-opacity duration-200"
      aria-label="Copy message"
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? (
        <svg className="h-3.5 w-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
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
      className="p-1 opacity-60 md:opacity-0 md:group-hover:opacity-60 hover:!opacity-100 disabled:cursor-not-allowed disabled:opacity-40 transition-opacity duration-200"
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
          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg
          className={`h-3.5 w-3.5 transition-colors ${isPinned
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
