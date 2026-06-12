export function isManualQueueRequest(remarks?: string | null): boolean {
  return /queued|manual handling|manual mode/i.test(remarks ?? '');
}

export function getQueueDisplayStatus(
  status: string,
  remarks?: string | null,
): string {
  const normalized = status.toLowerCase();
  if (normalized === 'pending' && isManualQueueRequest(remarks)) {
    return 'processing';
  }
  return normalized;
}

export function getQueueStatusBadgeClassName(displayStatus: string): string {
  switch (displayStatus.toLowerCase()) {
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'pending':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'processing':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

export function getQueueStatusBadgeVariant(
  displayStatus: string,
): 'success' | 'warning' | 'danger' | 'info' {
  switch (displayStatus.toLowerCase()) {
    case 'completed':
    case 'complete':
      return 'success';
    case 'pending':
      return 'warning';
    case 'processing':
      return 'info';
    case 'failed':
    case 'cancelled':
    case 'canceled':
      return 'danger';
    default:
      return 'info';
  }
}
