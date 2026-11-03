'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  formatLocalCalendarDate,
  parseYmdLocal,
} from '@/lib/utils/calendar-date-range';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_LABEL = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
const SHORT_DATE = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBeforeDay(a: Date, b: Date): boolean {
  const ad = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bd = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return ad < bd;
}

function isInRange(day: Date, start: Date | null, end: Date | null): boolean {
  if (!start || !end) return false;
  const t = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return t > s && t < e;
}

function buildMonthGrid(month: Date): (Date | null)[] {
  const first = startOfMonth(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const startWeekday = first.getDay();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function formatTriggerLabel(start: string, end: string): string {
  const startDate = parseYmdLocal(start);
  const endDate = parseYmdLocal(end);
  if (startDate && endDate) {
    return `${SHORT_DATE.format(startDate)} – ${SHORT_DATE.format(endDate)}`;
  }
  if (startDate) return `${SHORT_DATE.format(startDate)} – Select end`;
  return 'Select start & end dates';
}

export interface DateRangePickerProps {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DateRangePicker({
  start,
  end,
  onChange,
  disabled = false,
  className = '',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const parsed = parseYmdLocal(start) ?? parseYmdLocal(end) ?? new Date();
    return startOfMonth(parsed);
  });
  const [draftStart, setDraftStart] = useState<Date | null>(() => parseYmdLocal(start));
  const [draftEnd, setDraftEnd] = useState<Date | null>(() => parseYmdLocal(end));
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hoverDay, setHoverDay] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setDraftStart(parseYmdLocal(start));
    setDraftEnd(parseYmdLocal(end));
    setSelecting(start && end ? 'start' : start ? 'end' : 'start');
    const anchor = parseYmdLocal(start) ?? parseYmdLocal(end) ?? new Date();
    setVisibleMonth(startOfMonth(anchor));
    setHoverDay(null);
  }, [open, start, end]);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelWidth = panel?.offsetWidth ?? 560;
    const panelHeight = panel?.offsetHeight ?? 360;
    const gap = 6;
    const pad = 8;

    let left = rect.left;
    if (left + panelWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - panelWidth - pad);
    }

    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const openAbove = spaceBelow < panelHeight && rect.top > spaceBelow;
    const top = openAbove
      ? Math.max(pad, rect.top - panelHeight - gap)
      : rect.bottom + gap;

    setPanelPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }

    updatePanelPosition();
    const frameId = requestAnimationFrame(updatePanelPosition);
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const previewEnd = useMemo(() => {
    if (selecting === 'end' && draftStart && !draftEnd && hoverDay) {
      return hoverDay;
    }
    return draftEnd;
  }, [selecting, draftStart, draftEnd, hoverDay]);

  const applyRange = useCallback(
    (from: Date, to: Date) => {
      const startDay = isBeforeDay(to, from) ? to : from;
      const endDay = isBeforeDay(to, from) ? from : to;
      onChange(formatLocalCalendarDate(startDay), formatLocalCalendarDate(endDay));
      setOpen(false);
    },
    [onChange],
  );

  const handleDayClick = useCallback(
    (day: Date) => {
      if (selecting === 'start' || !draftStart || (draftStart && draftEnd)) {
        setDraftStart(day);
        setDraftEnd(null);
        setSelecting('end');
        return;
      }

      const from = draftStart;
      const to = day;
      setDraftEnd(isBeforeDay(to, from) ? from : to);
      setDraftStart(isBeforeDay(to, from) ? to : from);
      setSelecting('start');
      applyRange(from, to);
    },
    [selecting, draftStart, draftEnd, applyRange],
  );

  const months = [visibleMonth, addMonths(visibleMonth, 1)];

  const triggerLabel = formatTriggerLabel(start, end);
  const hasValue = Boolean(start && end);

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full min-w-[220px] items-center gap-2 rounded-lg border bg-white px-2.5 py-2 text-left text-sm shadow-sm transition-all dark:bg-slate-950 ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20 dark:border-blue-500 dark:ring-blue-500/30'
            : 'border-gray-300 dark:border-gray-700'
        } ${disabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-600'}`}
      >
        <svg
          className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span
          className={`min-w-0 flex-1 truncate ${
            hasValue
              ? 'text-gray-900 dark:text-slate-100'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {triggerLabel}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-gray-400 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {mounted &&
        open &&
        panelPos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Select date range"
            className="fixed z-[80] w-[min(560px,calc(100vw-16px))] rounded-xl border border-gray-200 bg-white p-3 shadow-xl ring-1 ring-black/5 dark:border-gray-700 dark:bg-slate-950 dark:ring-white/10"
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selecting === 'start' || !draftStart
                  ? 'Select start date'
                  : 'Select end date'}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setVisibleMonth((m) => addMonths(m, -1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                  aria-label="Previous month"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibleMonth((m) => addMonths(m, 1))}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                  aria-label="Next month"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {months.map((month) => {
                const cells = buildMonthGrid(month);
                const rangeFrom =
                  draftStart && previewEnd
                    ? isBeforeDay(previewEnd, draftStart)
                      ? previewEnd
                      : draftStart
                    : draftStart;
                const rangeTo =
                  draftStart && previewEnd
                    ? isBeforeDay(previewEnd, draftStart)
                      ? draftStart
                      : previewEnd
                    : null;

                return (
                  <div key={`${month.getFullYear()}-${month.getMonth()}`}>
                    <p className="mb-2 px-1 text-center text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {MONTH_LABEL.format(month)}
                    </p>
                    <div className="mb-1 grid grid-cols-7 gap-0.5">
                      {WEEKDAYS.map((d) => (
                        <div
                          key={d}
                          className="py-1 text-center text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500"
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {cells.map((day, idx) => {
                        if (!day) {
                          return <div key={`empty-${idx}`} className="h-9" />;
                        }

                        const isStart = rangeFrom ? sameDay(day, rangeFrom) : false;
                        const isEnd = rangeTo ? sameDay(day, rangeTo) : false;
                        const inMiddle =
                          rangeFrom && rangeTo ? isInRange(day, rangeFrom, rangeTo) : false;
                        const isEndpoint = isStart || isEnd;
                        const isToday = sameDay(day, new Date());
                        const isSingleDay = isStart && isEnd;

                        return (
                          <button
                            key={formatLocalCalendarDate(day)}
                            type="button"
                            onClick={() => handleDayClick(day)}
                            onMouseEnter={() => setHoverDay(day)}
                            onMouseLeave={() => setHoverDay(null)}
                            className={[
                              'relative h-9 w-full text-sm transition-colors',
                              inMiddle
                                ? 'rounded-none bg-blue-50 text-blue-900 dark:bg-blue-950/50 dark:text-blue-100'
                                : '',
                              isEndpoint
                                ? 'bg-blue-600 font-semibold text-white hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-500'
                                : !inMiddle
                                  ? 'text-gray-900 hover:bg-gray-100 dark:text-slate-100 dark:hover:bg-slate-800'
                                  : '',
                              isSingleDay || (isEndpoint && !rangeTo)
                                ? 'rounded-lg'
                                : isStart
                                  ? 'rounded-l-lg rounded-r-none'
                                  : isEnd
                                    ? 'rounded-r-lg rounded-l-none'
                                    : !inMiddle
                                      ? 'rounded-lg'
                                      : '',
                              isToday && !isEndpoint
                                ? 'ring-1 ring-inset ring-blue-400/60 dark:ring-blue-400/40'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {day.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                {draftStart && previewEnd
                  ? `${SHORT_DATE.format(
                      isBeforeDay(previewEnd, draftStart) ? previewEnd : draftStart,
                    )} – ${SHORT_DATE.format(
                      isBeforeDay(previewEnd, draftStart) ? draftStart : previewEnd,
                    )}`
                  : draftStart
                    ? `${SHORT_DATE.format(draftStart)} – …`
                    : 'Click a start date, then an end date'}
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
