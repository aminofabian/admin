import { act, renderHook } from '@testing-library/react';
import { useGameActivitiesStore } from '../use-game-activities-store';
import { gamesApi, transactionsApi } from '@/lib/api';

// Mock the APIs
jest.mock('@/lib/api', () => ({
  gamesApi: {
    list: jest.fn(),
  },
  transactionsApi: {
    queues: jest.fn(),
  },
}));

const mockGamesApi = gamesApi as jest.Mocked<typeof gamesApi>;
const mockTransactionsApi = transactionsApi as jest.Mocked<typeof transactionsApi>;

describe('useGameActivitiesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state before each test
    act(() => {
      useGameActivitiesStore.getState().reset();
    });
  });

  it('should have initial state', () => {
    const { result } = renderHook(() => useGameActivitiesStore());
    
    expect(result.current.data).toEqual({
      activeGames: 0,
      inactiveGames: 0,
      pendingQueues: 0,
      totalGames: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });

  it('should fetch game activities successfully', async () => {
    // Mock API responses
    mockGamesApi.list.mockResolvedValue({
      results: [
        {
          id: 1,
          title: 'Game 1',
          code: 'GAME1',
          game_category: 'Action',
          game_status: true,
          dashboard_url: 'http://game1.com',
          created: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          title: 'Game 2',
          code: 'GAME2',
          game_category: 'Puzzle',
          game_status: true,
          dashboard_url: 'http://game2.com',
          created: '2023-01-02T00:00:00Z',
        },
        {
          id: 3,
          title: 'Game 3',
          code: 'GAME3',
          game_category: 'Racing',
          game_status: false,
          dashboard_url: 'http://game3.com',
          created: '2023-01-03T00:00:00Z',
        },
      ],
      count: 3,
      next: null,
      previous: null,
    });

    mockTransactionsApi.queues.mockResolvedValue({
      results: [
        {
          id: 1,
          type: 'recharge_game',
          status: 'pending',
          user_id: 1,
          game: 'Game 1',
          game_code: 'GAME1',
          amount: '100',
          remarks: 'Test',
          data: {},
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          type: 'redeem_game',
          status: 'pending',
          user_id: 2,
          game: 'Game 2',
          game_code: 'GAME2',
          amount: '50',
          remarks: 'Test',
          data: {},
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ],
      count: 2,
      next: null,
      previous: null,
    });

    const { result } = renderHook(() => useGameActivitiesStore());

    await act(async () => {
      await result.current.fetchGameActivities();
    });

    expect(result.current.data.activeGames).toBe(2); // 2 games with game_status: true
    expect(result.current.data.inactiveGames).toBe(1); // 1 game with game_status: false
    expect(result.current.data.totalGames).toBe(3); // Total games
    expect(result.current.data.pendingQueues).toBe(2); // Count from queues response
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
  });

  it('should handle API errors gracefully', async () => {
    mockGamesApi.list.mockRejectedValue(new Error('Games API Error'));

    const { result } = renderHook(() => useGameActivitiesStore());

    await act(async () => {
      await result.current.fetchGameActivities();
    });

    expect(result.current.error).toBe('Games API Error');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual({
      activeGames: 0,
      inactiveGames: 0,
      pendingQueues: 0,
      totalGames: 0,
    });
  });

  it('should handle permission errors', async () => {
    const permissionError = { detail: 'Permission denied' };
    mockGamesApi.list.mockRejectedValue(permissionError);

    const { result } = renderHook(() => useGameActivitiesStore());

    await act(async () => {
      await result.current.fetchGameActivities();
    });

    expect(result.current.error).toBe('Permission denied');
  });

  it('should reset store state', () => {
    const { result } = renderHook(() => useGameActivitiesStore());

    // First set some data
    act(() => {
      useGameActivitiesStore.setState({
        data: {
          activeGames: 10,
          inactiveGames: 5,
          pendingQueues: 3,
          totalGames: 15,
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
      activeGames: 0,
      inactiveGames: 0,
      pendingQueues: 0,
      totalGames: 0,
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdated).toBeNull();
  });
});
