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
  
  // Handle different date formats
  if (dateString.includes('T')) {
    // ISO format with time
    date = new Date(dateString);
  } else if (dateString.includes('-')) {
    // Date format YYYY-MM-DD
    date = new Date(dateString + 'T00:00:00Z');
  } else if (dateString.includes('/')) {
    // Date format MM/DD/YYYY or DD/MM/YYYY
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

