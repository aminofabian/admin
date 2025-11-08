import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayersDashboard from '../players-dashboard';
import { playersApi } from '@/lib/api';
import type { Mock } from 'vitest';
import type { ChangeEvent, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const routerPushMock = vi.fn();
const paginationMock = {
  page: 1,
  pageSize: 10,
  setPage: vi.fn(),
};
const searchMock = {
  search: '',
  debouncedSearch: '',
  setSearch: vi.fn(),
};
const addToastMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('@/lib/hooks', () => ({
  usePagination: () => paginationMock,
  useSearch: () => searchMock,
}));

vi.mock('@/components/ui', () => {
  const React = require('react');

  return {
    Card: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    CardContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    Button: ({
      children,
      onClick,
      title,
    }: {
      children: ReactNode;
      onClick?: () => void;
      title?: string;
    }) => (
      <button type="button" onClick={onClick} title={title}>
        {children}
      </button>
    ),
    Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
    ConfirmModal: ({
      isOpen,
      onConfirm,
    }: {
      isOpen: boolean;
      onConfirm: () => void;
    }) =>
      isOpen ? (
        <div>
          <button type="button" onClick={onConfirm}>
            confirm
          </button>
        </div>
      ) : null,
    Modal: ({ children, isOpen }: { children: ReactNode; isOpen: boolean }) =>
      isOpen ? <div>{children}</div> : null,
    Pagination: ({
      onPageChange,
    }: {
      onPageChange: (page: number) => void;
    }) => (
      <button type="button" onClick={() => onPageChange(2)}>
        paginate
      </button>
    ),
    SearchInput: ({
      value,
      onChange,
      placeholder,
    }: {
      value: string;
      onChange: (event: ChangeEvent<HTMLInputElement>) => void;
      placeholder?: string;
    }) => (
      <input
        aria-label="search"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    ),
    Table: ({ children }: { children: ReactNode }) => <table>{children}</table>,
    TableHeader: ({ children }: { children: ReactNode }) => (
      <thead>{children}</thead>
    ),
    TableBody: ({ children }: { children: ReactNode }) => (
      <tbody>{children}</tbody>
    ),
    TableRow: ({ children }: { children: ReactNode }) => <tr>{children}</tr>,
    TableHead: ({ children }: { children: ReactNode }) => <th>{children}</th>,
    TableCell: ({ children }: { children: ReactNode }) => <td>{children}</td>,
    useToast: () => ({ addToast: addToastMock }),
  };
});

vi.mock('@/components/features', () => {
  const React = require('react');

  return {
    LoadingState: () => <div data-testid="loading-state">loading</div>,
    ErrorState: ({
      message,
      onRetry,
    }: {
      message: string;
      onRetry: () => void;
    }) => (
      <div role="alert">
        <span>{message}</span>
        <button type="button" onClick={onRetry}>
          retry
        </button>
      </div>
    ),
    EmptyState: ({
      title,
    }: {
      title: string;
    }) => <div data-testid="empty-state">{title}</div>,
    PlayerForm: ({
      onSubmit,
      onCancel,
    }: {
      onSubmit: (data: unknown) => void;
      onCancel: () => void;
    }) => (
      <div>
        <button
          type="button"
          onClick={() =>
            onSubmit({
              username: 'newbie',
              full_name: 'New Player',
              email: 'new@example.com',
              password: 'secret',
              dob: '2000-01-01',
              mobile_number: '1234567890',
              role: 'player',
            })
          }
        >
          submit-player
        </button>
        <button type="button" onClick={onCancel}>
          cancel
        </button>
      </div>
    ),
  };
});

vi.mock('@/components/dashboard/data-sections/action-modal/player-view-modal', () => ({
  PlayerViewModal: () => null,
}));

vi.mock('@/lib/api', () => ({
  playersApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const samplePlayer = {
  id: 1,
  username: 'alpha',
  email: 'alpha@example.com',
  role: 'player' as const,
  is_active: true,
  project_id: 10,
  created: '2025-01-01T00:00:00Z',
  modified: '2025-01-02T00:00:00Z',
  full_name: 'Alpha Tester',
  balance: '1000',
  winning_balance: '250',
};

const sampleResponse = {
  count: 1,
  next: null,
  previous: null,
  results: [samplePlayer],
};

describe('PlayersDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (playersApi.list as Mock).mockResolvedValue(sampleResponse);
    (playersApi.create as Mock).mockResolvedValue(undefined);
    (playersApi.update as Mock).mockResolvedValue(undefined);
  });

  it('renders players after successful load', async () => {
    render(<PlayersDashboard />);

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(samplePlayer.username)).toBeInTheDocument();
    });

    expect(playersApi.list).toHaveBeenCalledWith({
      page: paginationMock.page,
      page_size: paginationMock.pageSize,
      search: undefined,
      is_active: undefined,
      state: undefined,
      date_filter: undefined,
    });
  });

  it('shows error state when loading fails', async () => {
    (playersApi.list as Mock).mockRejectedValueOnce(
      new Error('network down'),
    );

    render(<PlayersDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('network down');
    });
  });

  it('creates a player and refreshes the list', async () => {
    (playersApi.list as Mock)
      .mockResolvedValueOnce(sampleResponse)
      .mockResolvedValueOnce(sampleResponse);

    render(<PlayersDashboard />);

    await waitFor(() => {
      expect(screen.getByText(samplePlayer.username)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /add player/i }));
    await userEvent.click(screen.getByRole('button', { name: /submit-player/i }));

    await waitFor(() => {
      expect(playersApi.create).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(playersApi.list).toHaveBeenCalledTimes(2);
    });
  });

  it('toggles player status and refreshes', async () => {
    (playersApi.list as Mock)
      .mockResolvedValueOnce(sampleResponse)
      .mockResolvedValueOnce(sampleResponse);

    render(<PlayersDashboard />);

    await waitFor(() => {
      expect(screen.getByText(samplePlayer.username)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /deactivate/i }));
    await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

    await waitFor(() => {
      expect(playersApi.update).toHaveBeenCalledWith(samplePlayer.id, {
        is_active: !samplePlayer.is_active,
      });
    });

    await waitFor(() => {
      expect(playersApi.list).toHaveBeenCalledTimes(2);
    });
  });
});

