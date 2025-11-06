'use client';

import { useEffect } from 'react';
import { useChatDrawer } from '@/contexts/chat-drawer-context';
import { ChatComponent } from './chat-component';

export function ChatDrawer() {
  const { isOpen, closeDrawer } = useChatDrawer();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeDrawer();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDrawer]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur - Modern depth effect */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ease-out"
        onClick={closeDrawer}
        aria-hidden="true"
      />

      {/* Drawer - Slides from right (standard admin pattern) */}
      <div 
        className="fixed inset-y-0 right-0 w-full sm:w-[90vw] md:w-[85vw] lg:w-[75vw] xl:max-w-6xl z-50 bg-background shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-drawer-title"
      >
        {/* Header with gradient accent */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h2 id="chat-drawer-title" className="text-lg md:text-xl font-bold text-foreground">
                Support Chat
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                Manage player conversations
              </p>
            </div>
          </div>
          <button
            onClick={closeDrawer}
            className="p-2 hover:bg-muted rounded-lg transition-all duration-200 hover:scale-110 active:scale-95"
            aria-label="Close chat"
          >
            <svg className="w-5 h-5 md:w-6 md:h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100vh-5rem)] md:h-[calc(100vh-6rem)] overflow-hidden">
          <ChatComponent />
        </div>
      </div>
    </>
  );
}

