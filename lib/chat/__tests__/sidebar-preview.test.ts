import { describe, expect, it } from 'vitest';
import {
  conversationRoomKey,
  previewRoomForSocket,
  sidebarPreviewBelongsToSelection,
} from '../sidebar-preview';

describe('sidebar preview ownership', () => {
  it('rejects the previous room while the new conversation is selected', () => {
    const previous = conversationRoomKey(67, '57');
    expect(
      sidebarPreviewBelongsToSelection({
        selectedUserId: 68,
        selectedChatId: '58',
        messagesRoomKey: previous,
        hasCompletedInitialHistory: true,
        messageCount: 4,
      }),
    ).toBe(false);
  });

  it('rejects history that has not finished loading for this room', () => {
    expect(
      sidebarPreviewBelongsToSelection({
        selectedUserId: 68,
        selectedChatId: '58',
        messagesRoomKey: null,
        hasCompletedInitialHistory: true,
        messageCount: 4,
      }),
    ).toBe(false);
  });

  it('accepts history that was loaded for the selected conversation', () => {
    expect(
      sidebarPreviewBelongsToSelection({
        selectedUserId: 68,
        selectedChatId: '58',
        messagesRoomKey: conversationRoomKey(68, '58'),
        hasCompletedInitialHistory: true,
        messageCount: 2,
      }),
    ).toBe(true);
  });

  it('keeps a late socket event on the room that socket was opened for', () => {
    expect(
      previewRoomForSocket({
        socketUserId: 67,
        currentUserId: 68,
        currentChatId: '58',
      }),
    ).toEqual({ userId: 67, chatId: '' });
  });

  it('keeps the chat id when the socket still matches the open conversation', () => {
    expect(
      previewRoomForSocket({
        socketUserId: 68,
        currentUserId: 68,
        currentChatId: '58',
      }),
    ).toEqual({ userId: 68, chatId: '58' });
  });
});
