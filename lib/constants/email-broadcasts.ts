import type {
  EmailBroadcast,
  EmailBroadcastAudience,
  EmailBroadcastAudienceCriteria,
  EmailBroadcastStatus,
} from '@/types';
import {
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateVariable,
} from './email-templates';
import { getUsStateLabel } from '@/lib/utils/us-states';

export const EMAIL_BROADCAST_AUDIENCES: {
  value: EmailBroadcastAudience;
  label: string;
  description: string;
}[] = [
  {
    value: 'all',
    label: 'All eligible players',
    description: 'Active opted-in players in your scope',
  },
  {
    value: 'selected',
    label: 'Selected players',
    description: 'Only the player IDs you choose',
  },
];

export const EMAIL_BROADCAST_SSN_OPTIONS: {
  value: 'any' | 'verified' | 'unverified';
  label: string;
}[] = [
  { value: 'any', label: 'Any SSN status' },
  { value: 'verified', label: 'SSN verified' },
  { value: 'unverified', label: 'SSN unverified' },
];

export const EMAIL_BROADCAST_PLACEHOLDER_KEYS = [
  'username',
  'full_name',
  'logo',
  'project_name',
  'email_support',
  'telegram_support',
  'unsubscribe_url',
] as const;

export function getEmailBroadcastPlaceholders(): EmailTemplateVariable[] {
  return EMAIL_BROADCAST_PLACEHOLDER_KEYS.map((key) => EMAIL_TEMPLATE_VARIABLES[key]).filter(
    (variable): variable is EmailTemplateVariable => Boolean(variable),
  );
}

export function emailBroadcastStatusTone(
  status: EmailBroadcastStatus | string,
): 'default' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'sending':
    case 'queued':
      return 'info';
    case 'scheduled':
      return 'warning';
    default:
      return 'default';
  }
}

export function resolveEmailBroadcastCriteria(
  broadcast: EmailBroadcastAudienceCriteria | EmailBroadcast | null | undefined,
): EmailBroadcastAudienceCriteria {
  if (!broadcast) return {};
  const nested =
    'audience_filters' in broadcast && broadcast.audience_filters && typeof broadcast.audience_filters === 'object'
      ? broadcast.audience_filters
      : null;

  return {
    deposit_min: nested?.deposit_min ?? broadcast.deposit_min,
    deposit_max: nested?.deposit_max ?? broadcast.deposit_max,
    ssn_verified: nested?.ssn_verified ?? broadcast.ssn_verified,
    states: nested?.states ?? broadcast.states,
  };
}

export function formatEmailBroadcastCriteria(
  criteria: EmailBroadcastAudienceCriteria | EmailBroadcast | null | undefined,
): string {
  const resolved = resolveEmailBroadcastCriteria(criteria);
  const parts: string[] = [];
  const min = resolved.deposit_min;
  const max = resolved.deposit_max;

  if (min != null && max != null) {
    parts.push(`Deposit $${min}–$${max}`);
  } else if (min != null) {
    parts.push(`Deposit ≥ $${min}`);
  } else if (max != null) {
    parts.push(`Deposit ≤ $${max}`);
  }

  if (resolved.ssn_verified === true) {
    parts.push('SSN verified');
  } else if (resolved.ssn_verified === false) {
    parts.push('SSN unverified');
  }

  const states = Array.isArray(resolved.states) ? resolved.states.filter(Boolean) : [];
  if (states.length > 0) {
    const labels = states.map((code) => getUsStateLabel(code) || code);
    parts.push(
      labels.length <= 3
        ? `States: ${labels.join(', ')}`
        : `States: ${labels.slice(0, 2).join(', ')} +${labels.length - 2}`,
    );
  }

  return parts.join(' · ');
}
