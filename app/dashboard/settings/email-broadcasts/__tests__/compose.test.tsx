import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import ComposePage from '../compose/page';
import { emailBroadcastsApi } from '@/lib/api';

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

vi.mock('@/lib/api', () => ({
  emailBroadcastsApi: {
    preview: vi.fn(),
    searchPlayers: vi.fn(),
  },
}));

vi.mock('@/components/ui', () => {
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
  const useToast = () => ({ addToast: vi.fn() });
  return { Button, useToast };
});

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

vi.mock('@/components/features/email-campaign-html-editor', () => ({
  EmailCampaignHtmlEditor: () => <textarea data-testid="html-editor" readOnly />,
}));

vi.mock('@/components/features/email-campaign-composer-ui', () => ({
  ComposerAlert: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  ComposerFieldLabel: ({
    htmlFor,
    children,
  }: {
    htmlFor?: string;
    children?: ReactNode;
  }) => <label htmlFor={htmlFor}>{children}</label>,
  ComposerMetric: ({ label, value }: { label: string; value?: ReactNode }) => (
    <div data-metric={label}>{value}</div>
  ),
  ComposerSection: ({
    title,
    children,
  }: {
    title: string;
    children?: ReactNode;
  }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

const previewResponse = {
  matched_count: 100,
  excluded_count: 5,
  final_count: 95,
  exclusion_counts: { unsubscribed: 3, missing_email: 2 },
};

describe('EmailCampaignComposePage', () => {
  beforeEach(() => {
    routerPushMock.mockReset();
    vi.mocked(emailBroadcastsApi.preview).mockResolvedValue(previewResponse);
    vi.mocked(emailBroadcastsApi.searchPlayers).mockResolvedValue({ results: [] });
    window.localStorage?.clear();
    window.sessionStorage?.clear();
  });

  it('renders the composer hero, stepper, and all three sections', async () => {
    render(<ComposePage />);

    expect(await screen.findByText('Compose campaign')).toBeInTheDocument();
    // Stepper labels also match the section headings — both are expected.
    expect(screen.getAllByText('Email details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recipients').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Content & preview').length).toBeGreaterThan(0);

    expect(screen.getByLabelText('Internal email name')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();

    // Bottom action bar
    expect(screen.getByText('Save Draft')).toBeInTheDocument();
    const reviewButton = screen.getByText('Review & Send');
    expect(reviewButton).toBeDisabled();
  });

  it('keeps Review & Send disabled until details are filled and recipients exist', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');

    await user.type(screen.getByLabelText('Internal email name'), 'Weekend Recharge Offer');
    await user.type(screen.getByLabelText('Subject'), 'Your weekend reward is waiting');

    // Specific players: nothing selected yet → still locked.
    expect(screen.getByText('Review & Send')).toBeDisabled();

    // Switch to All Eligible Players — preview resolves to 95 final recipients.
    await user.click(screen.getByText('All Eligible Players'));
    await waitFor(() => {
      expect(screen.getByText('95')).toBeInTheDocument();
    });
    expect(screen.getByText('Review & Send')).not.toBeDisabled();
  });

  it('shows live recipient metrics for the active method', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');

    await user.click(screen.getByText('All Eligible Players'));
    expect(await screen.findByText('100')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('95')).toBeInTheDocument();
  });

  it('navigates back to the campaigns list', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');
    await user.click(screen.getByText('Back to campaigns'));

    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts');
  });
});
