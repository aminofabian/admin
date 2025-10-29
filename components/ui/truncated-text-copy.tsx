'use client';

import { useState } from 'react';

interface TruncatedTextWithCopyProps {
  text: string;
  maxLength?: number;
  showCopyButton?: boolean;
  className?: string;
}

export function TruncatedTextWithCopy({ 
  text, 
  maxLength = 50, 
  showCopyButton = true,
  className = ''
}: TruncatedTextWithCopyProps) {
  const [copied, setCopied] = useState(false);
  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.substring(0, maxLength)}...` : text;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className={`flex items-center gap-1.5 group min-w-0 ${className}`}>
      <span 
        className="truncate block min-w-0" 
        title={text}
      >
        {displayText}
      </span>
      {showCopyButton && (
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center justify-center"
          title={copied ? 'Copied!' : 'Copy full text'}
          aria-label="Copy to clipboard"
        >
          {copied ? (
            <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

