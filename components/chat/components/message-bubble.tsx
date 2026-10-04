'use client';

import { memo, useState, useCallback, useEffect, type ReactNode } from 'react';
import Image from 'next/image';
import type { ChatMessage } from '@/types';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui';
import {
  isImageUrl,
  extractImageUrls,
  hasHtmlContent,
  linkifyText,
  MESSAGE_HTML_CONTENT_CLASS,
  parseKycMessage,
  formatTransactionMessage,
  getTransactionCardClass,
  prepareChatMessageHtmlForDisplay,
  transactionTypeToVisualKind,
  type BinpayVerificationKind,
} from '../utils/message-helpers';
import {
  classifyMessage,
  getTransactionDetails,
} from '../utils/message-classification';
import {
  composeEditedMessageText,
  splitEditableMessageText,
} from '@/lib/chat/apply-chat-message-event';
import { sanitizeChatHtml } from '@/lib/chat/sanitize-chat-html';
import { PlayerAvatar } from './player-avatar';
import { toR2ImageUrl } from '@/lib/utils/media-url';

async function copyMessageText(text: string): Promise<boolean> {
  try {
    const plainText = text
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
    await navigator.clipboard.writeText(plainText);
    return true;
  } catch {
    // Clipboard API may fail in insecure contexts
    return false;
  }
}

interface MessageBubbleProps {
  message: ChatMessage;
  /**
   * Avatar fields only, rather than the whole `ChatUser`.
   *
   * `selectedPlayer` is replaced on every `balanceUpdated` event, so passing the
   * object made this memoised component re-render for every bubble in the
   * transcript on each balance tick. The bubble only ever needed these two.
   */
  avatarUrl?: string | null;
  playerUsername: string;
  isAdmin: boolean;
  showAvatar: boolean;
  isConsecutive: boolean;
  isPinning: boolean;
  onExpandImage: (url: string) => void;
  onTogglePin: (messageId: string, isPinned: boolean) => void;
  /** Resolves true once the server confirms the edit. */
  onEditMessage?: (messageId: string, text: string, isComment: boolean) => Promise<boolean>;
  /** Resolves true once the server confirms the delete. */
  onDeleteMessage?: (messageId: string, isComment: boolean) => Promise<boolean>;
}

type ModerationState = 'idle' | 'editing' | 'saving' | 'confirmingDelete' | 'deleting';

export const MessageBubble = memo(function MessageBubble({
  message,
  avatarUrl,
  playerUsername,
  isAdmin,
  showAvatar,
  isConsecutive,
  isPinning,
  onExpandImage,
  onTogglePin,
  onEditMessage,
  onDeleteMessage,
}: MessageBubbleProps) {
  const [moderation, setModeration] = useState<ModerationState>('idle');
  const [draft, setDraft] = useState('');
  const isSaved = !message.id.startsWith('temp-');
  const canEdit = isSaved && Boolean(onEditMessage);
  const canDelete = isSaved && Boolean(onDeleteMessage);
  const isBusy = moderation === 'saving' || moderation === 'deleting';
  const isEditing = moderation === 'editing' || moderation === 'saving';
  const isDissipating = Boolean(message.isDissipating);

  const startEditing = () => {
    setDraft(splitEditableMessageText(message.text).caption);
    setModeration('editing');
  };

  const cancelModeration = () => {
    if (!isBusy) setModeration('idle');
  };

  const saveEdit = async () => {
    if (!onEditMessage || moderation !== 'editing') return;
    const { caption, imageUrls } = splitEditableMessageText(message.text);
    const nextCaption = draft.trim();
    if (nextCaption === caption) {
      setModeration('idle');
      return;
    }
    const nextText = composeEditedMessageText(nextCaption, imageUrls);
    if (!nextText) return;
    setModeration('saving');
    const saved = await onEditMessage(message.id, nextText, Boolean(message.isComment));
    setModeration(saved ? 'idle' : 'editing');
  };

  const confirmDelete = async () => {
    if (!onDeleteMessage || moderation !== 'confirmingDelete') return;
    setModeration('deleting');
    const removed = await onDeleteMessage(message.id, Boolean(message.isComment));
    if (!removed) setModeration('idle');
  };

  const messageHasHtml = hasHtmlContent(message.text);
  // Memoised per message object: the parent list already classified this same
  // object to decide on the avatar, so this is a cache hit rather than a second
  // full pass of the four classifiers.
  const { isKyc, isAuto, isPurchase, isPrizeWheel } = classifyMessage(message);

  if (isKyc) {
    return <KycVerificationMessage message={message} />;
  }
  if (isAuto || isPurchase || isPrizeWheel) {
    return (
      <TransactionMessage message={message} isPurchase={isPurchase} />
    );
  }

  return (
    <div
      className={`flex w-full min-w-0 ${isAdmin ? 'justify-end' : 'justify-start'} ${isConsecutive ? 'mt-1' : 'mt-4'} ${isDissipating ? 'chat-message-dissipate' : ''}`}
      aria-hidden={isDissipating || undefined}
    >
      <div
        className={`relative flex min-w-0 max-w-[85%] items-end gap-2 md:max-w-[75%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {showAvatar ? (
          <PlayerAvatar
            avatarUrl={avatarUrl}
            username={playerUsername}
            size={28}
            className="md:h-7 md:w-7"
          />
        ) : (
          <div className="w-6 md:w-7 shrink-0" />
        )}

        <div className={`group relative flex min-w-0 flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
          {!isDissipating && !isEditing && moderation === 'idle' && (
            <>
              {/* Mobile: compact overflow menu so icons don't cover the bubble */}
              <div
                className={`absolute -top-3 z-10 md:hidden ${isAdmin ? 'right-1' : 'left-1'}`}
              >
                <MessageActionsMenu
                  text={message.text}
                  messageId={message.id}
                  isPinned={message.isPinned}
                  isPinning={isPinning}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  align={isAdmin ? 'right' : 'left'}
                  onTogglePin={onTogglePin}
                  onEdit={startEditing}
                  onDelete={() => setModeration('confirmingDelete')}
                />
              </div>

              {/* Desktop: full action strip on hover */}
              <div
                className={`pointer-events-none absolute -top-3 z-10 hidden items-center gap-0.5 rounded-full border border-border/40 bg-card/90 px-1 py-0.5 opacity-0 shadow-sm backdrop-blur-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 md:pointer-events-auto md:flex ${isAdmin ? 'right-1' : 'left-1'}`}
              >
                <div className="pointer-events-auto flex items-center gap-0.5">
                  <CopyButton text={message.text} />
                  <PinButton
                    messageId={message.id}
                    isPinned={message.isPinned}
                    isPinning={isPinning}
                    onTogglePin={onTogglePin}
                  />
                  {canEdit && <EditButton onEdit={startEditing} />}
                  {canDelete && (
                    <DeleteButton onDelete={() => setModeration('confirmingDelete')} />
                  )}
                </div>
              </div>
            </>
          )}

          <div
            className={`relative min-w-0 max-w-full overflow-hidden rounded-2xl px-3.5 md:px-4 py-2.5 md:py-3 transition-[box-shadow,ring] duration-200 ${isAdmin
              ? 'bg-card/95 backdrop-blur-sm border border-border/50 text-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.3)]'
              : 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/20'
              } ${isAdmin ? 'rounded-br-sm' : 'rounded-bl-sm'
              } ${message.isPinned ? 'ring-2 ring-amber-400/50' : ''
              } ${isEditing ? 'w-[min(420px,100%)] ring-2 ring-primary/25' : ''
              } ${moderation === 'confirmingDelete' ? 'ring-1 ring-red-400/35' : ''}`}
            aria-busy={isBusy}
          >
            {isDissipating && <span className="chat-message-dissipate-mist" aria-hidden />}

            <MessageAttachment
              message={message}
              isAdmin={isAdmin}
              onExpandImage={onExpandImage}
            />

            {message.isComment && (
              <CommentBadge isAdmin={isAdmin} />
            )}

            {isEditing ? (
              <EditMessageForm
                draft={draft}
                isSaving={moderation === 'saving'}
                onChange={setDraft}
                onSave={saveEdit}
                onCancel={cancelModeration}
              />
            ) : (
              <MessageText
                message={message}
                isAdmin={isAdmin}
                messageHasHtml={messageHasHtml}
              />
            )}
          </div>

          {moderation === 'confirmingDelete' && !isDissipating && (
            <DeleteConfirmation
              isAdmin={isAdmin}
              isDeleting={false}
              onConfirm={confirmDelete}
              onCancel={cancelModeration}
            />
          )}

          {moderation === 'deleting' && !isDissipating && (
            <div
              className={`mt-1.5 flex items-center gap-1.5 rounded-full border border-border/40 bg-card/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur-md ${isAdmin ? 'self-end' : 'self-start'}`}
            >
              <Spinner />
              Removing…
            </div>
          )}

          {!isDissipating && (
            <MessageMeta message={message} isAdmin={isAdmin} />
          )}
        </div>
      </div>
    </div>
  );
});

function TransactionMessage({ message, isPurchase }: {
  message: ChatMessage;
  isPurchase: boolean;
}) {
  // Parsed once and handed to `formatTransactionMessage`, which used to parse
  // the same text a second time internally.
  const details = getTransactionDetails(message);
  const isRecharge = details.type === 'recharge';
  const isRedeem = details.type === 'redeem';
  const isCashout = details.type === 'cashout';
  const isPrizeWheel = details.type === 'prize_wheel';

  const formattedMessage = formatTransactionMessage(
    {
      ...message,
      operationType: message.operationType,
    },
    details,
  );

  const formattedText = formattedMessage
    .replace(/\n/g, '<br />')
    .replace(/<br\s*\/?>/gi, '<br />');

  const getTransactionBgClass = () => {
    if (!details.type) return '';
    return getTransactionCardClass(transactionTypeToVisualKind(details.type));
  };

  return (
    <div className="flex w-full min-w-0 justify-center my-4">
      <div className="min-w-0 w-full max-w-[85%] md:max-w-[75%]">
        <div className={`bg-muted/40 backdrop-blur-sm border border-border/40 rounded-xl px-4 py-3 shadow-sm ${getTransactionBgClass()}`}>
          <div
            className="text-center text-[13px] md:text-sm leading-relaxed break-words [overflow-wrap:anywhere] space-y-1 text-foreground [&_b]:not-italic [&_b]:font-bold"
            dangerouslySetInnerHTML={{ __html: sanitizeChatHtml(formattedText) }}
          />
          {message.time && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className={`text-[10px] md:text-xs font-medium ${isPurchase || isRecharge || isRedeem || isCashout || isPrizeWheel ? 'text-muted-foreground/80' : 'text-muted-foreground/60 italic'}`}>
                {message.time}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Normalize KYC prompt copy: "Complete your KYC to proceed with your [Purchase|Cashout]." (action bolded)
function formatKycBodyWithBoldAction(text: string): ReactNode {
  const lower = (text || '').toLowerCase();
  const isPurchase = /purchase|deposit|recharge|buy|top.?up/i.test(lower);
  const action = isPurchase ? 'Purchase' : 'Cashout';
  return (
    <>
      Complete your KYC to proceed with your <b>{action}</b>.
    </>
  );
}

function binpayCardClass(kind: BinpayVerificationKind): string {
  switch (kind) {
    case 'approved':
      return 'border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-500/35 dark:bg-emerald-500/15';
    case 'rejected':
      return 'border-red-500/30 bg-red-500/10 dark:border-red-500/35 dark:bg-red-500/15';
    case 'pending':
      return 'border-amber-500/30 bg-amber-500/10 dark:border-amber-500/35 dark:bg-amber-500/15';
    default:
      return 'border-[#F0E6D7] bg-[#fbf2e3] dark:border-gray-700 dark:bg-gray-800/95';
  }
}

function binpayTitleClass(kind: BinpayVerificationKind): string {
  switch (kind) {
    case 'approved':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'rejected':
      return 'text-red-700 dark:text-red-400';
    case 'pending':
      return 'text-amber-700 dark:text-amber-400';
    default:
      return 'text-[#B3672C] dark:text-amber-400';
  }
}

function BinpayShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function KycVerificationMessage({ message }: { message: ChatMessage }) {
  const { link, bodyText, kind } = parseKycMessage(message);
  const isPrompt = kind === 'prompt';
  const showVerifyButton = Boolean(link && isPrompt);

  return (
    <div className="flex w-full min-w-0 justify-center my-4">
      <div className="min-w-0 w-full max-w-[85%] md:max-w-[75%]">
        <div
          className={`rounded-xl border px-4 py-3 shadow-sm backdrop-blur-sm dark:shadow-[0_2px_12px_-2px_rgba(0,0,0,0.4)] ${binpayCardClass(kind)}`}
        >
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span
              className={`flex items-center justify-center w-7 h-7 rounded-lg border ${
                kind === 'approved'
                  ? 'bg-emerald-500/15 border-emerald-500/30'
                  : kind === 'rejected'
                    ? 'bg-red-500/15 border-red-500/30'
                    : 'bg-amber-500/15 border-amber-500/30'
              }`}
            >
              <BinpayShieldIcon className={`w-3.5 h-3.5 ${binpayTitleClass(kind)}`} />
            </span>
            <p className={`text-center font-bold text-[13px] md:text-sm ${binpayTitleClass(kind)}`}>
              Identity Verification
            </p>
          </div>
          <p
            className={`text-center leading-relaxed break-words [overflow-wrap:anywhere] text-[13px] md:text-sm text-foreground [&_b]:font-bold [&_b]:text-foreground dark:text-gray-200 [&_b]:dark:text-gray-100 ${
              showVerifyButton ? 'mb-3' : 'mb-1'
            }`}
          >
            {isPrompt ? formatKycBodyWithBoldAction(bodyText) : bodyText}
          </p>
          {showVerifyButton && link && (
            <div className="flex justify-center mb-2">
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 min-h-9 px-4 py-2 rounded-xl font-semibold text-white hover:opacity-95 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:focus-visible:ring-offset-gray-900 transition-opacity text-[13px] md:text-sm bg-[#6E5DEB] shadow-[0_2px_8px_rgba(110,93,235,0.35)] hover:bg-[#5d4ed6] dark:bg-violet-600 dark:shadow-[0_2px_8px_rgba(139,92,246,0.4)] dark:hover:bg-violet-500"
              >
                <span className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                Verify KYC
              </a>
            </div>
          )}
          {message.time && (
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <span className="text-[10px] md:text-xs font-medium text-muted-foreground/80 dark:text-gray-400">
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

  const imageUrls = message.renderAsText ? [] : extractImageUrls(message.text);
  const originalUrl = message.fileUrl || imageUrls[0] || '';
  const preferredUrl = toR2ImageUrl(originalUrl);
  const [displayUrl, setDisplayUrl] = useState(preferredUrl);

  useEffect(() => {
    setDisplayUrl(preferredUrl);
    setImageLoaded(false);
    setImageError(false);
  }, [preferredUrl]);

  const isImage = Boolean(displayUrl) && isImageUrl(displayUrl);

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
          onClick={() => onExpandImage(displayUrl)}
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
            key={displayUrl}
            src={displayUrl}
            alt="Uploaded image"
            width={800}
            height={600}
            className={`max-w-full h-auto max-h-96 rounded-lg object-contain w-full transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            loading="lazy"
            unoptimized
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              // R2 rewrite can 404 for assets still only on Cloudinary.
              if (displayUrl !== originalUrl && originalUrl) {
                setDisplayUrl(originalUrl);
                setImageLoaded(false);
                return;
              }
              setImageError(true);
            }}
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
  if (message.renderAsText) {
    if (!message.text.trim()) return null;
    return (
      <p
        className={`min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isAdmin ? 'text-foreground' : 'text-white'}`}
      >
        {message.text}
      </p>
    );
  }

  const imageUrls = extractImageUrls(message.text);
  const hasImages = imageUrls.length > 0;

  let displayText = prepareChatMessageHtmlForDisplay(message.text);
  if (hasImages) {
    imageUrls.forEach(url => {
      displayText = displayText.replace(new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '');
    });
    displayText = displayText.trim();
  }

  if (!displayText) return null;

  const linkedText = messageHasHtml ? displayText : linkifyText(displayText ?? '');
  const shouldRenderAsHtml = messageHasHtml || linkedText !== displayText;

  return shouldRenderAsHtml ? (
    <div
      className={MESSAGE_HTML_CONTENT_CLASS[isAdmin ? 'admin' : 'player']}
      // Player-authored text reaches this sink — sanitise before injecting.
      dangerouslySetInnerHTML={{ __html: sanitizeChatHtml(linkedText) }}
    />
  ) : (
    <p
      className={`min-w-0 max-w-full text-[13px] md:text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isAdmin ? 'text-foreground' : 'text-white'}`}
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
      {message.renderAsText && (
        <span className="text-[9px] md:text-[10px] italic text-muted-foreground/80">
          Edited
        </span>
      )}
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

function MessageActionsMenu({
  text,
  messageId,
  isPinned,
  isPinning,
  canEdit,
  canDelete,
  align,
  onTogglePin,
  onEdit,
  onDelete,
}: {
  text: string;
  messageId: string;
  isPinned?: boolean;
  isPinning: boolean;
  canEdit: boolean;
  canDelete: boolean;
  align: 'left' | 'right';
  onTogglePin: (messageId: string, isPinned: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu
      align={align}
      trigger={
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border/40 bg-card/95 text-muted-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Message actions"
          title="Message actions"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </button>
      }
    >
      <DropdownMenuItem
        onClick={() => {
          void copyMessageText(text);
        }}
        className="flex items-center gap-2"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Copy
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => onTogglePin(messageId, Boolean(isPinned))}
        disabled={isPinning}
        className="flex items-center gap-2"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
        </svg>
        {isPinned ? 'Unpin' : 'Pin'}
      </DropdownMenuItem>
      {canEdit && (
        <DropdownMenuItem onClick={onEdit} className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit
        </DropdownMenuItem>
      )}
      {canDelete && (
        <DropdownMenuItem
          onClick={onDelete}
          className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const ok = await copyMessageText(text);
    if (!ok) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Copy message"
      title={copied ? 'Copied!' : 'Copy message'}
    >
      {copied ? (
        <svg className="h-3 w-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </button>
  );
}

function EditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Edit message"
      title="Edit message"
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-red-500/10 hover:text-red-500"
      aria-label="Delete message"
      title="Delete message"
    >
      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

function Spinner() {
  return (
    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function DeleteConfirmation({
  isAdmin,
  isDeleting,
  onConfirm,
  onCancel,
}: {
  isAdmin: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label="Delete this message?"
      className={`mt-1.5 flex animate-in fade-in zoom-in-95 duration-150 items-center gap-2 rounded-full border border-border/50 bg-card/95 px-2 py-1 shadow-sm backdrop-blur-md ${isAdmin ? 'self-end' : 'self-start'}`}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      <span className="pl-1 text-[11px] font-medium text-muted-foreground">
        Delete?
      </span>
      <button
        type="button"
        autoFocus
        onClick={onConfirm}
        disabled={isDeleting}
        className="rounded-full bg-red-500 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
      >
        Yes
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isDeleting}
        className="rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        No
      </button>
    </div>
  );
}

function EditMessageForm({
  draft,
  isSaving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: string;
  isSaving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <textarea
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          } else if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSave();
          }
        }}
        onFocus={(event) => {
          const end = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(end, end);
        }}
        autoFocus
        readOnly={isSaving}
        rows={Math.min(6, Math.max(2, draft.split('\n').length))}
        className="w-full resize-none rounded-xl border border-border/60 bg-white px-3 py-2 text-[13px] md:text-sm leading-relaxed text-slate-900 outline-none transition [color-scheme:light] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:[color-scheme:dark] dark:[-webkit-text-fill-color:#f8fafc] dark:placeholder:text-slate-500"
        aria-label="Edit message"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground/80">
          Enter · Esc
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !draft.trim()}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
          >
            {isSaving && <Spinner />}
            {isSaving ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>
    </form>
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
      type="button"
      onClick={() => onTogglePin(messageId, Boolean(isPinned))}
      disabled={isPinning}
      className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      aria-label={isPinned ? 'Unpin message' : 'Pin message'}
      title={isPinned ? 'Unpin message' : 'Pin message'}
    >
      {isPinning ? (
        <svg
          className="h-3 w-3 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
          <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
        </svg>
      ) : (
        <svg
          className={`h-3 w-3 transition-colors ${isPinned
            ? 'text-amber-500'
            : ''
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
