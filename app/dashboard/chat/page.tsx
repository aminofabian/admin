'use client';

import { Suspense } from 'react';
import { ChatComponent } from '@/components/chat/chat-component';
import { ChatErrorBoundary } from '@/components/chat/components/error-boundary';
import { ChatLoadingBoxes } from '@/components/chat/components/chat-loading-boxes';

/** Mobile: fixed slice between header (~top-16) and bottom nav (pb-20). Desktop: normal flow + height cap. */
export default function ChatPage() {
  return (
    <div
      className={
        'flex min-h-0 w-full flex-col overflow-hidden bg-background ' +
        'max-lg:fixed max-lg:inset-x-0 max-lg:top-16 max-lg:z-10 ' +
        'max-lg:bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] ' +
        'lg:relative lg:inset-auto lg:z-auto lg:h-[calc(100dvh-8rem)] lg:max-h-[calc(100dvh-8rem)]'
      }
    >
      {/*
        Suspense: ChatComponent calls useSearchParams(), which opts this route out
        of server rendering without a boundary. Matches the history pages.
        ErrorBoundary: a render throw in the chat tree would otherwise take down
        the whole route with no recovery.
      */}
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
  );
}
