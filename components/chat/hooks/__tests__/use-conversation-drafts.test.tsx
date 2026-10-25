import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useConversationDrafts } from '../use-conversation-drafts';

describe('useConversationDrafts', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps drafts per conversation', () => {
    const { result } = renderHook(() => useConversationDrafts(1));

    act(() => result.current.openConversation(67));
    act(() => result.current.setText('hello'));
    act(() => result.current.openConversation(68));
    expect(result.current.text).toBe('');

    act(() => result.current.openConversation(67));
    expect(result.current.text).toBe('hello');
  });

  it('restores a text draft after a remount (page refresh)', () => {
    const first = renderHook(() => useConversationDrafts(1));
    act(() => first.result.current.openConversation(67));
    act(() => first.result.current.setText('half a refund reply'));
    first.unmount();

    const second = renderHook(() => useConversationDrafts(1));
    act(() => second.result.current.openConversation(67));
    expect(second.result.current.text).toBe('half a refund reply');
  });

  it('removes the stored draft when the composer is cleared', () => {
    const { result } = renderHook(() => useConversationDrafts(1));
    act(() => result.current.openConversation(67));
    act(() => result.current.setText('draft'));
    act(() => result.current.clearDraft());

    expect(sessionStorage.getItem('chat-draft:1:67')).toBeNull();
  });

  it('does not share drafts between admin namespaces', () => {
    const adminA = renderHook(() => useConversationDrafts(1));
    act(() => adminA.result.current.openConversation(67));
    act(() => adminA.result.current.setText('admin A note'));

    const adminB = renderHook(() => useConversationDrafts(2));
    act(() => adminB.result.current.openConversation(67));
    expect(adminB.result.current.text).toBe('');
  });
});
