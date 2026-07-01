import { describe, expect, it } from 'vitest';
import { resolveSafeChatroomId } from '../safe-chatroom-id';

describe('resolveSafeChatroomId', () => {
  it('returns chatroom id when it differs from user id', () => {
    expect(resolveSafeChatroomId('3603', 3648)).toBe('3603');
  });

  it('returns null when chat id equals player user id', () => {
    expect(resolveSafeChatroomId('3648', 3648)).toBeNull();
    expect(resolveSafeChatroomId(3648, 3648)).toBeNull();
  });

  it('returns null for empty values', () => {
    expect(resolveSafeChatroomId('', 3648)).toBeNull();
    expect(resolveSafeChatroomId(null, 3648)).toBeNull();
  });
});
