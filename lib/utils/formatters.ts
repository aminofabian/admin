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
  // Handle null, undefined, or empty strings
  if (!dateString || dateString.trim() === '') {
    return 'N/A';
  }

  // Handle common invalid date strings
  if (dateString === 'null' || dateString === 'undefined' || dateString === 'Invalid Date') {
    return 'N/A';
  }

  // Try to create date object
  let date: Date;
  
  // Handle DD/MM/YYYY HH:mm:ss format (from backend)
  const ddmmyyyyPattern = /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = dateString.match(ddmmyyyyPattern);
  
  if (match) {
    // Parse DD/MM/YYYY HH:mm:ss format
    const [, day, month, year, hour, minute, second] = match;
    // Month is 0-indexed in JavaScript Date
    date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  } else if (dateString.includes('T')) {
    // ISO format with time
    date = new Date(dateString);
  } else if (dateString.includes('-')) {
    // Date format YYYY-MM-DD
    date = new Date(dateString + 'T00:00:00Z');
  } else if (dateString.includes('/')) {
    // Try standard date parsing (fallback)
    date = new Date(dateString);
  } else {
    // Try parsing as timestamp
    const timestamp = parseInt(dateString);
    if (!isNaN(timestamp)) {
      date = new Date(timestamp);
    } else {
      date = new Date(dateString);
    }
  }
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString);
    return 'N/A';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
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

