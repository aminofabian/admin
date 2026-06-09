import { describe, expect, it } from 'vitest';
import {
  buildGameActivityNotificationToast,
  isGameActivityNotificationMessage,
} from '../game-activity-notification';

describe('game-activity-notification', () => {
  it('detects game activity send_notification messages', () => {
    expect(
      isGameActivityNotificationMessage({
        type: 'send_notification',
        activity_type: 'game_activity',
      }),
    ).toBe(true);
  });

  it('ignores non-game-activity notifications', () => {
    expect(
      isGameActivityNotificationMessage({
        type: 'send_notification',
        activity_type: 'purchase',
      }),
    ).toBe(false);
  });

  it('builds an error toast for failed game activities', () => {
    const toast = buildGameActivityNotificationToast({
      type: 'send_notification',
      activity_type: 'game_activity',
      message: 'Create Game failed for bivera',
      game_activities_data: {
        id: '26A5BA705298',
        type: 'create_game',
        status: 'failed',
        user_username: 'bivera',
      },
    });

    expect(toast).toEqual({
      dedupeKey: '26A5BA705298-failed',
      type: 'error',
      title: 'Game Activity Failed',
      description: 'Create Game failed for bivera',
      duration: 6000,
    });
  });

  it('builds a success toast for processed game activities', () => {
    const toast = buildGameActivityNotificationToast({
      type: 'send_notification',
      activity_type: 'game_activity',
      message: 'Create Game processed for bivera',
      game_activities_data: {
        id: '26A5BA705298',
        status: 'processed',
      },
    });

    expect(toast).toEqual({
      dedupeKey: '26A5BA705298-processed',
      type: 'success',
      title: 'Game Activity Processed',
      description: 'Create Game processed for bivera',
      duration: 5000,
    });
  });

  it('ignores pending game activity notifications', () => {
    const toast = buildGameActivityNotificationToast({
      type: 'send_notification',
      activity_type: 'game_activity',
      message: 'Create Game pending for bivera',
      game_activities_data: {
        id: '26A5BA705298',
        status: 'pending',
      },
    });

    expect(toast).toBeNull();
  });
});
