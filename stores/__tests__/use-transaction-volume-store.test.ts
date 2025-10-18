import { act, renderHook } from '@testing-library/react';
import { useTransactionVolumeStore } from '../use-transaction-volume-store';
import { transactionsApi } from '@/lib/api';

// Mock the transactions API
jest.mock('@/lib/api', () => ({
  transactionsApi: {
    list: jest.fn(),
  },
}));

const mockTransactionsApi = transactionsApi as jest.Mocked<typeof transactionsApi>;

describe('useTransactionVolumeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    act(() => {
      useTransactionVolumeStore.getState().reset();
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useTransactionVolumeStore());
    
    expect(result.current.data).toEqual({
      purchases: 0,
      cashouts: 0,
      netVolume: 0,
      completedCount: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should fetch transaction volume successfully', async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Mock API responses
    mockTransactionsApi.list
      .mockResolvedValueOnce({
        results: [
          {
            id: '1',
            amount: '1000',
            status: 'completed',
            created: `${today}T10:00:00Z`,
            type: 'purchase',
            user_username: 'user1',
            user_email: 'user1@example.com',
            bonus_amount: '0',
            operator: 'system',
            payment_method: 'card',
            currency: 'USD',
            description: 'Purchase',
            journal_entry: 'credit',
            previous_balance: '0',
            new_balance: '1000',
            unique_id: 'txn1',
            role: 'player',
            action: 'purchase',
            remarks: null,
            updated: `${today}T10:00:00Z`,
          },
          {
            id: '2',
            amount: '500',
            status: 'completed',
            created: `${today}T11:00:00Z`,
            type: 'purchase',
            user_username: 'user2',
            user_email: 'user2@example.com',
            bonus_amount: '0',
            operator: 'system',
            payment_method: 'card',
            currency: 'USD',
            description: 'Purchase',
            journal_entry: 'credit',
            previous_balance: '0',
            new_balance: '500',
            unique_id: 'txn2',
            role: 'player',
            action: 'purchase',
            remarks: null,
            updated: `${today}T11:00:00Z`,
          },
        ],
        count: 2,
        next: null,
        previous: null,
      })
      .mockResolvedValueOnce({
        results: [
          {
            id: '3',
            amount: '300',
            status: 'completed',
            created: `${today}T12:00:00Z`,
            type: 'cashout',
            user_username: 'user1',
            user_email: 'user1@example.com',
            bonus_amount: '0',
            operator: 'system',
            payment_method: 'bank',
            currency: 'USD',
            description: 'Cashout',
            journal_entry: 'debit',
            previous_balance: '1000',
            new_balance: '700',
            unique_id: 'txn3',
            role: 'player',
            action: 'cashout',
            remarks: null,
            updated: `${today}T12:00:00Z`,
          },
        ],
        count: 1,
        next: null,
        previous: null,
      });

    const { result } = renderHook(() => useTransactionVolumeStore());

    await act(async () => {
      await result.current.fetchTransactionVolume();
    });

    expect(result.current.data.purchases).toBe(1500); // 1000 + 500
    expect(result.current.data.cashouts).toBe(300);
    expect(result.current.data.netVolume).toBe(1200); // 1500 - 300
    expect(result.current.data.completedCount).toBe(3); // 2 purchases + 1 cashout
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle API errors gracefully', async () => {
    mockTransactionsApi.list.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useTransactionVolumeStore());

    await act(async () => {
      await result.current.fetchTransactionVolume();
    });

    expect(result.current.error).toBe('API Error');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({
      purchases: 0,
      cashouts: 0,
      netVolume: 0,
      completedCount: 0,
    });
  });

  it('should handle permission errors', async () => {
    const permissionError = { detail: 'Permission denied' };
    mockTransactionsApi.list.mockRejectedValue(permissionError);

    const { result } = renderHook(() => useTransactionVolumeStore());

    await act(async () => {
      await result.current.fetchTransactionVolume();
    });

    expect(result.current.error).toBe('Permission denied');
  });

  it('should reset store state', () => {
    const { result } = renderHook(() => useTransactionVolumeStore());

    // First set some data
    act(() => {
      useTransactionVolumeStore.setState({
        data: {
          purchases: 1000,
          cashouts: 500,
          netVolume: 500,
          completedCount: 2,
        },
        isLoading: true,
        error: 'Some error',
        lastUpdated: new Date(),
      });
    });

    // Then reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toEqual({
      purchases: 0,
      cashouts: 0,
      netVolume: 0,
      completedCount: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });
});
