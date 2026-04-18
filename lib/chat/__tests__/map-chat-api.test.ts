import { describe, expect, it } from 'vitest';
import {
  mergeWinningBalanceFromPartialPayload,
  normalizeWinningBalanceFromRealtime,
  payloadIncludesWinningBalanceFields,
  transformChatToUser,
  transformPlayerToUser,
} from '../map-chat-api';

describe('map-chat-api', () => {
  describe('transformChatToUser', () => {
    it('should map flat REST chats[] row (player_id, player_username, last_message_timestamp)', () => {
      const row: Record<string, unknown> = {
        id: 81,
        name: 'P93Chat',
        player_id: 93,
        player_username: 'bitslotbeta',
        last_message: 'Welcome to Beta Bitslot!',
        last_message_sender: 92,
        last_message_timestamp: '2026-04-01T16:55:25.690042+00:00',
        unread_messages_count: 0,
      };

      const u = transformChatToUser(row);

      expect(u.id).toBe('81');
      expect(u.user_id).toBe(93);
      expect(u.username).toBe('bitslotbeta');
      expect(u.lastMessage).toBe('Welcome to Beta Bitslot!');
      expect(u.lastMessageTime).toBe('2026-04-01T16:55:25.690042+00:00');
      expect(u.unreadCount).toBe(0);
    });

    it('should map flat cashout_limit / locked_balance on chat row (no nested player)', () => {
      const row: Record<string, unknown> = {
        id: 81,
        player_id: 93,
        player_username: 'bitslotbeta',
        balance: '100.00',
        cashout_limit: '50.00',
        locked_balance: '10.00',
      };

      const u = transformChatToUser(row);

      expect(u.cashoutLimit).toBe('50.00');
      expect(u.lockedBalance).toBe('10.00');
      expect(u.balance).toBe('100.00');
    });
  });

  describe('transformPlayerToUser', () => {
    it('should map player[] row from admin chat list including last_seen_at', () => {
      const row: Record<string, unknown> = {
        id: 93,
        username: 'bitslotbeta',
        chatroom_id: 81,
        last_message: 'Welcome to Beta Bitslot!',
        last_message_timestamp: '2026-04-01T16:55:25.690042+00:00',
        last_seen_at: '2026-04-03T14:41:10.956951+00:00',
        unread_messages_count: 0,
      };

      const u = transformPlayerToUser(row);

      expect(u.id).toBe('81');
      expect(u.user_id).toBe(93);
      expect(u.username).toBe('bitslotbeta');
      expect(u.playerLastSeenAt).toBe('2026-04-03T14:41:10.956951+00:00');
      expect('winningBalance' in u).toBe(false);
    });

    it('should include winningBalance only when winning_balance is present on API row', () => {
      const withWin: Record<string, unknown> = {
        id: 1,
        username: 'a',
        chatroom_id: 1,
        balance: '10.00',
        winning_balance: '9.50',
      };
      expect(transformPlayerToUser(withWin).winningBalance).toBe('9.50');

      const noWin: Record<string, unknown> = {
        id: 1,
        username: 'a',
        chatroom_id: 1,
        balance: '300.00',
        cashout_limit: '50.00',
        locked_balance: '250.00',
      };
      const u = transformPlayerToUser(noWin);
      expect('winningBalance' in u).toBe(false);
    });

    it('should omit winningBalance when winning_balance is zero', () => {
      const u = transformPlayerToUser({
        id: 1,
        username: 'a',
        chatroom_id: 1,
        balance: '35.00',
        winning_balance: '0.00',
      });
      expect('winningBalance' in u).toBe(false);
    });
  });

  describe('mergeWinningBalanceFromPartialPayload', () => {
    it('should clear when no winning keys (balance-only WS update)', () => {
      expect(
        mergeWinningBalanceFromPartialPayload({ balance: '100', type: 'update_chat' }, undefined, '9'),
      ).toBeUndefined();
    });

    it('should apply non-zero when key present on payload', () => {
      expect(
        mergeWinningBalanceFromPartialPayload({ winning_balance: '12.50' }, undefined, undefined),
      ).toBe('12.50');
    });

    it('should read nested player', () => {
      expect(
        mergeWinningBalanceFromPartialPayload(
          {},
          { player_winning_bal: '3' } as Record<string, unknown>,
          undefined,
        ),
      ).toBe('3');
    });
  });

  describe('payloadIncludesWinningBalanceFields', () => {
    it('should detect keys on payload or nested player', () => {
      expect(payloadIncludesWinningBalanceFields({ balance: '1' })).toBe(false);
      expect(payloadIncludesWinningBalanceFields({ player_winning_bal: 0 })).toBe(true);
      expect(payloadIncludesWinningBalanceFields({}, { winning_balance: '1' })).toBe(true);
    });
  });

  describe('normalizeWinningBalanceFromRealtime', () => {
    it('should preserve previous when raw is missing', () => {
      expect(normalizeWinningBalanceFromRealtime(undefined, '12')).toBe('12');
    });

    it('should clear when raw is zero', () => {
      expect(normalizeWinningBalanceFromRealtime(0, '12')).toBeUndefined();
      expect(normalizeWinningBalanceFromRealtime('0.00', '12')).toBeUndefined();
    });

    it('should return trimmed string when raw is non-zero', () => {
      expect(normalizeWinningBalanceFromRealtime('9.5', undefined)).toBe('9.5');
    });
  });
});
