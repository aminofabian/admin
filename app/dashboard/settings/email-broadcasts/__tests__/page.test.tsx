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
  return { Badge, Button, SearchInput, Skeleton };
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
    expect(screen.getByText('Filtered Players')).toBeInTheDocument();
    expect(screen.getByText('Specific Players')).toBeInTheDocument();
    expect(screen.getByText('All Eligible Players')).toBeInTheDocument();

    // Recipient count formatted
    expect(screen.getByText('4,634')).toBeInTheDocument();
    // Delivery stats
    expect(screen.getByText('4,500 delivered')).toBeInTheDocument();
  });

  it('filters the list by clicking a status group card', async () => {
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

  it('opens the composer from the Compose action and from Reuse/Edit draft', async () => {
    const user = userEvent.setup();
    render(<EmailBroadcastsSettingsPage />);

    await screen.findByText('Your weekend reward is waiting');

    await user.click(screen.getByText('Compose campaign'));
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts/compose');

    await user.click(screen.getByText('Edit draft'));
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts/compose');
  });

  it('shows an empty state when there are no campaigns', async () => {
    vi.spyOn(emailBroadcastsApi, 'list').mockResolvedValue([]);
    render(<EmailBroadcastsSettingsPage />);

    expect(await screen.findByText('No email campaigns yet')).toBeInTheDocument();
  });
});
