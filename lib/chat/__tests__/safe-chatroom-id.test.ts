import { describe, expect, it } from 'vitest';
import { pickChatroomIdFromRow, resolveSafeChatroomId } from '../safe-chatroom-id';

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

describe('pickChatroomIdFromRow', () => {
  it('returns chatroom_id when present and distinct from user id', () => {
    expect(pickChatroomIdFromRow({ chatroom_id: 3603 }, 3648)).toBe('3603');
  });

  it('does not fall back to row.id (player id)', () => {
    expect(pickChatroomIdFromRow({ id: 3648 }, 3648)).toBe('');
    expect(pickChatroomIdFromRow({ id: 3648, username: 'MattyG2108' }, 3648)).toBe('');
  });

  it('rejects chatroom id that collides with user id', () => {
    expect(pickChatroomIdFromRow({ chatroom_id: 3648 }, 3648)).toBe('');
  });
});
