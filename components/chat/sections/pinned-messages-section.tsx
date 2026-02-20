'use client';

import { memo } from 'react';
import type { ChatMessage } from '@/types';

// Check if a URL points to an image
const HTML_TAG_REGEX = /<\/?[a-z][^>]*>/i;

const hasHtmlContent = (value: string | null | undefined): boolean => {
  if (!value) return false;
  return HTML_TAG_REGEX.test(value);
};

// Convert plain text URLs to clickable links
const linkifyText = (text: string): string => {
  if (!text) return text;
  const urlRegex = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+)/gi;
  return text.replace(urlRegex, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
};

interface PinnedMessagesSectionProps {
  messages: ChatMessage[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onTogglePin?: (messageId: string, isPinned: boolean) => void;
  pendingPinMessageId?: string | null;
}

export const PinnedMessagesSection = memo(function PinnedMessagesSection({
  messages,
  isExpanded,
  onToggleExpanded,
  onTogglePin,
  pendingPinMessageId,
}: PinnedMessagesSectionProps) {
  const pinnedMessages = messages.filter(msg => msg.isPinned);
  
  if (pinnedMessages.length === 0) return null;

  return (
    <div className="relative z-30 border-b border-border/40 bg-amber-500/5 backdrop-blur-sm">
      {/* Collapsible Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-amber-500/10 transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
          </svg>
          <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            PINNED MESSAGES ({pinnedMessages.length})
          </span>
        </div>
          <svg
          className={`h-4 w-4 text-amber-600 dark:text-amber-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-2 space-y-2 max-h-32 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          {pinnedMessages.map((msg) => {
            const isPinning = pendingPinMessageId === msg.id;
            return (
              <div 
                key={msg.id} 
                className="flex items-start gap-2 justify-start"
              >
                <div 
                  className="text-xs rounded-xl p-2.5 max-w-[85%] flex-1 bg-card/95 backdrop-blur-sm border border-border/40 text-foreground shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    {/* Visual indicator bar */}
                    <div 
                      className="w-1 rounded-full shrink-0 bg-amber-500/60"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2 text-foreground">
                        {(() => {
                          const hasHtml = hasHtmlContent(msg.text);
                          const linkedText = hasHtml ? msg.text : linkifyText(msg.text ?? '');
                          const shouldRenderAsHtml = hasHtml || linkedText !== msg.text;
                          
                          return shouldRenderAsHtml ? (
                            <span 
                              className="[&_a]:text-primary [&_a]:underline hover:[&_a]:text-primary/80"
                              dangerouslySetInnerHTML={{ __html: linkedText }} 
                            />
                          ) : (
                            msg.text
                          );
                        })()}
                      </p>
                      <p className="text-[9px] mt-1.5 text-muted-foreground">
                        {msg.time || msg.timestamp}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Unpin Button */}
                {onTogglePin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePin(msg.id, true);
                    }}
                    disabled={isPinning}
                    className={`shrink-0 p-1.5 rounded-md transition-colors hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 ${isPinning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    title="Unpin message"
                    aria-label="Unpin message"
                  >
                    {isPinning ? (
                      <svg className="h-3.5 w-3.5 animate-spin text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
