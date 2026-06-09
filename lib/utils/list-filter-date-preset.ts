import { getDateRange } from '@/lib/utils/calendar-date-range';

/** Select options: same periods as analytics; empty string = no date restriction. */
export const LIST_DATE_PRESET_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_30_days', label: 'Last 30 days' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom range' },
];

const MATCH_PRESETS = [
  'today',
  'yesterday',
  'this_month',
  'last_month',
  'last_30_days',
  'last_3_months',
] as const;

/** Maps applied date_from/date_to back to a preset label for the UI (best-effort). */
export function inferListDatePreset(dateFrom: string, dateTo: string): string {
  const from = dateFrom.trim();
  const to = dateTo.trim();
  if (!from && !to) return '';
  if (!from || !to) return 'custom';

  for (const preset of MATCH_PRESETS) {
    const { start, end } = getDateRange(preset);
    if (start === from && end === to) return preset;
  }
  return 'custom';
}

export type ListFilterDateFields = {
  date_preset: string;
  date_from: string;
  date_to: string;
};

/** Updates date preset / from / to consistently for list filters (history & processing). */
export function applyListDateFilterChange<T extends ListFilterDateFields>(
  previous: T,
  key: keyof T & string,
  value: string,
): T {
  if (key === 'date_preset') {
    if (value === '') {
      return { ...previous, date_preset: '', date_from: '', date_to: '' };
    }
    if (value === 'custom') {
      return { ...previous, date_preset: 'custom' };
    }
    const r = getDateRange(value);
    return {
      ...previous,
      date_preset: value,
      date_from: r.start,
      date_to: r.end,
    };
  }
  if (key === 'date_from') {
    const date_from = value;
    const date_preset = inferListDatePreset(date_from, previous.date_to);
    return { ...previous, date_from, date_preset };
  }
  if (key === 'date_to') {
    const date_to = value;
    const date_preset = inferListDatePreset(previous.date_from, date_to);
    return { ...previous, date_to, date_preset };
  }
  return previous;
}
