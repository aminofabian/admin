import { US_STATES } from '@/components/dashboard/players/players-filters';

function normalizeStateKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s._-]+/g, '');
}

const stateCodeByKey = new Map<string, string>();

for (const state of US_STATES) {
  stateCodeByKey.set(state.value.toUpperCase(), state.value);
  stateCodeByKey.set(normalizeStateKey(state.label), state.value);
  stateCodeByKey.set(normalizeStateKey(state.value), state.value);
}

const LEGACY_STATE_ALIASES: Record<string, string> = {
  newyork: 'NY',
};

/** Map saved state values (full name, code, or legacy variants) to a US state code. */
export function normalizeUsStateCode(state: string | null | undefined): string {
  const trimmed = state?.trim();
  if (!trimmed) return '';

  const upper = trimmed.toUpperCase();
  const byCode = stateCodeByKey.get(upper);
  if (byCode) return byCode;

  const normalized = normalizeStateKey(trimmed);
  const byLabel = stateCodeByKey.get(normalized);
  if (byLabel) return byLabel;

  const legacy = LEGACY_STATE_ALIASES[normalized];
  if (legacy) return legacy;

  return '';
}

export function getUsStateLabel(code: string | null | undefined): string | null {
  const normalized = normalizeUsStateCode(code);
  if (!normalized) return null;
  return US_STATES.find((state) => state.value === normalized)?.label ?? null;
}
