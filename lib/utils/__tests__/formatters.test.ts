import { formatDate, formatCurrency, formatPercentage, getPaymentDetailsForDisplay } from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format valid date strings correctly', () => {
      const validDate = '2024-01-15T10:30:00Z';
      const result = formatDate(validDate);
      expect(result).toMatch(/Jan 15, 2024, \d{2}:\d{2}/);
    });

    it('should handle null values', () => {
      expect(formatDate(null)).toBe('N/A');
    });

    it('should handle undefined values', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should handle empty strings', () => {
      expect(formatDate('')).toBe('N/A');
      expect(formatDate('   ')).toBe('N/A');
    });

    it('should handle invalid date strings', () => {
      expect(formatDate('invalid-date')).toBe('Invalid Date');
      expect(formatDate('2024-13-45')).toBe('Invalid Date');
      expect(formatDate('not-a-date')).toBe('Invalid Date');
    });

    it('should handle various date formats', () => {
      // ISO string
      expect(formatDate('2024-01-15T10:30:00Z')).toMatch(/Jan 15, 2024/);
      
      // Date only
      expect(formatDate('2024-01-15')).toMatch(/Jan 15, 2024/);
      
      // Timestamp
      expect(formatDate('1705312200000')).toMatch(/Jan 15, 2024/);
    });
  });

  describe('formatCurrency', () => {
    it('should format numbers correctly', () => {
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format string numbers correctly', () => {
      expect(formatCurrency('123.45')).toBe('$123.45');
      expect(formatCurrency('0')).toBe('$0.00');
    });
  });

  describe('formatPercentage', () => {
    it('should format numbers correctly', () => {
      expect(formatPercentage(12.34)).toBe('12.34%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should format string numbers correctly', () => {
      expect(formatPercentage('12.34')).toBe('12.34%');
      expect(formatPercentage('0')).toBe('0.00%');
    });
  });

  describe('getPaymentDetailsForDisplay', () => {
    it('includes Venmo username when method is venmo and handle is in payment_details', () => {
      const rows = getPaymentDetailsForDisplay({
        payment_method: 'venmo',
        payment_details: {
          full_name: 'Alex Jones',
          venmo_username: 'alex-handle',
          player_ip_address: '10.124.0.12',
        },
        user_username: 'Alex Jones',
      });
      const venmoRow = rows.find(([label]) => label === 'Venmo username');
      expect(venmoRow?.[1]).toBe('@alex-handle');
    });

    it('does not duplicate Venmo username from user_username when it matches display name', () => {
      const rows = getPaymentDetailsForDisplay({
        payment_method: 'venmo',
        payment_details: {
          full_name: 'Alex Jones',
          player_ip_address: '10.0.0.1',
        },
        user_username: 'Alex Jones',
      });
      expect(rows.some(([label]) => label === 'Venmo username')).toBe(false);
    });

    it('appends Venmo username when handle uses a key outside the generic Username bucket', () => {
      const rows = getPaymentDetailsForDisplay({
        payment_method: 'venmo',
        payment_details: {
          full_name: 'Alex Jones',
          player_ip_address: '10.124.0.12',
          venmo_handle: 'Alex-Pay-Venmo',
        },
        user_username: 'Alex Jones',
      });
      const venmoRow = rows.find(([label]) => label === 'Venmo username');
      expect(venmoRow?.[1]).toBe('@Alex-Pay-Venmo');
    });
  });
});
