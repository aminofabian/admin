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

      {/* Drawer: h-dvh avoids mobile 100vh clipping; inner respects safe area */}
      <div
        className="fixed right-0 top-0 z-50 flex h-dvh max-h-dvh w-full flex-col bg-background shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 ease-out sm:w-[90vw] md:w-[92vw] lg:w-[87vw] xl:max-w-7xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="chat-drawer-title"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
          <ChatComponent />
        </div>
      </div>
    </>
  );
}

