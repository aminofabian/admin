import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CSSProperties, ReactNode } from 'react';
import EmailBroadcastsSettingsPage from '../page';
import { emailBroadcastsApi } from '@/lib/api';
import type { EmailBroadcast } from '@/types';

const routerPushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock }),
}));

vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({
    user: { id: 1, role: 'staff', username: 'staff1' },
    isLoading: false,
  }),
}));

vi.mock('@/lib/constants/roles', () => ({
  canManageEmailBroadcasts: () => true,
}));

vi.mock('@/lib/utils/project-uuid', () => ({
  resolveEmailScopeUuid: () => undefined,
}));

vi.mock('@/components/ui', () => {
  const Badge = ({ children, variant }: { children?: ReactNode; variant?: string }) => (
    <span data-variant={variant}>{children}</span>
  );
  const Button = ({
    children,
    onClick,
    type = 'button',
    ...rest
  }: {
    children?: ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} onClick={onClick} {...rest}>
      {children}
    </button>
  );
  const SearchInput = (props: Record<string, unknown>) => <input type="search" {...props} />;
  const Skeleton = ({ className, style }: { className?: string; style?: CSSProperties }) => (
    <div className={className} style={style} />
  );
  const DropdownMenu = ({ trigger, children }: { trigger?: ReactNode; children?: ReactNode }) => (
    <div>
      {trigger}
      <div data-testid="dropdown-menu">{children}</div>
    </div>
  );
  const DropdownMenuItem = ({
    children,
    onClick,
    disabled,
  }: {
    children?: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
  const ConfirmModal = ({
    isOpen,
    title,
    description,
    confirmText,
    onConfirm,
  }: {
    isOpen: boolean;
    title: string;
    description?: string;
    confirmText?: string;
    onConfirm?: () => void;
  }) =>
    isOpen ? (
      <div role="dialog">
        <p>{title}</p>
        {description ? <p>{description}</p> : null}
        <button type="button" onClick={onConfirm}>
          {confirmText || 'Confirm'}
        </button>
      </div>
    ) : null;
  const Drawer = ({
    isOpen,
    title,
    children,
    footer,
  }: {
    isOpen: boolean;
    title?: string;
    children?: ReactNode;
    footer?: ReactNode;
  }) =>
    isOpen ? (
      <div>
        <h2>{title}</h2>
        {children}
        {footer}
      </div>
    ) : null;
  const useToast = () => ({ addToast: vi.fn() });
  return {
    Badge,
    Button,
    SearchInput,
    Skeleton,
    DropdownMenu,
    DropdownMenuItem,
    ConfirmModal,
    Drawer,
    useToast,
  };
});

const sampleBroadcasts: EmailBroadcast[] = [
  {
    id: 1,
    name: 'Weekend Recharge Offer',
    subject: 'Your weekend reward is waiting',
    html_body: '<p>Hi {{ username }}</p>',
    audience: 'filtered',
    filter_match: 'all',
    filters: [{ field: 'account_status', op: 'eq', value: 'active' }],
    status: 'completed',
    scheduled_at: null,
    sent_at: '2026-08-01T10:00:00Z',
    total_recipients: 4634,
    successful_deliveries: 4500,
    failed_deliveries: 134,
    skipped_deliveries: 0,
    last_error: 'SMTP timeout on a subset of recipients',
    created: '2026-07-30T09:00:00Z',
  },
  {
    id: 2,
    name: 'VIP note',
    subject: 'Hello VIP',
    html_body: '<p>Hi</p>',
    audience: 'specific',
    user_ids: [156],
    status: 'draft',
    scheduled_at: null,
    sent_at: null,
    total_recipients: 0,
    created: '2026-08-02T09:00:00Z',
  },
  {
    id: 3,
    name: 'All hands update',
    subject: 'Brand update',
    html_body: '<p>Hi</p>',
    audience: 'all_eligible',
    status: 'failed',
    scheduled_at: null,
    sent_at: '2026-07-28T10:00:00Z',
    total_recipients: 1000,
    successful_deliveries: 0,
    failed_deliveries: 1000,
    skipped_deliveries: 0,
    created: '2026-07-27T09:00:00Z',
  },
  {
    id: 4,
    name: 'Queued blast',
    subject: 'Tonight only',
    html_body: '<p>Hi</p>',
    audience: 'all_eligible',
    status: 'queued',
    scheduled_at: null,
    sent_at: null,
    total_recipients: 200,
    successful_deliveries: 0,
    failed_deliveries: 0,
    skipped_deliveries: 0,
    created: '2026-08-03T09:00:00Z',
  },
  {
    id: 5,
    name: 'Stopped mid-send',
    subject: 'We cancelled this',
    html_body: '<p>Hi</p>',
    audience: 'filtered',
    status: 'cancelled',
    scheduled_at: null,
    sent_at: '2026-08-01T11:00:00Z',
    total_recipients: 500,
    successful_deliveries: 80,
    failed_deliveries: 12,
    skipped_deliveries: 408,
    bounced_deliveries: 3,
    complaint_deliveries: 1,
    created: '2026-08-01T09:00:00Z',
  },
];

describe('EmailBroadcastsSettingsPage', () => {
  beforeEach(() => {
    routerPushMock.mockReset();
    vi.spyOn(emailBroadcastsApi, 'list').mockResolvedValue(sampleBroadcasts);
  });

  it('renders campaigns with status, audience, and recipient counts', async () => {
    render(<EmailBroadcastsSettingsPage />);

    expect(await screen.findByText('Your weekend reward is waiting')).toBeInTheDocument();
    expect(screen.getByText('Hello VIP')).toBeInTheDocument();
    expect(screen.getByText('Brand update')).toBeInTheDocument();

    // Status labels (also present as stat-card labels)
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);

    // Audience labels
    expect(screen.getAllByText('Filtered Players').length).toBeGreaterThan(0);
    expect(screen.getByText('Specific Players')).toBeInTheDocument();
    expect(screen.getAllByText('All Eligible Players').length).toBeGreaterThan(0);

    // Recipient count + delivery stats
    expect(screen.getByText('4,634')).toBeInTheDocument();
    expect(screen.getByText('4,500')).toBeInTheDocument();
  });

  it('filters the list by clicking a status group pill', async () => {
    const user = userEvent.setup();
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Your weekend reward is waiting');

    await user.click(screen.getByText('Drafts'));
    expect(screen.getByText('Hello VIP')).toBeInTheDocument();
    expect(screen.queryByText('Your weekend reward is waiting')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand update')).not.toBeInTheDocument();

    await user.click(screen.getByText('Failed'));
    expect(screen.getByText('Brand update')).toBeInTheDocument();
    expect(screen.queryByText('Hello VIP')).not.toBeInTheDocument();
  });

  it('searches campaigns by subject', async () => {
    const user = userEvent.setup();
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Your weekend reward is waiting');

    await user.type(screen.getByRole('searchbox'), 'vip');
    expect(screen.getByText('Hello VIP')).toBeInTheDocument();
    expect(screen.queryByText('Your weekend reward is waiting')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand update')).not.toBeInTheDocument();
  });

  it('opens the composer from the Compose action and from the Edit draft row action', async () => {
    const user = userEvent.setup();
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Your weekend reward is waiting');

    await user.click(screen.getByText('Compose campaign'));
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts/compose');

    await user.click(screen.getByText('Drafts'));
    await user.click(screen.getAllByLabelText('Campaign actions')[0]);
    await user.click(await screen.findByText('Edit'));
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts/compose');
  });

  it('shows an empty state when there are no campaigns', async () => {
    vi.spyOn(emailBroadcastsApi, 'list').mockResolvedValue([]);
    render(<EmailBroadcastsSettingsPage />);

    expect(await screen.findByText('No email campaigns yet')).toBeInTheDocument();
  });

  it('shows sent vs failed instead of treating last_error as a total failure', async () => {
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Your weekend reward is waiting');
    expect(screen.getAllByText(/sent vs/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/SMTP timeout/i)).not.toBeInTheDocument();
  });

  it('shows bounced and complaint counts only when greater than zero', async () => {
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('We cancelled this');
    expect(screen.getByText(/bounced/)).toBeInTheDocument();
    expect(screen.getByText(/complaints/)).toBeInTheDocument();
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
  });

  it('offers cancel on queued campaigns and retry failed on completed/cancelled', async () => {
    const user = userEvent.setup();
    const cancelSpy = vi.spyOn(emailBroadcastsApi, 'cancel').mockResolvedValue({} as never);
    const retrySpy = vi.spyOn(emailBroadcastsApi, 'retryFailed').mockResolvedValue({} as never);
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Tonight only');

    const actionButtons = screen.getAllByLabelText('Campaign actions');
    await user.click(actionButtons[0]);
    expect(screen.getAllByText('Cancel').length).toBeGreaterThan(0);
    expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    expect(screen.queryByText('Resume')).not.toBeInTheDocument();

    await user.click(screen.getAllByText('Cancel')[0]);
    await user.click(screen.getByText('Cancel campaign'));
    expect(cancelSpy).toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /Completed/ }));
    const retryButtons = screen.getAllByRole('button', { name: 'Retry failed' });
    await user.click(retryButtons[0]);
    expect(screen.getByText('Retry failed deliveries?')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Retry failed' }).at(-1)!);
    expect(retrySpy).toHaveBeenCalled();
  });
});
