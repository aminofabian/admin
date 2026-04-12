import {
  formatDate,
  formatCurrency,
  formatPercentage,
  getPaymentDetailsForDisplay,
  getProviderDisplayName,
  getPurchaseBonusPaymentLabel,
} from '../formatters';

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
      expect(formatCurrency(50)).toBe('$50.00');
      expect(formatCurrency(100.1)).toBe('$100.10');
    });

    it('should format string numbers correctly', () => {
      expect(formatCurrency('123.45')).toBe('$123.45');
      expect(formatCurrency('0')).toBe('$0.00');
      expect(formatCurrency('100.0000')).toBe('$100.00');
    });

    it('should treat non-finite values as zero', () => {
      expect(formatCurrency('not-a-number')).toBe('$0.00');
      expect(formatCurrency(Number.NaN)).toBe('$0.00');
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

    it('formats card details as **** + last four digits when value is digits only', () => {
      const rows = getPaymentDetailsForDisplay({
        payment_method: 'card',
        payment_details: { last4: '7887' },
      });
      expect(rows.find(([label]) => label === 'Card Details')?.[1]).toBe('****7887');
    });

    it('preserves already-masked card strings from the API', () => {
      const masked = '**** **** **** 7887';
      const rows = getPaymentDetailsForDisplay({
        payment_method: 'card',
        payment_details: { masked_card: masked },
      });
      expect(rows.find(([label]) => label === 'Card Details')?.[1]).toBe(masked);
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

  describe('getProviderDisplayName', () => {
    it('should map bitcoin-lightning plus cashapp category to Cashapp Pay', () => {
      expect(getProviderDisplayName('bitcoin-lightning', 'cashapp')).toBe('Cashapp Pay');
    });

    it('should map bitcoin_lightning plus cashapp category to Cashapp Pay', () => {
      expect(getProviderDisplayName('bitcoin_lightning', 'cashapp')).toBe('Cashapp Pay');
    });

    it('should not treat cashapp topup alone as Cashapp Pay', () => {
      expect(getProviderDisplayName('cashapp', 'cashapp')).toBe('Cashapp');
    });
  });

  describe('getPurchaseBonusPaymentLabel', () => {
    it('should use Cashapp Pay for lightning+cashapp without repeating the BTC rail name', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'bitcoin-lightning',
          purchase_category: 'cashapp',
          purchase_category_display: 'Cashapp Pay',
        }),
      ).toBe('Cashapp Pay');
    });

    it('should use lightning+cashapp when display is absent', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'bitcoin-lightning',
          purchase_category: 'cashapp',
        }),
      ).toBe('Cashapp Pay');
    });

    it('should format plain cashapp topup when no category display', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'cashapp',
          purchase_category: 'cashapp',
        }),
      ).toBe('Cashapp');
    });

    it('should use Cash App display without redundant rail suffix when it matches cashapp topup', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'cashapp',
          purchase_category: 'cashapp',
          purchase_category_display: 'Cash App',
        }),
      ).toBe('Cash App');
    });

    it('should disambiguate a shared category with the topup rail (e.g. card providers)', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'banxa',
          purchase_category_display: 'Credit Debit Card',
        }),
      ).toBe('Credit Debit Card (Banxa)');
    });

    it('should not duplicate when category display already matches the formatted topup', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'stripe',
          purchase_category_display: 'Stripe',
        }),
      ).toBe('Stripe');
    });

    it('should disambiguate two rails that share a broad Crypto label', () => {
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'bitcoin',
          purchase_category_display: 'Crypto',
        }),
      ).toBe('Crypto (Bitcoin)');
      expect(
        getPurchaseBonusPaymentLabel({
          topup_method: 'ethereum',
          purchase_category_display: 'Crypto',
        }),
      ).toBe('Crypto (Ethereum)');
    });
  });
});
