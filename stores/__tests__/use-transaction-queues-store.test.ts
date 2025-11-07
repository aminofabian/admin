import { act, renderHook } from '@testing-library/react';
import { useTransactionQueuesStore } from '../use-transaction-queues-store';
import { transactionsApi } from '@/lib/api';
import type { TransactionQueue } from '@/types';

jest.mock('@/lib/api', () => ({
  transactionsApi: {
    queues: jest.fn(),
  },
}));

const mockTransactionsApi = transactionsApi as jest.Mocked<typeof transactionsApi>;

const buildQueue = (overrides: Partial<TransactionQueue> = {}): TransactionQueue => ({
  id: 'queue-1',
  type: 'recharge_game',
  status: 'pending',
  user_id: 1,
  user_username: 'player1',
  user_email: 'player1@example.com',
  operator: 'system',
  game_username: 'gamePlayer1',
  game: 'Space Quest',
  game_code: 'SPACE',
  amount: '100',
  bonus_amount: '0',
  new_game_balance: '200',
  remarks: '',
  data: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('useTransactionQueuesStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    act(() => {
      useTransactionQueuesStore.getState().reset();
    });
  });

  it('initializes with default pagination metadata', () => {
    const { result } = renderHook(() => useTransactionQueuesStore());

    expect(result.current.count).toBe(0);
    expect(result.current.next).toBeNull();
    expect(result.current.previous).toBeNull();
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });

  it('fetches history queues and preserves pagination data', async () => {
    const queues = [
      buildQueue({ id: 'queue-1', status: 'completed' }),
      buildQueue({ id: 'queue-2', status: 'cancelled' }),
    ];

    mockTransactionsApi.queues.mockResolvedValue({
      results: queues,
      count: 25,
      next: 'http://example.com?page=2',
      previous: null,
    });

    const { result } = renderHook(() => useTransactionQueuesStore());

    act(() => {
      useTransactionQueuesStore.setState({ filter: 'history', currentPage: 1 });
    });

    await act(async () => {
      await result.current.fetchQueues();
    });

    expect(mockTransactionsApi.queues).toHaveBeenCalledWith({
      type: 'history',
      page: 1,
      page_size: 10,
    });
    expect(result.current.queues).toHaveLength(2);
    expect(result.current.count).toBe(25);
    expect(result.current.next).toBe('http://example.com?page=2');
    expect(result.current.previous).toBeNull();
  });

  it('filters out completed queues when in processing mode', async () => {
    const completedQueue = buildQueue({ id: 'queue-1', status: 'completed' });
    const pendingQueue = buildQueue({ id: 'queue-2', status: 'pending' });

    mockTransactionsApi.queues.mockResolvedValue({
      results: [completedQueue, pendingQueue],
      count: 2,
      next: null,
      previous: null,
    });

    const { result } = renderHook(() => useTransactionQueuesStore());

    await act(async () => {
      await result.current.fetchQueues();
    });

    expect(result.current.queues).toHaveLength(1);
    expect(result.current.queues?.[0].id).toBe('queue-2');
    expect(result.current.count).toBe(2);
    expect(result.current.next).toBeNull();
    expect(result.current.previous).toBeNull();
  });

  it('retains pagination metadata when processing results span multiple pages', async () => {
    mockTransactionsApi.queues.mockResolvedValue({
      results: [buildQueue({ id: 'queue-10' })],
      count: 15,
      next: 'http://example.com?page=2',
      previous: null,
    });

    const { result } = renderHook(() => useTransactionQueuesStore());

    await act(async () => {
      await result.current.fetchQueues();
    });

    expect(result.current.count).toBe(15);
    expect(result.current.next).toBe('http://example.com?page=2');
    expect(result.current.previous).toBeNull();
  });

  it('updates page and refetches queues', async () => {
    mockTransactionsApi.queues.mockResolvedValue({
      results: [],
      count: 0,
      next: null,
      previous: null,
    });

    const { result } = renderHook(() => useTransactionQueuesStore());

    await act(async () => {
      await result.current.setPage(3);
    });

    expect(result.current.currentPage).toBe(3);
    expect(mockTransactionsApi.queues).toHaveBeenLastCalledWith({
      type: 'processing',
      page: 3,
      page_size: 10,
    });
  });
});


