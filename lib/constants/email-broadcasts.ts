import type { EmailBroadcastAudience, EmailBroadcastStatus } from '@/types';
import {
  EMAIL_TEMPLATE_VARIABLES,
  type EmailTemplateVariable,
} from './email-templates';

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
    value: 'whitelabel',
    label: 'Whitelabel project',
    description: 'Eligible players for a specific project',
  },
  {
    value: 'selected',
    label: 'Selected players',
    description: 'Only the player IDs you choose',
  },
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
