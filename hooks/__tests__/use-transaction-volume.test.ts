import { renderHook, waitFor } from '@testing-library/react';
import { useTransactionVolume } from './use-transaction-volume';
import { useTransactionVolumeStore } from '@/stores';

// Mock the store
jest.mock('@/stores', () => ({
  useTransactionVolumeStore: jest.fn(),
}));

const mockUseTransactionVolumeStore = useTransactionVolumeStore as jest.MockedFunction<typeof useTransactionVolumeStore>;

describe('useTransactionVolume', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return transaction volume data from store', async () => {
    const mockStoreData = {
      data: {
        purchases: 1500,
        cashouts: 300,
        netVolume: 1200,
        completedCount: 3,
      },
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      fetchTransactionVolume: jest.fn(),
      reset: jest.fn(),
    };

    mockUseTransactionVolumeStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useTransactionVolume());

    expect(result.current.purchases).toBe(1500);
    expect(result.current.cashouts).toBe(300);
    expect(result.current.netVolume).toBe(1200);
    expect(result.current.completedCount).toBe(3);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call fetchTransactionVolume on mount', () => {
    const mockFetchTransactionVolume = jest.fn();
    const mockStoreData = {
      data: {
        purchases: 0,
        cashouts: 0,
        netVolume: 0,
        completedCount: 0,
      },
      isLoading: false,
      error: null,
      lastUpdated: null,
      fetchTransactionVolume: mockFetchTransactionVolume,
      reset: jest.fn(),
    };

    mockUseTransactionVolumeStore.mockReturnValue(mockStoreData);

    renderHook(() => useTransactionVolume());

    expect(mockFetchTransactionVolume).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state', () => {
    const mockStoreData = {
      data: {
        purchases: 0,
        cashouts: 0,
        netVolume: 0,
        completedCount: 0,
      },
      isLoading: true,
      error: null,
      lastUpdated: null,
      fetchTransactionVolume: jest.fn(),
      reset: jest.fn(),
    };

    mockUseTransactionVolumeStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useTransactionVolume());

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', () => {
    const mockStoreData = {
      data: {
        purchases: 0,
        cashouts: 0,
        netVolume: 0,
        completedCount: 0,
      },
      isLoading: false,
      error: 'API Error',
      lastUpdated: null,
      fetchTransactionVolume: jest.fn(),
      reset: jest.fn(),
    };

    mockUseTransactionVolumeStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useTransactionVolume());

    expect(result.current.error).toBe('API Error');
  });
});
