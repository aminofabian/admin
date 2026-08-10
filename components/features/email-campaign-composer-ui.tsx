'use client';

import type { ReactNode } from 'react';

export function ComposerSection({
  step,
  title,
  description,
  children,
  className = '',
}: {
  step?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-700/80 dark:bg-gray-800 ${className}`}
    >
      <div className="border-b border-gray-100 px-4 py-3.5 sm:px-5 dark:border-gray-700/80">
        <div className="flex items-start gap-3">
          {step ? (
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#6366f1]/10 text-[11px] font-semibold text-[#4f46e5] dark:bg-[#6366f1]/20 dark:text-[#a5b4fc]">
              {step}
            </span>
          ) : null}
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
    </section>
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
    <div className="mb-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-800 dark:text-gray-100"
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
}: {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'muted';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
        ? 'text-amber-600 dark:text-amber-400'
        : tone === 'muted'
          ? 'text-gray-500 dark:text-gray-400'
          : 'text-gray-900 dark:text-gray-50';

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900/40">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

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
    <div className={`rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${styles}`}>
      {children}
    </div>
  );
}
