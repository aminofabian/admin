'use client';

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
}

export function PinnedMessagesSection({
  messages,
  isExpanded,
  onToggleExpanded,
}: PinnedMessagesSectionProps) {
  const pinnedMessages = messages.filter(msg => msg.isPinned);
  
  if (pinnedMessages.length === 0) return null;

  return (
    <div className="border-b border-border/50 bg-amber-500/5">
      {/* Collapsible Header */}
      <button
        onClick={onToggleExpanded}
        className="w-full px-4 py-2 flex items-center justify-between gap-2 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path d="M8.5 2a1.5 1.5 0 0 1 3 0v1.382a3 3 0 0 0 1.076 2.308l.12.1a2 2 0 0 1 .68 1.5V8a2 2 0 0 1-2 2h-.25L11 13.75a1.25 1.25 0 0 1-2.5 0L8.874 10H8.625a2 2 0 0 1-2-2v-.71a2 2 0 0 1 .68-1.5l.12-.1A3 3 0 0 0 8.5 3.382V2Z" />
          </svg>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
            Pinned Messages ({pinnedMessages.length})
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
          {pinnedMessages.map((msg) => (
            <div key={msg.id} className="text-xs bg-background/50 rounded-lg p-2 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground line-clamp-2">
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
                  <p className="text-muted-foreground text-[10px] mt-1">
                    {msg.time || msg.timestamp}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
