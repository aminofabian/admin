'use client';

import { Button, Select, DateSelect } from '@/components/ui';
import {
  applyListDateFilterChange,
  LIST_DATE_PRESET_OPTIONS,
} from '@/lib/utils/list-filter-date-preset';

export interface MetaCapiEventsFiltersState {
  search: string;
  event_name: string;
  status: string;
  username: string;
  user_id: string;
  event_id: string;
  source_transaction_id: string;
  pixel_id: string;
  date_preset: string;
  date_from: string;
  date_to: string;
  ordering: string;
}

export type MetaCapiEventsFilterKey = keyof MetaCapiEventsFiltersState;

export const EMPTY_META_CAPI_FILTERS: MetaCapiEventsFiltersState = {
  search: '',
  event_name: '',
  status: '',
  username: '',
  user_id: '',
  event_id: '',
  source_transaction_id: '',
  pixel_id: '',
  date_preset: '',
  date_from: '',
  date_to: '',
  ordering: '-created',
};

const EVENT_NAME_OPTIONS = [
  { value: '', label: 'All events' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'CompleteRegistration', label: 'Complete Registration' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'queued', label: 'Queued' },
  { value: 'sending', label: 'Sending' },
  { value: 'retrying', label: 'Retrying' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'sent,failed', label: 'Sent + Failed' },
];

const ORDERING_OPTIONS = [
  { value: '-created', label: 'Newest first' },
  { value: 'created', label: 'Oldest first' },
  { value: '-event_time', label: 'Event time ↓' },
  { value: 'event_time', label: 'Event time ↑' },
  { value: 'status', label: 'Status A–Z' },
  { value: '-status', label: 'Status Z–A' },
];

const FILTER_ICON = (
  <svg className="w-5 h-5 text-muted-foreground transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

interface MetaCapiEventsFiltersProps {
  filters: MetaCapiEventsFiltersState;
  onFilterChange: (key: MetaCapiEventsFilterKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}

export function MetaCapiEventsFilters({
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
  isLoading = false,
}: MetaCapiEventsFiltersProps) {
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-medium text-muted-foreground mb-1.5 transition-colors dark:text-slate-400';
  const sectionHeadingClasses =
    'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2 dark:text-slate-400';

  const handleDatePresetChange = (preset: string) => {
    const next = applyListDateFilterChange(
      {
        date_preset: filters.date_preset,
        date_from: filters.date_from,
        date_to: filters.date_to,
      },
      'date_preset',
      preset,
    );
    onFilterChange('date_preset', next.date_preset);
    onFilterChange('date_from', next.date_from);
    onFilterChange('date_to', next.date_to);
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border dark:border-slate-700/80">
        <h3 className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
        >
          {isOpen ? 'Hide' : 'Show'}
        </Button>
      </div>

      {isOpen && (
        <div className="p-4 text-foreground space-y-6">
          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Search
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClasses}>Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => onFilterChange('search', e.target.value)}
                  placeholder="Event ID, username, email, pixel…"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Username</label>
                <input
                  type="text"
                  value={filters.username}
                  onChange={(e) => onFilterChange('username', e.target.value)}
                  placeholder="Partial match"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>User ID</label>
                <input
                  type="text"
                  value={filters.user_id}
                  onChange={(e) => onFilterChange('user_id', e.target.value)}
                  placeholder="Player id"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Event ID</label>
                <input
                  type="text"
                  value={filters.event_id}
                  onChange={(e) => onFilterChange('event_id', e.target.value)}
                  placeholder="Exact event_id"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Source transaction ID</label>
                <input
                  type="text"
                  value={filters.source_transaction_id}
                  onChange={(e) => onFilterChange('source_transaction_id', e.target.value)}
                  placeholder="Deposit txn id"
                  className={inputClasses}
                />
              </div>
              <div>
                <label className={labelClasses}>Pixel ID</label>
                <input
                  type="text"
                  value={filters.pixel_id}
                  onChange={(e) => onFilterChange('pixel_id', e.target.value)}
                  placeholder="Exact pixel_id"
                  className={inputClasses}
                />
              </div>
            </div>
          </section>

          <section>
            <h4 className={sectionHeadingClasses}>
              <span className="w-1 h-4 rounded-full bg-primary/60" aria-hidden />
              Filters
            </h4>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClasses}>Event name</label>
                <Select
                  value={filters.event_name}
                  onChange={(v) => onFilterChange('event_name', v)}
                  options={EVENT_NAME_OPTIONS}
                  placeholder="All events"
                />
              </div>
              <div>
                <label className={labelClasses}>Status</label>
                <Select
                  value={filters.status}
                  onChange={(v) => onFilterChange('status', v)}
                  options={STATUS_OPTIONS}
                  placeholder="All statuses"
                />
              </div>
              <div>
                <label className={labelClasses}>Ordering</label>
                <Select
                  value={filters.ordering || '-created'}
                  onChange={(v) => onFilterChange('ordering', v)}
                  options={ORDERING_OPTIONS}
                />
              </div>
              <div>
                <label className={labelClasses}>Date range</label>
                <Select
                  value={filters.date_preset}
                  onChange={handleDatePresetChange}
                  options={LIST_DATE_PRESET_OPTIONS}
                  placeholder="All time"
                />
              </div>
              {filters.date_preset === 'custom' && (
                <>
                  <div>
                    <DateSelect
                      label="From"
                      value={filters.date_from}
                      onChange={(v) => onFilterChange('date_from', v)}
                    />
                  </div>
                  <div>
                    <DateSelect
                      label="To"
                      value={filters.date_to}
                      onChange={(v) => onFilterChange('date_to', v)}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={onApply} disabled={isLoading} size="sm">
              Apply filters
            </Button>
            <Button variant="secondary" onClick={onClear} disabled={isLoading} size="sm">
              Clear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
