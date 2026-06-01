'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { Select, DateSelect } from '@/components/ui';
import {
  getDateRange,
  buildAnalyticsFiltersWithDatePreset,
  describeAnalyticsFilterRange,
} from '@/app/dashboard/analytics/analytics-utils';
import { useUserIanaTimezone } from '@/hooks/use-user-iana-timezone';
import { TransactionAnalyticsBody } from './transaction-analytics-body';

const DATE_PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'custom', label: 'Custom Range' },
];

const DEFAULT_DATE_PRESET = 'last_3_months';

interface PlayerTransactionAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export function PlayerTransactionAnalyticsModal({
  isOpen,
  onClose,
  username,
}: PlayerTransactionAnalyticsModalProps) {
  const [datePreset, setDatePreset] = useState(DEFAULT_DATE_PRESET);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(true);
  const timezone = useUserIanaTimezone();

  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  const filters = useMemo((): AnalyticsFilters | undefined => {
    const trimmed = username?.trim();
    if (!trimmed || timezone === null) return undefined;
    return buildAnalyticsFiltersWithDatePreset({
      datePreset,
      startDate,
      endDate,
      timezone,
      username: trimmed,
    });
  }, [username, timezone, datePreset, startDate, endDate]);

  const filterRangeCaption = describeAnalyticsFilterRange(datePreset, startDate, endDate, timezone);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset(DEFAULT_DATE_PRESET);
    const range = getDateRange(DEFAULT_DATE_PRESET);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const hasActiveFilters = datePreset !== DEFAULT_DATE_PRESET;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-6">
        <div className="relative h-[92vh] w-full max-w-7xl overflow-hidden rounded-2xl border border-border/30 bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border/20 px-4 py-3 sm:px-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Player Transaction Analytics</h2>
              <p className="text-xs text-muted-foreground">Locked to username: {username}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              aria-label="Close analytics modal"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="h-[calc(92vh-64px)] overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div />
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    showFilters
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                  </svg>
                  Filters
                  {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </button>
              </div>

              {showFilters && (
                <div className="relative z-20 flex items-center gap-2.5 rounded-lg border border-border/40 bg-card px-3 py-2 shadow-sm flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Filters</span>
                    {hasActiveFilters && (
                      <button onClick={handleClearFilters} className="text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors">
                        clear
                      </button>
                    )}
                  </div>
                  <div className="flex-1 grid gap-2 grid-cols-1 sm:grid-cols-2">
                    <Select
                      value={datePreset}
                      onChange={(v: string) => handlePresetChange(v)}
                      options={DATE_PRESET_OPTIONS}
                    />
                    <div className="relative">
                      <input
                        type="text"
                        value={username}
                        disabled
                        placeholder="Username"
                        className="w-full cursor-not-allowed rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-2 pr-9 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-slate-900 dark:text-slate-300"
                      />
                      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 10-8 0v4M5 11h14v10H5V11z" />
                      </svg>
                    </div>
                  </div>
                  {datePreset === 'custom' && (
                    <div className="grid grid-cols-2 gap-2 mt-2 max-w-xs w-full lg:w-auto lg:mt-0">
                      <DateSelect label="Start" value={startDate} onChange={setStartDate} />
                      <DateSelect label="End" value={endDate} onChange={setEndDate} />
                    </div>
                  )}
                </div>
              )}

              <TransactionAnalyticsBody filters={filters} filterRangeCaption={filterRangeCaption} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
