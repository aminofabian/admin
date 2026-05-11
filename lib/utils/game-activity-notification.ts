export type GameActivityNotificationToastType = 'success' | 'error' | 'warning' | 'info';

export interface GameActivityNotificationToast {
  dedupeKey: string;
  type: GameActivityNotificationToastType;
  title: string;
  description?: string;
  duration: number;
}

const TERMINAL_STATUS_TOAST: Record<string, GameActivityNotificationToastType> = {
  failed: 'error',
  cancelled: 'error',
  canceled: 'error',
  completed: 'success',
  complete: 'success',
  processed: 'success',
  success: 'success',
};

const TERMINAL_STATUS_TITLE: Record<string, string> = {
  failed: 'Game Activity Failed',
  cancelled: 'Game Activity Cancelled',
  canceled: 'Game Activity Cancelled',
  completed: 'Game Activity Processed',
  complete: 'Game Activity Processed',
  processed: 'Game Activity Processed',
  success: 'Game Activity Processed',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizeActivityType(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
}

function normalizeStatus(value: unknown): string {
  return String(value ?? '').toLowerCase().trim();
}

function extractGameActivityData(message: Record<string, unknown>): Record<string, unknown> | null {
  const gameActivitiesData = message.game_activities_data;

  if (isRecord(gameActivitiesData)) {
    return gameActivitiesData;
  }

  if (Array.isArray(gameActivitiesData) && gameActivitiesData.length > 0 && isRecord(gameActivitiesData[0])) {
    return gameActivitiesData[0];
  }

  if (isRecord(message.data)) {
    return message.data;
  }

  return null;
}

type GameActivityNotificationMessage = Record<string, unknown> & {
  type: 'send_notification';
};

export function isGameActivityNotificationMessage(
  message: unknown,
): message is GameActivityNotificationMessage {
  if (!isRecord(message)) {
    return false;
  }

  if (message.type !== 'send_notification') {
    return false;
  }

  const activityType = normalizeActivityType(message.activity_type);
  return activityType === 'game_activity' || activityType === 'gameactivity';
}

export function buildGameActivityNotificationToast(message: unknown): GameActivityNotificationToast | null {
  if (!isGameActivityNotificationMessage(message)) {
    return null;
  }

  const activityData = extractGameActivityData(message);
  const status = normalizeStatus(activityData?.status);
  const toastType = TERMINAL_STATUS_TOAST[status];

  if (!toastType) {
    return null;
  }

  const activityId = String(activityData?.id ?? activityData?.transaction_id ?? '').trim();
  const dedupeKey = activityId ? `${activityId}-${status}` : `${status}-${String(message.message ?? '').trim()}`;

  const title = TERMINAL_STATUS_TITLE[status] ?? 'Game Activity Update';
  const description = typeof message.message === 'string' && message.message.trim()
    ? message.message.trim()
    : undefined;

  return {
    dedupeKey,
    type: toastType,
    title,
    description,
    duration: toastType === 'error' ? 6000 : 5000,
  };
}
