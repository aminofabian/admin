import React from 'react';

interface LoadingBarProps {
  progress?: number; // 0-100
  indeterminate?: boolean;
  className?: string;
}

export function LoadingBar({ progress, indeterminate = false, className = '' }: LoadingBarProps) {
  return (
    <div className={`w-full h-1 bg-muted overflow-hidden ${className}`}>
      <div
        className={`h-full bg-primary transition-all duration-300 ease-out ${
          indeterminate ? 'animate-[loading_1.5s_ease-in-out_infinite]' : ''
        }`}
        style={{
          width: indeterminate ? '30%' : `${progress}%`,
          transform: indeterminate ? 'translateX(0)' : undefined,
        }}
      />
      
      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(350%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}

// Skeleton loader for messages
export function MessageSkeleton({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <div className={`flex items-start gap-3 ${isAdmin ? '' : 'justify-end'} animate-pulse`}>
      {!isAdmin && <div className="w-8 h-8 rounded-full bg-muted" />}
      <div className="flex flex-col max-w-[70%]">
        <div className="rounded-2xl bg-muted px-4 py-2.5 space-y-2">
          <div className="h-4 bg-muted-foreground/20 rounded w-48" />
          <div className="h-4 bg-muted-foreground/20 rounded w-32" />
        </div>
        <div className="h-3 w-16 mt-1 bg-muted-foreground/20 rounded" />
      </div>
      {isAdmin && <div className="w-8 h-8 rounded-full bg-muted" />}
    </div>
  );
}

// Typing indicator animation
export function TypingIndicator() {
  return (
    <div className="flex gap-1.5">
      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
    </div>
  );
}
