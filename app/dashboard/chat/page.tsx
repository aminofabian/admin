'use client';

import { ChatComponent } from '@/components/chat/chat-component';

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
      <ChatComponent />
    </div>
  );
}
