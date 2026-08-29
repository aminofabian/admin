import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentMethodsApi } from '@/lib/api';
import { useHistoryPaymentFilterOptions } from '../use-history-payment-filter-options';
import { STATIC_PROVIDER_FILTER_OPTIONS } from '@/lib/utils/transaction-provider-filter-options';

vi.mock('@/lib/api', () => ({
  paymentMethodsApi: {
    list: vi.fn(),
  },
}));

const apiMock = vi.mocked(paymentMethodsApi);

describe('useHistoryPaymentFilterOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch until enabled', () => {
    renderHook(() => useHistoryPaymentFilterOptions(false));
    expect(apiMock.list).not.toHaveBeenCalled();
  });

  it('loads provider options from payment-methods API', async () => {
    apiMock.list.mockResolvedValue({
      cashout: [],
      purchase: [
        {
          payment_method: 'paypal',
          payment_method_display: 'Paypal',
          has_subcategories: true,
          subcategories: [
            {
              id: 1,
              is_configured: true,
              payment_method: 'paypal_wallet',
              payment_method_display: 'PayPal',
              provider_payment_method: 'paypal',
              provider_payment_method_display: 'Paypal',
            },
            {
              id: 2,
              is_configured: true,
              payment_method: 'coinbasepay',
              payment_method_display: 'Coinbase Pay',
              provider_payment_method: 'coinbase',
              provider_payment_method_display: 'Coinbase Pay',
            },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useHistoryPaymentFilterOptions(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(apiMock.list).toHaveBeenCalledTimes(1);
    expect(result.current.providerOptions.map((o) => o.value)).toEqual(
      expect.arrayContaining(['paypal', 'coinbase']),
    );
    expect(result.current.paymentMethodOptions.map((o) => o.value)).toContain('paypal');
  });

  it('returns Paypal and Coinbase Pay when the API omits them', async () => {
    apiMock.list.mockResolvedValue({ cashout: [], purchase: [] });

    const { result } = renderHook(() => useHistoryPaymentFilterOptions(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providerOptions.find((o) => o.value === 'paypal')?.label).toBe('Paypal');
    expect(result.current.providerOptions.find((o) => o.value === 'coinbase')?.label).toBe('Coinbase Pay');
  });

  it('falls back to static options when the API fails', async () => {
    apiMock.list.mockRejectedValue(new Error('network'));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useHistoryPaymentFilterOptions(true));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.providerOptions).toEqual(STATIC_PROVIDER_FILTER_OPTIONS);
    errorSpy.mockRestore();
  });
});
