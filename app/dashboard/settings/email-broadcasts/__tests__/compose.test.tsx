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
  const ConfirmModal = ({
    isOpen,
    title,
    onConfirm,
  }: {
    isOpen: boolean;
    title: string;
    onConfirm?: () => void;
  }) =>
    isOpen ? (
      <div role="dialog">
        <p>{title}</p>
        <button type="button" onClick={onConfirm}>
          Confirm send
        </button>
      </div>
    ) : null;
  return { Button, ConfirmModal, useToast };
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
  ComposerPanel: ({
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
  ReadinessItem: ({ label }: { label: string }) => <div>{label}</div>,
  ExcludedPlayersSample: () => <div data-testid="excluded-sample" />,
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

  it('renders the cockpit command bar, setup panel, and readiness rail', async () => {
    render(<ComposePage />);

    expect(await screen.findByText('Compose campaign')).toBeInTheDocument();
    expect(screen.getByText('Setup')).toBeInTheDocument();
    expect(screen.getByText('Write')).toBeInTheDocument();
    expect(screen.getAllByText('Email details').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recipients').length).toBeGreaterThan(0);

    expect(screen.getByLabelText('Internal email name')).toBeInTheDocument();
    expect(screen.getByLabelText('Subject')).toBeInTheDocument();

    expect(screen.getAllByText('Save Draft').length).toBeGreaterThan(0);
    const reviewButtons = screen.getAllByText('Review & Send');
    expect(reviewButtons[0]).toBeDisabled();
  });

  it('keeps Review & Send disabled until details are filled and recipients exist', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');

    await user.type(screen.getByLabelText('Internal email name'), 'Weekend Recharge Offer');
    await user.type(screen.getByLabelText('Subject'), 'Your weekend reward is waiting');

    expect(screen.getAllByText('Review & Send')[0]).toBeDisabled();

    await user.click(screen.getByText('All Eligible Players'));
    await waitFor(() => {
      expect(screen.getAllByText('95').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText('Review & Send')[0]).not.toBeDisabled();
  });

  it('shows live recipient metrics for the active method', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');

    await user.click(screen.getByText('All Eligible Players'));
    await waitFor(() => {
      expect(screen.getAllByText('100').length).toBeGreaterThan(0);
      expect(screen.getAllByText('5').length).toBeGreaterThan(0);
      expect(screen.getAllByText('95').length).toBeGreaterThan(0);
    });
  });

  it('switches to the write panel from setup', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');
    await user.type(screen.getByLabelText('Internal email name'), 'Weekend Recharge Offer');
    await user.type(screen.getByLabelText('Subject'), 'Your weekend reward is waiting');
    await user.click(screen.getByText('All Eligible Players'));

    await waitFor(() => {
      expect(screen.getByText('Continue to Write')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Continue to Write'));

    expect(await screen.findAllByText('Content & preview')).not.toHaveLength(0);
    expect(screen.getByTestId('html-editor')).toBeInTheDocument();
  });

  it('navigates back to the campaigns list', async () => {
    const user = userEvent.setup();
    render(<ComposePage />);

    await screen.findByText('Compose campaign');
    await user.click(screen.getByRole('button', { name: /Back to campaigns/i }));

    expect(routerPushMock).toHaveBeenCalledWith('/dashboard/settings/email-broadcasts');
  });
});
