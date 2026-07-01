/**
 * Normalize user-entered balance/entries for Django Decimal fields on game-action complete.
 * Strips currency formatting ($, commas) and rejects invalid numeric strings.
 */
export function sanitizeGameActionNumericInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[$,\s]/g, '');
  if (!cleaned || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;

  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;

  return cleaned;
}

/** Entries are whole numbers on sweepstakes-style game dashboards. */
export function sanitizeGameActionEntriesInput(raw: string): string | null {
  const numeric = sanitizeGameActionNumericInput(raw);
  if (numeric === null) return null;

  if (!numeric.includes('.')) return numeric;

  const asInt = Math.trunc(Number.parseFloat(numeric));
  return Number.isFinite(asInt) ? String(asInt) : null;
}
