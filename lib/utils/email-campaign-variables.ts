import { EMAIL_BROADCAST_PLACEHOLDER_KEYS } from '@/lib/constants/email-broadcasts';
import { emailPlaceholderToken } from '@/lib/constants/email-templates';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/** Marketing campaigns must include an unsubscribe link. */
export const EMAIL_CAMPAIGN_REQUIRED_VARIABLES = ['unsubscribe_url'] as const;

function allowedSet(allowed?: readonly string[] | null): Set<string> {
  return new Set<string>(
    allowed && allowed.length > 0 ? allowed : EMAIL_BROADCAST_PLACEHOLDER_KEYS,
  );
}

/** Return placeholder keys used in text that are not in the allowed broadcast set. */
export function findUnsupportedEmailVariables(
  text: string,
  allowed?: readonly string[] | null,
): string[] {
  const allowedKeys = allowedSet(allowed);
  const found = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    const key = match[1];
    if (key && !allowedKeys.has(key)) {
      found.add(key);
    }
  }
  return Array.from(found).sort();
}

/** Check subject and body. Unsupported names return 400 unsupported_variables on create/send. */
export function findUnsupportedCampaignVariables(
  subject: string,
  html: string,
  allowed?: readonly string[] | null,
): string[] {
  return Array.from(
    new Set([
      ...findUnsupportedEmailVariables(subject, allowed),
      ...findUnsupportedEmailVariables(html, allowed),
    ]),
  ).sort();
}

export function formatUnsupportedVariablesMessage(keys: string[]): string {
  if (keys.length === 0) return '';
  return `Unsupported variables: ${keys.map((key) => emailPlaceholderToken(key)).join(', ')}.`;
}

export function extractUnsupportedVariableKeys(error: unknown): string[] {
  if (!error || typeof error !== 'object') return [];
  const record = error as Record<string, unknown>;
  const raw = record.unsupported_variables ?? record.unsupportedVariables;
  if (!Array.isArray(raw)) return [];
  return raw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export function isUnsupportedVariablesError(error: unknown): boolean {
  if (extractUnsupportedVariableKeys(error).length > 0) return true;
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const code = typeof record.code === 'string' ? record.code : '';
  const blob = [record.message, record.detail, record.error, record.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase();
  return code === 'unsupported_variables' || blob.includes('unsupported_variable');
}

export function unsupportedVariablesErrorMessage(error: unknown, fallback: string): string {
  const keys = extractUnsupportedVariableKeys(error);
  if (keys.length > 0) return formatUnsupportedVariablesMessage(keys);
  if (isUnsupportedVariablesError(error)) {
    if (error && typeof error === 'object') {
      const record = error as { message?: unknown; detail?: unknown };
      for (const value of [record.message, record.detail]) {
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }
    return 'This campaign uses variables that are not allowed.';
  }
  return fallback;
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
