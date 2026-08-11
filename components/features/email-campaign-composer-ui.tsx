'use client';

import type { ReactNode } from 'react';

export function ComposerAlert({
  tone = 'error',
  children,
}: {
  tone?: 'error' | 'warning' | 'info';
  children: ReactNode;
}) {
  const styles =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
      : tone === 'info'
        ? 'border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200'
        : 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';

  return (
    <div className={`rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}

export function ComposerFieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-gray-700 dark:text-gray-200"
      >
        {children}
      </label>
      {hint ? <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p> : null}
    </div>
  );
}

export function ComposerMetric({
  label,
  value,
  tone = 'default',
  size = 'sm',
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'muted';
  size?: 'sm' | 'lg';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'muted'
          ? 'text-gray-500 dark:text-gray-400'
          : 'text-gray-900 dark:text-gray-50';

  const isLg = size === 'lg';

  return (
    <div
      className={`border border-gray-200/80 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/40 ${
        isLg ? 'rounded-xl px-4 py-4' : 'rounded-lg px-3 py-2.5'
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-0.5 font-semibold tabular-nums ${valueClass} ${isLg ? 'text-2xl' : 'text-base'}`}>
        {value}
      </p>
    </div>
  );
}

/** Compact card used for the active compose panel. */
export function ComposerPanel({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/80">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

/** Kept for review screen + tests that mock ComposerSection. */
export function ComposerSection({
  step,
  title,
  description,
  completed = false,
  id,
  children,
  className = '',
}: {
  step?: string;
  title: string;
  description?: string;
  completed?: boolean;
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800 ${className}`}
    >
      <div className="border-b border-gray-100 px-4 py-2.5 dark:border-gray-700/80">
        <div className="flex items-center gap-2.5">
          {step ? (
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                completed
                  ? 'bg-[#6366f1] text-white'
                  : 'bg-[#6366f1]/10 text-[#4f46e5] dark:bg-[#6366f1]/20 dark:text-[#a5b4fc]'
              }`}
            >
              {completed ? '✓' : step}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-[13px] font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-4 py-3.5">{children}</div>
    </section>
  );
}

export function ReadinessItem({
  label,
  done,
  detail,
}: {
  label: string;
  done: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
          done
            ? 'bg-emerald-500 text-white'
            : 'border border-gray-300 text-transparent dark:border-gray-600'
        }`}
      >
        ✓
      </span>
      <div className="min-w-0">
        <p
          className={`text-xs font-medium ${
            done ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {label}
        </p>
        {detail ? <p className="mt-0.5 truncate text-[10px] text-gray-400">{detail}</p> : null}
      </div>
    </div>
  );
}

export function ExcludedPlayersSample({
  rows,
  emptyLabel = 'No excluded sample available',
}: {
  rows?: { user_id: number; username: string; email: string; reason: string }[];
  emptyLabel?: string;
}) {
  if (!rows || rows.length === 0) {
    return <p className="text-[11px] text-gray-500 dark:text-gray-400">{emptyLabel}</p>;
  }

  return (
    <ul className="max-h-36 overflow-auto divide-y divide-amber-200/70 dark:divide-amber-900/40">
      {rows.map((row) => (
        <li key={`${row.user_id}-${row.reason}`} className="flex items-start justify-between gap-3 py-1.5 text-[11px]">
          <span className="min-w-0">
            <span className="font-medium text-amber-900 dark:text-amber-100">{row.username}</span>
            <span className="mt-0.5 block truncate text-amber-800/80 dark:text-amber-200/70">
              {row.email || 'No email'}
            </span>
          </span>
          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
            {row.reason}
          </span>
        </li>
      ))}
    </ul>
  );
}
