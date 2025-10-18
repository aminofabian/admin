import { renderHook } from '@testing-library/react';
import { useGameActivities } from './use-game-activities';
import { useGameActivitiesStore } from '@/stores';

// Mock the store
jest.mock('@/stores', () => ({
  useGameActivitiesStore: jest.fn(),
}));

const mockUseGameActivitiesStore = useGameActivitiesStore as jest.MockedFunction<typeof useGameActivitiesStore>;

describe('useGameActivities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return game activities data from store', () => {
    const mockStoreData = {
      data: {
        activeGames: 10,
        inactiveGames: 5,
        pendingQueues: 3,
        totalGames: 15,
      },
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      fetchGameActivities: jest.fn(),
      reset: jest.fn(),
    };

    mockUseGameActivitiesStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useGameActivities());

    expect(result.current.activeGames).toBe(10);
    expect(result.current.inactiveGames).toBe(5);
    expect(result.current.pendingQueues).toBe(3);
    expect(result.current.totalGames).toBe(15);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should call fetchGameActivities on mount', () => {
    const mockFetchGameActivities = jest.fn();
    const mockStoreData = {
      data: {
        activeGames: 0,
        inactiveGames: 0,
        pendingQueues: 0,
        totalGames: 0,
      },
      isLoading: false,
      error: null,
      lastUpdated: null,
      fetchGameActivities: mockFetchGameActivities,
      reset: jest.fn(),
    };

    mockUseGameActivitiesStore.mockReturnValue(mockStoreData);

    renderHook(() => useGameActivities());

    expect(mockFetchGameActivities).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state', () => {
    const mockStoreData = {
      data: {
        activeGames: 0,
        inactiveGames: 0,
        pendingQueues: 0,
        totalGames: 0,
      },
      isLoading: true,
      error: null,
      lastUpdated: null,
      fetchGameActivities: jest.fn(),
      reset: jest.fn(),
    };

    mockUseGameActivitiesStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useGameActivities());

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle error state', () => {
    const mockStoreData = {
      data: {
        activeGames: 0,
        inactiveGames: 0,
        pendingQueues: 0,
        totalGames: 0,
      },
      isLoading: false,
      error: 'API Error',
      lastUpdated: null,
      fetchGameActivities: jest.fn(),
      reset: jest.fn(),
    };

    mockUseGameActivitiesStore.mockReturnValue(mockStoreData);

    const { result } = renderHook(() => useGameActivities());

    expect(result.current.error).toBe('API Error');
  });
});
