'use client';

import { Button, Select } from '@/components/ui';
import { useTheme } from '@/providers/theme-provider';

export type QueueFilterOption =
  | 'processing'
  | 'history'
  | 'recharge_game'
  | 'redeem_game'
  | 'add_user_game';

export interface HistoryGameActivitiesFiltersState {
  username: string;
  email: string;
  transaction_id: string;
  operator: string;
  type: string;
  game: string;
  game_username: string;
  status: string;
  date_from: string;
  date_to: string;
}

type HistoryGameActivitiesFilterKey = keyof HistoryGameActivitiesFiltersState;

interface InputFieldConfig {
  key: HistoryGameActivitiesFilterKey;
  label: string;
  placeholder?: string;
  type?: 'text' | 'email' | 'date' | 'number';
}

interface SelectFieldConfig {
  key: HistoryGameActivitiesFilterKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

const TEXT_FIELDS: InputFieldConfig[] = [
  { key: 'email', label: 'Email', placeholder: 'Filter by email', type: 'email' },
  { key: 'transaction_id', label: 'Transaction ID', placeholder: 'Enter transaction ID' },
  { key: 'game_username', label: 'Game Username', placeholder: 'Enter game username' },
];

const BASE_SELECT_FIELDS: SelectFieldConfig[] = [
  {
    key: 'operator',
    label: 'Operator Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'bot', label: 'Bot' },
      { value: 'admin', label: 'Admin' },
    ],
  },
  {
    key: 'type',
    label: 'Activity Type',
    options: [
      { value: '', label: 'All Types' },
      { value: 'recharge_game', label: 'Recharge Game' },
      { value: 'redeem_game', label: 'Redeem Game' },
      { value: 'add_user_game', label: 'Add User Game' },
      { value: 'create_game', label: 'Create Game' },
    ],
  },
];

const QUEUE_TYPE_OPTIONS: Array<{ value: QueueFilterOption; label: string }> = [
  { value: 'history', label: 'History' },
  { value: 'processing', label: 'Processing' },
  { value: 'recharge_game', label: 'Recharge Game' },
  { value: 'redeem_game', label: 'Redeem Game' },
  { value: 'add_user_game', label: 'Add User Game' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'pending', label: 'Pending' },
];

const FILTER_ICON = (
  <svg className="w-5 h-5 text-muted-foreground transition-colors dark:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="filterIconGradient" x1="0%" x2="100%" y1="0%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
        <stop offset="100%" stopColor="currentColor" />
      </linearGradient>
    </defs>
    <path stroke="url(#filterIconGradient)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

interface HistoryGameActivitiesFiltersProps {
  queueFilter: QueueFilterOption;
  onQueueFilterChange: (value: QueueFilterOption) => void;
  filters: HistoryGameActivitiesFiltersState;
  onFilterChange: (key: HistoryGameActivitiesFilterKey, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  isOpen: boolean;
  onToggle: () => void;
  gameOptions?: Array<{ value: string; label: string }>;
  isGameLoading?: boolean;
  isLoading?: boolean;
}

export function HistoryGameActivitiesFilters({
  queueFilter,
  onQueueFilterChange,
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
  gameOptions,
  isGameLoading = false,
  isLoading = false,
}: HistoryGameActivitiesFiltersProps) {
  const { theme } = useTheme();
  const inputClasses =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';
  const labelClasses =
    'block text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 transition-colors dark:text-slate-300';

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-md shadow-black/5 backdrop-blur-sm transition-colors dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
      <div className="flex items-center justify-between text-foreground">
        <h3 className="flex items-center gap-3 text-base font-semibold text-foreground transition-colors">
          {FILTER_ICON}
          Filters
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground dark:hover:bg-slate-800/70"
        >
          {isOpen ? (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Hide Filters
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Show Filters
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="pt-5 text-foreground transition-colors">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 w-full">
            <div className="min-w-0">
              <label className={labelClasses}>Player Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(event) => onFilterChange('username', event.target.value)}
                placeholder="Enter username..."
                className={inputClasses}
              />
            </div>

            {TEXT_FIELDS.map(({ key, label, placeholder, type = 'text' }) => (
              <div key={key} className="min-w-0">
                <label className={labelClasses}>{label}</label>
                <input
                  type={type}
                  value={filters[key]}
                  onChange={(event) => onFilterChange(key, event.target.value)}
                  placeholder={placeholder}
                  className={inputClasses}
                />
              </div>
            ))}

            {BASE_SELECT_FIELDS.map(({ key, label, options }) => (
              <div key={key} className="min-w-0">
                <label className={labelClasses}>{label}</label>
                <Select
                  value={filters[key]}
                  onChange={(value: string) => onFilterChange(key, value)}
                  options={options}
                  placeholder={options[0]?.label || 'Select...'}
                />
              </div>
            ))}

            <div className="min-w-0">
              <label className={labelClasses}>Game</label>
              <Select
                value={filters.game}
                onChange={(value: string) => onFilterChange('game', value)}
                options={[
                  { value: '', label: 'All Games' },
                  ...(gameOptions || []),
                  ...(filters.game && gameOptions && !gameOptions.some((option) => option.value === filters.game)
                    ? [{ value: filters.game, label: filters.game }]
                    : []),
                ]}
                placeholder="All Games"
                isLoading={isGameLoading}
                disabled={isGameLoading}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClasses}>Status</label>
              <Select
                value={filters.status}
                onChange={(value: string) => onFilterChange('status', value)}
                options={STATUS_OPTIONS}
                placeholder={STATUS_OPTIONS[0]?.label || 'All Statuses'}
              />
            </div>

            {/* Date Range - Compact Design */}
            <div className="min-w-0">
              <label className={labelClasses}>From Date</label>
              <input
                type="date"
                value={filters.date_from}
                onChange={(event) => onFilterChange('date_from', event.target.value)}
                max={filters.date_to || undefined}
                className={inputClasses}
                style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              />
            </div>

            <div className="min-w-0">
              <label className={labelClasses}>To Date</label>
              <input
                type="date"
                value={filters.date_to}
                onChange={(event) => onFilterChange('date_to', event.target.value)}
                min={filters.date_from || undefined}
                className={inputClasses}
                style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
              />
            </div>

            <div className="col-span-full flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onClear}
                type="button"
                disabled={isLoading}
                className="hover:bg-muted/80 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Filters
              </Button>
              <Button 
                size="sm" 
                onClick={onApply}
                type="button"
                isLoading={isLoading}
                disabled={isLoading}
                className="hover:opacity-90 active:scale-95 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
                      <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    Applying...
                  </>
                ) : (
                  'Apply Filters'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


