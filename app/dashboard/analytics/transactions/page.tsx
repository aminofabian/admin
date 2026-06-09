'use client';

import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { Select, DateSelect } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import type { AnalyticsFilters } from '@/lib/api/analytics';
import { TransactionAnalyticsBody } from '@/components/analytics/transaction-analytics-body';

import {
  US_STATES,
  getDateRange,
  buildAnalyticsFiltersWithDatePreset,
  describeAnalyticsFilterRange,
} from '../analytics-utils';
import { useUserIanaTimezone } from '@/hooks/use-user-iana-timezone';

export default function TransactionAnalyticsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [username, setUsername] = useState('');
  const [state, setState] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [showFilters, setShowFilters] = useState(true);
  const timezone = useUserIanaTimezone();

  useEffect(() => {
    const range = getDateRange(datePreset);
    setStartDate(range.start);
    setEndDate(range.end);
  }, [datePreset]);

  const filters = useMemo((): AnalyticsFilters | undefined => {
    if (timezone === null) return undefined;
    return buildAnalyticsFiltersWithDatePreset({
      datePreset,
      startDate,
      endDate,
      timezone,
      username,
      state,
      gender,
    });
  }, [datePreset, startDate, endDate, timezone, username, state, gender]);

  useEffect(() => {
    if (user && user.role !== USER_ROLES.COMPANY) router.replace('/dashboard');
  }, [user, router]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = getDateRange(preset);
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  const handleClearFilters = () => {
    setDatePreset('today');
    const range = getDateRange('today');
    setStartDate(range.start);
    setEndDate(range.end);
    setUsername('');
    setState('');
    setGender('');
  };

  const hasActiveFilters = username || state || gender || datePreset !== 'today';
  const filterRangeCaption = describeAnalyticsFilterRange(datePreset, startDate, endDate, timezone);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Transactions</h1>
        </div>
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
              <button onClick={handleClearFilters} className="text-[10px] font-medium text-rose-500 hover:text-rose-600 transition-colors">clear</button>
            )}
          </div>
          <div className="flex-1 grid gap-2 grid-cols-2 lg:grid-cols-4">
            <Select
              value={datePreset}
              onChange={(v: string) => handlePresetChange(v)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'last_30_days', label: 'Last 30 Days' },
                { value: 'last_3_months', label: 'Last 3 Months' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-sm text-gray-900 dark:text-slate-100 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
            <Select value={state} onChange={(v: string) => setState(v)} options={US_STATES} placeholder="All States" />
            <Select
              value={gender}
              onChange={(v: string) => setGender(v as 'male' | 'female' | '')}
              options={[{ value: '', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
              placeholder="Gender"
            />
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
  );
}
