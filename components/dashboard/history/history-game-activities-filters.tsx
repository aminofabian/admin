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

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
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
  operatorOptions?: Array<{ value: string; label: string }>;
  isOperatorLoading?: boolean;
  isLoading?: boolean;
}

export function HistoryGameActivitiesFilters({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queueFilter,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onQueueFilterChange,
  filters,
  onFilterChange,
  onApply,
  onClear,
  isOpen,
  onToggle,
  gameOptions,
  isGameLoading = false,
  operatorOptions,
  isOperatorLoading = false,
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
            {/* 1. Username */}
            <div className="min-w-0">
              <label className={labelClasses}>Username</label>
              <input
                type="text"
                value={filters.username}
                onChange={(event) => onFilterChange('username', event.target.value)}
                placeholder="Enter username..."
                className={inputClasses}
              />
            </div>

            {/* 2. Email */}
            <div className="min-w-0">
              <label className={labelClasses}>Email</label>
              <input
                type="email"
                value={filters.email}
                onChange={(event) => onFilterChange('email', event.target.value)}
                placeholder="Filter by email"
                className={inputClasses}
              />
            </div>

            {/* 3. Transaction ID */}
            <div className="min-w-0">
              <label className={labelClasses}>Transaction ID</label>
              <input
                type="text"
                value={filters.transaction_id}
                onChange={(event) => onFilterChange('transaction_id', event.target.value)}
                placeholder="Enter transaction ID"
                className={inputClasses}
              />
            </div>

            {/* 4. Game Username */}
            <div className="min-w-0">
              <label className={labelClasses}>Game Username</label>
              <input
                type="text"
                value={filters.game_username}
                onChange={(event) => onFilterChange('game_username', event.target.value)}
                placeholder="Enter game username"
                className={inputClasses}
              />
            </div>

            {/* 5. Games */}
            <div className="min-w-0">
              <label className={labelClasses}>Games</label>
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

            {/* 6. Activity Type */}
            <div className="min-w-0">
              <label className={labelClasses}>Activity Type</label>
              <Select
                value={filters.type}
                onChange={(value: string) => onFilterChange('type', value)}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'recharge_game', label: 'Recharge' },
                  { value: 'redeem_game', label: 'Redeem' },
                  { value: 'create_game', label: 'Add User' },
                  { value: 'reset_password', label: 'Reset Password' },
                ]}
                placeholder="All Types"
              />
            </div>

            {/* 7. Operator - Hide if operatorOptions is explicitly an empty array (superadmin) */}
            {!(Array.isArray(operatorOptions) && operatorOptions.length === 0) && (
              <div className="min-w-0">
                <label className={labelClasses}>Operator</label>
                <Select
                  value={filters.operator}
                  onChange={(value: string) => onFilterChange('operator', value)}
                  options={[
                    { value: '', label: 'All Operators' },
                    ...(operatorOptions || []),
                    ...(filters.operator && operatorOptions && !operatorOptions.some((option) => option.value === filters.operator)
                      ? [{ value: filters.operator, label: filters.operator }]
                      : []),
                  ]}
                  placeholder="All Operators"
                  isLoading={isOperatorLoading}
                  disabled={isOperatorLoading}
                />
              </div>
            )}

            {/* 8. Status */}
            <div className="min-w-0">
              <label className={labelClasses}>Status</label>
              <Select
                value={filters.status}
                onChange={(value: string) => onFilterChange('status', value)}
                options={STATUS_OPTIONS}
                placeholder={STATUS_OPTIONS[0]?.label || 'All Statuses'}
              />
            </div>

            {/* 9. From Date */}
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

            {/* 10. To Date */}
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


