import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConversationDrafts } from '../use-conversation-drafts';

const file = (name: string) => new File(['x'], name, { type: 'image/png' });

describe('useConversationDrafts', () => {
  let hook: ReturnType<typeof renderHook<ReturnType<typeof useConversationDrafts>, never>>;

  const open = (userId: number | null) =>
    act(() => {
      hook.result.current.openConversation(userId);
    });
  const type = (text: string) =>
    act(() => {
      hook.result.current.setText(text);
    });
  const attach = (f: File, preview = 'data:image/png;base64,AAA') =>
    act(() => {
      hook.result.current.setFile(f, preview);
    });

  beforeEach(() => {
    hook = renderHook(() => useConversationDrafts());
  });

  it('starts empty', () => {
    expect(hook.result.current.text).toBe('');
    expect(hook.result.current.file).toBeNull();
    expect(hook.result.current.previewUrl).toBeNull();
  });

  it('does not leak a draft from one conversation to another', () => {
    // The bug: typing to player A, switching to B, and sending meant A's
    // context went to B.
    open(1);
    type('refund explanation for A');

    open(2);
    expect(hook.result.current.text).toBe('');
  });

  it('restores the draft when returning to a conversation', () => {
    open(1);
    type('half-written refund note');
    open(2);
    type('checking balance');
    open(1);

    expect(hook.result.current.text).toBe('half-written refund note');
  });

  it('keeps drafts isolated across many conversations', () => {
    open(1); type('one');
    open(2); type('two');
    open(3); type('three');

    open(1);
    expect(hook.result.current.text).toBe('one');
    open(3);
    expect(hook.result.current.text).toBe('three');
    open(2);
    expect(hook.result.current.text).toBe('two');
  });

  it('isolates the pending image as well as the text', () => {
    const image = file('a.png');
    open(1);
    attach(image);
    expect(hook.result.current.file).toBe(image);

    open(2);
    expect(hook.result.current.file).toBeNull();
    expect(hook.result.current.previewUrl).toBeNull();

    open(1);
    expect(hook.result.current.file).toBe(image);
    expect(hook.result.current.previewUrl).toBe('data:image/png;base64,AAA');
  });

  it('clears the composer when no conversation is open', () => {
    open(1);
    type('something');
    open(null);
    expect(hook.result.current.text).toBe('');
  });

  it('ignores a re-open of the same conversation', () => {
    open(1);
    type('still typing');
    open(1);
    expect(hook.result.current.text).toBe('still typing');
  });

  it('does not retain a draft the agent cleared before switching away', () => {
    open(1);
    type('temp');
    type(''); // agent clears the composer while still in conversation 1
    open(2);
    open(1);
    expect(hook.result.current.text).toBe('');
  });

  it('still restores a draft left intact in another conversation', () => {
    open(1);
    type('kept');
    open(2);
    type('cleared');
    type('');
    open(3);
    open(1);
    // Clearing conversation 2 must not affect conversation 1's saved draft.
    expect(hook.result.current.text).toBe('kept');
  });

  it('reports which conversation is active', () => {
    open(42);
    expect(hook.result.current.activeUserId).toBe(42);
    open(null);
    expect(hook.result.current.activeUserId).toBeNull();
  });

  it('clearDraft empties only the open conversation', () => {
    open(1);
    type('to be sent');
    act(() => {
      hook.result.current.clearDraft();
    });
    expect(hook.result.current.text).toBe('');

    open(2);
    type('other');
    open(1);
    expect(hook.result.current.text).toBe('');
  });

  it('discardDraft drops a saved draft', () => {
    open(1);
    type('secret note');
    open(2);
    act(() => {
      hook.result.current.discardDraft(1);
    });
    open(1);
    expect(hook.result.current.text).toBe('');
  });
});
