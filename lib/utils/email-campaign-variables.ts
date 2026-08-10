import { EMAIL_BROADCAST_PLACEHOLDER_KEYS } from '@/lib/constants/email-broadcasts';

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

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
