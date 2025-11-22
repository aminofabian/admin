/**
 * Utility function to merge class names
 * Simple implementation without external dependencies
 */
export function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return inputs
    .filter(Boolean)
    .join(' ')
    .trim();
}

export const formatCurrency = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numAmount);
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString || dateString.trim() === '') {
    return 'N/A';
  }

  if (dateString === 'null' || dateString === 'undefined' || dateString === 'Invalid Date') {
    return 'N/A';
  }

  let date: Date;
  
  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = dateString.match(ddmmyyyyPattern);
  
  if (match) {
    const [, day, month, year, hour, minute, second] = match;
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  } else if (dateString.includes('T')) {
    date = new Date(dateString);
  } else if (dateString.includes('-')) {
    date = new Date(dateString + 'T00:00:00Z');
  } else if (dateString.includes('/')) {
    date = new Date(dateString);
  } else {
    const timestamp = parseInt(dateString);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
  }
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'N/A';
  }

  try {
    const formatted = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }).format(date);
    
    if (!formatted || formatted === 'Invalid Date') {
      throw new Error('Intl.DateTimeFormat returned invalid result');
    }
    
    return formatted;
  } catch (error) {
    console.warn('Intl.DateTimeFormat failed, using fallback:', error);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getUTCFullYear();
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate();
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
    return `${month} ${day}, ${year}, ${hours}:${minutes}`;
  }
};

export const formatPercentage = (value: string | number): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return `${numValue.toFixed(2)}%`;
};

/**
 * Formats a timestamp to a human-readable relative format for chat messages
 * Examples:
 * - "Just now" for messages less than 1 minute old
 * - "2m ago" for messages less than an hour old
 * - "3h ago" for messages less than 24 hours old
 * - "2 days ago" for messages less than a week old
 * - "3 weeks ago" for messages less than a month old
 * - "2 months ago" for messages less than a year old
 * - "1 year ago" for older messages
 */
/**
 * Validate if a timestamp value is valid and meaningful
 * Used to prevent invalid timestamps from overwriting valid ones
 */
export const isValidTimestamp = (timestamp: string | undefined | null): boolean => {
  if (!timestamp || timestamp.trim() === '') {
    return false;
  }

  // Check if it's a valid date string
  const date = new Date(timestamp);
  return !isNaN(date.getTime()) && date.getTime() > 0;
};

export const formatChatTimestamp = (timestamp: string | null | undefined): string => {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }

  try {
    const date = new Date(timestamp);

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    // Less than 1 minute ago
    if (diffMins < 1) {
      return 'Just now';
    }

    // Less than 1 hour ago - show minutes
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    }

    // Less than 24 hours ago - show hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // Less than 7 days ago - show days
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    // Less than 4 weeks (approximately 1 month) - show weeks
    if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    }

    // Less than 12 months (approximately 1 year) - show months
    if (diffMonths < 12) {
      return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
    }

    // 1 year or more - show years
    return `${diffYears} ${diffYears === 1 ? 'year' : 'years'} ago`;
  } catch (error) {
    console.warn('Failed to format chat timestamp:', timestamp, error);
    return '';
  }
};

