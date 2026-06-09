/** Calendar date in the user's local timezone (YYYY-MM-DD). Never use toISOString().split('T')[0] for this — it shifts the day across UTC boundaries. */
export function formatLocalCalendarDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD as a local calendar date (no UTC shift). */
export function parseYmdLocal(ymd: string): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Local calendar start/end strings for named presets (aligned with analytics dashboard). */
export function getDateRange(preset: string): { start: string; end: string } {
  const today = new Date();
  let end = new Date(today);
  end.setHours(23, 59, 59, 999);

  let start = new Date(today);

  switch (preset) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      break;
    case 'yesterday':
      start = new Date(today);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case 'last_3_months':
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
      break;
    default:
      start.setMonth(start.getMonth() - 3);
      start.setHours(0, 0, 0, 0);
  }

  return {
    start: formatLocalCalendarDate(start),
    end: formatLocalCalendarDate(end),
  };
}
