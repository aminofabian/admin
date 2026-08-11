import type {
  EmailBroadcast,
  EmailBroadcastAudience,
  EmailBroadcastAudienceCriteria,
  EmailBroadcastFilterPayload,
  EmailBroadcastStatus,
} from '@/types';
import {
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateVariable,
} from './email-templates';
import {
  EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS,
  getFilterFieldDef,
} from './email-campaign-filters';
import type { EmailCampaignFilterField, EmailCampaignFilterOperator } from '@/types';
import { getUsStateLabel } from '@/lib/utils/us-states';

/** Legacy audience options (still used by the legacy compose drawer). */
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
  'email',
  'logo',
  'project_name',
  'email_support',
  'telegram_support',
  'unsubscribe_url',
  'balance',
  'subject',
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
    case 'draft':
      return 'default';
    default:
      return 'default';
  }
}

export function emailBroadcastAudienceLabel(
  audience: EmailBroadcastAudience | string | undefined | null,
): string {
  switch (audience) {
    case 'specific':
      return 'Specific Players';
    case 'filtered':
      return 'Filtered Players';
    case 'all_eligible':
      return 'All Eligible Players';
    case 'selected':
      return 'Selected Players';
    case 'all':
    case 'whitelabel':
      return 'All Eligible Players';
    default:
      return audience || '—';
  }
}

/**
 * Turn raw backend / Python exception strings into calm, staff-facing copy.
 * Full technical detail can still be shown via tooltip when useful.
 */
export function formatEmailBroadcastDeliveryError(
  raw: string | null | undefined,
): { label: string; detail?: string } | null {
  if (!raw || !raw.trim()) return null;

  const text = raw.trim();
  const lower = text.toLowerCase();

  // Python / Django internals — never show these verbatim in the UI.
  const isTechnical =
    /nonetype|attributeerror|typeerror|keyerror|indexerror|traceback|django\.|object has no attribute|integrityerror|operationalerror|doesnotexist/i.test(
      text,
    ) || /^['"]?\w+Error\b/.test(text);

  if (isTechnical) {
    if (lower.includes('admin') || lower.includes('nonetype')) {
      return {
        label: 'Couldn’t finish sending — try again or contact support',
        detail: text,
      };
    }
    return {
      label: 'Something went wrong while sending',
      detail: text,
    };
  }

  if (lower.includes('timeout') || lower.includes('timed out')) {
    return { label: 'Sending timed out — you can retry this campaign', detail: text };
  }
  if (lower.includes('rate') || lower.includes('throttle') || lower.includes('too many')) {
    return { label: 'Send was rate-limited — wait a moment and retry', detail: text };
  }
  if (
    lower.includes('smtp') ||
    lower.includes('mail') ||
    lower.includes('provider') ||
    lower.includes('ses') ||
    lower.includes('sendgrid')
  ) {
    return { label: 'Email provider rejected some deliveries', detail: text };
  }
  if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('unauthorized')) {
    return { label: 'Not authorized to send this campaign', detail: text };
  }

  // Already human-readable enough — keep it, but cap length for the row.
  const short = text.length > 90 ? `${text.slice(0, 87)}…` : text;
  return { label: short, detail: text.length > 90 ? text : undefined };
}

function formatFilterValue(
  row: EmailBroadcastFilterPayload,
  defLabel: string,
  opLabel: string,
): string {
  const value = row.value;
  if (row.op === 'never' || value === null || value === undefined) {
    return `${defLabel}: ${opLabel.toLowerCase()}`;
  }
  if (Array.isArray(value)) {
    return `${defLabel} ${opLabel.toLowerCase()} ${value.join(' – ')}`;
  }
  return `${defLabel} ${opLabel.toLowerCase()} ${String(value)}`;
}

/** Format the new { field, op, value } filter rows into a readable summary. */
export function formatEmailBroadcastFilters(
  filters: EmailBroadcastFilterPayload[] | null | undefined,
  match: 'all' | 'any' | null | undefined,
): string {
  if (!Array.isArray(filters) || filters.length === 0) return '';
  const prefix = match === 'any' ? 'Any condition · ' : 'All conditions · ';
  const parts = filters.map((row) => {
    const def = getFilterFieldDef(row.field as EmailCampaignFilterField);
    const defLabel = def?.label || row.field;
    const opLabel =
      EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS[row.op as EmailCampaignFilterOperator] || row.op;
    return formatFilterValue(row, defLabel, opLabel);
  });
  return `${prefix}${parts.join(' · ')}`;
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
  // New backend: filter rows first.
  if (criteria && 'filters' in criteria) {
    const filterSummary = formatEmailBroadcastFilters(
      criteria.filters as EmailBroadcastFilterPayload[] | null | undefined,
      criteria.filter_match,
    );
    if (filterSummary) return filterSummary;
  }

  // Legacy backend: flat deposit / SSN / state criteria.
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
