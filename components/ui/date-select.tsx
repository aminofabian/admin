'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => String(currentYear - i));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

function parseDate(value: string): { month: string; day: string; year: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { month: '', day: '', year: '' };
  }
  const [y, m, d] = value.split('-');
  return {
    month: m || '',
    day: d ? String(parseInt(d, 10)) : '',
    year: y || '',
  };
}

function buildDate(month: string, day: string, year: string): string {
  if (!month || !day || !year) return '';
  const m = month.padStart(2, '0');
  const d = day.padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export interface DateSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
}

export function DateSelect({
  value,
  onChange,
  error,
  disabled = false,
  label = 'Date',
}: DateSelectProps) {
  const parsed = parseDate(value);
  const [openPicker, setOpenPicker] = useState<'month' | 'day' | 'year' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [local, setLocal] = useState({ month: parsed.month, day: parsed.day, year: parsed.year });

  useEffect(() => {
    setLocal({ month: parsed.month, day: parsed.day, year: parsed.year });
  }, [value]);

  const month = local.month;
  const day = local.day;
  const year = local.year;

  const monthLabel = month ? MONTHS[parseInt(month, 10) - 1] : '';
  const dayLabel = day || '';
  const yearLabel = year || '';

  const handleMonthSelect = useCallback(
    (monthIndex: number) => {
      const m = String(monthIndex + 1).padStart(2, '0');
      setLocal((prev) => ({ ...prev, month: m }));
      const full = buildDate(m, day.padStart(2, '0'), year);
      if (full) onChange(full);
      setOpenPicker(null);
    },
    [day, year, onChange],
  );

  const handleDaySelect = useCallback(
    (d: string) => {
      setLocal((prev) => ({ ...prev, day: d }));
      const full = buildDate(month.padStart(2, '0'), d.padStart(2, '0'), year);
      if (full) onChange(full);
      setOpenPicker(null);
    },
    [month, year, onChange],
  );

  const handleYearSelect = useCallback(
    (y: string) => {
      setLocal((prev) => ({ ...prev, year: y }));
      const full = buildDate(month.padStart(2, '0'), day.padStart(2, '0'), y);
      if (full) onChange(full);
      setOpenPicker(null);
    },
    [month, day, onChange],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPicker(null);
      }
    };
    if (openPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openPicker]);

  const baseFieldClass =
    'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 text-left text-sm transition-all duration-150';
  const inactiveBorder = 'border-gray-300 dark:border-gray-700';
  const activeBorder = 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/30';
  const fieldContentClass = 'flex-1 min-w-0 truncate text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-gray-400';

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Header with calendar icon */}
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span className="text-xs font-medium uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {label}
        </span>
      </div>

      {/* Three horizontal fields + full-width dropdown row */}
      <div className="relative grid grid-cols-3 gap-2">
        {/* Month */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Month
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenPicker(openPicker === 'month' ? null : 'month')}
            className={`${baseFieldClass} ${openPicker === 'month' ? activeBorder : inactiveBorder} ${
              disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            }`}
          >
            <span className={fieldContentClass}>{monthLabel || 'Month'}</span>
            <span className="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden />
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${openPicker === 'month' ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Day */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Day
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenPicker(openPicker === 'day' ? null : 'day')}
            className={`${baseFieldClass} ${openPicker === 'day' ? activeBorder : inactiveBorder} ${
              disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            }`}
          >
            <span className={fieldContentClass}>{dayLabel || 'Day'}</span>
            <span className="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden />
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${openPicker === 'day' ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Year */}
        <div>
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Year
          </p>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setOpenPicker(openPicker === 'year' ? null : 'year')}
            className={`${baseFieldClass} ${openPicker === 'year' ? activeBorder : inactiveBorder} ${
              disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
            }`}
          >
            <span className={fieldContentClass}>{yearLabel || 'Year'}</span>
            <span className="h-4 w-px shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden />
            <svg
              className={`h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${openPicker === 'year' ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Full-width dropdown panel (spans entire Month + Day + Year row) */}
        {openPicker && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 w-full min-w-0 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 p-3 shadow-lg ring-1 ring-black ring-opacity-5">
            {openPicker === 'month' && (
              <div className="grid grid-cols-3 gap-2">
                {MONTHS.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => handleMonthSelect(i)}
                    className={`rounded-lg px-3 py-2.5 text-center text-sm transition-colors ${
                      month === String(i + 1).padStart(2, '0')
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
            {openPicker === 'day' && (
              <div className="grid grid-cols-5 gap-2 max-h-64 overflow-auto">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDaySelect(d)}
                    className={`rounded-lg px-3 py-2.5 text-center text-sm transition-colors ${
                      day === d
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
            {openPicker === 'year' && (
              <div className="grid grid-cols-4 gap-2 max-h-64 overflow-auto">
                {YEARS.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => handleYearSelect(y)}
                    className={`rounded-lg px-3 py-2.5 text-center text-sm transition-colors ${
                      year === y
                        ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100 font-medium'
                        : 'text-gray-900 dark:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
