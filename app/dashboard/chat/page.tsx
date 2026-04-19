'use client';

import { ChatComponent } from '@/components/chat/chat-component';

export default function ChatPage() {
  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-0 max-h-[calc(100dvh-8rem)] flex-col overflow-x-hidden">
      <ChatComponent />
    </div>
  );
}
