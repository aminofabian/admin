/** API snake_case (or dotted paths) → Title Case With Spaces for display. */
export function apiFieldLabel(apiKey: string): string {
  return apiKey
    .split(/[._]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function rateColor(rate: number | undefined): string {
  if (!rate) return 'text-muted-foreground';
  if (rate >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (rate >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-rose-600 dark:text-rose-400';
}

export function fmtPaymentMethod(n: string): string {
  return n.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
