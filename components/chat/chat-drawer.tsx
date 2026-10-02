'use client';

import { Suspense } from 'react';
import { useChatDrawer } from '@/contexts/chat-drawer-context';
import { ChatComponent } from './chat-component';
import { ChatErrorBoundary } from './components/error-boundary';
import { ChatLoadingBoxes } from './components/chat-loading-boxes';
import { Overlay } from './components/overlay';

export function ChatDrawer() {
  const { isOpen, closeDrawer } = useChatDrawer();

  if (!isOpen) return null;

  return (
    <Overlay
      onClose={closeDrawer}
      label="Chat"
      closeOnBackdrop
      className="justify-end bg-black/60 backdrop-blur-sm p-0"
      panelClassName="flex h-dvh max-h-dvh w-full flex-col bg-background shadow-[0_0_50px_rgba(0,0,0,0.3)] animate-in slide-in-from-right duration-300 ease-out sm:w-[90vw] md:w-[92vw] lg:w-[87vw] xl:max-w-7xl"
    >
      {/* h-dvh avoids mobile 100vh clipping; inner respects safe area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
        {/* Suspense + error boundary mirror the /dashboard/chat route: see
            app/dashboard/chat/page.tsx for why both are required. */}
        <ChatErrorBoundary>
          <Suspense
            fallback={
              <div className="flex min-h-0 flex-1 items-center justify-center p-6">
                <ChatLoadingBoxes />
              </div>
            }
          >
            <ChatComponent />
          </Suspense>
        </ChatErrorBoundary>
      </div>
    </Overlay>
  );
}
