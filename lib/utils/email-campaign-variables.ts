import { EMAIL_BROADCAST_PLACEHOLDER_KEYS } from '@/lib/constants/email-broadcasts';
import { emailPlaceholderToken } from '@/lib/constants/email-templates';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Marketing campaigns must include an unsubscribe link. */
export const EMAIL_CAMPAIGN_REQUIRED_VARIABLES = ['unsubscribe_url'] as const;

/** Return placeholder keys used in HTML that are not in the allowed broadcast set. */
export function findUnsupportedEmailVariables(html: string): string[] {
  const allowed = new Set<string>(EMAIL_BROADCAST_PLACEHOLDER_KEYS);
  const found = new Set<string>();
  for (const match of html.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1];
    if (key && !allowed.has(key)) {
      found.add(key);
    }
  }
  return Array.from(found).sort();
}

/** Return required marketing placeholders that are missing from the HTML body. */
export function findMissingRequiredEmailVariables(html: string): string[] {
  const present = new Set<string>();
  for (const match of html.matchAll(PLACEHOLDER_PATTERN)) {
    if (match[1]) present.add(match[1]);
  }
  return EMAIL_CAMPAIGN_REQUIRED_VARIABLES.filter((key) => !present.has(key));
}

export function formatMissingRequiredEmailVariables(keys: string[]): string {
  if (keys.length === 0) return '';
  const tokens = keys.map((key) => emailPlaceholderToken(key)).join(', ');
  return `Missing required variable${keys.length === 1 ? '' : 's'}: ${tokens}.`;
}
