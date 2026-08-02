'use client';

import type { ReactNode } from 'react';
import { Button, Select, DateSelect } from '@/components/ui';

// All 50 US States (exported for reuse in superadmin etc.)
export const US_STATES = [
    { value: 'AL', label: 'Alabama' },
    { value: 'AK', label: 'Alaska' },
    { value: 'AZ', label: 'Arizona' },
    { value: 'AR', label: 'Arkansas' },
    { value: 'CA', label: 'California' },
    { value: 'CO', label: 'Colorado' },
    { value: 'CT', label: 'Connecticut' },
    { value: 'DE', label: 'Delaware' },
    { value: 'FL', label: 'Florida' },
    { value: 'GA', label: 'Georgia' },
    { value: 'HI', label: 'Hawaii' },
    { value: 'ID', label: 'Idaho' },
    { value: 'IL', label: 'Illinois' },
    { value: 'IN', label: 'Indiana' },
    { value: 'IA', label: 'Iowa' },
    { value: 'KS', label: 'Kansas' },
    { value: 'KY', label: 'Kentucky' },
    { value: 'LA', label: 'Louisiana' },
    { value: 'ME', label: 'Maine' },
    { value: 'MD', label: 'Maryland' },
    { value: 'MA', label: 'Massachusetts' },
    { value: 'MI', label: 'Michigan' },
    { value: 'MN', label: 'Minnesota' },
    { value: 'MS', label: 'Mississippi' },
    { value: 'MO', label: 'Missouri' },
    { value: 'MT', label: 'Montana' },
    { value: 'NE', label: 'Nebraska' },
    { value: 'NV', label: 'Nevada' },
    { value: 'NH', label: 'New Hampshire' },
    { value: 'NJ', label: 'New Jersey' },
    { value: 'NM', label: 'New Mexico' },
    { value: 'NY', label: 'New York' },
    { value: 'NC', label: 'North Carolina' },
    { value: 'ND', label: 'North Dakota' },
    { value: 'OH', label: 'Ohio' },
    { value: 'OK', label: 'Oklahoma' },
    { value: 'OR', label: 'Oregon' },
    { value: 'PA', label: 'Pennsylvania' },
    { value: 'RI', label: 'Rhode Island' },
    { value: 'SC', label: 'South Carolina' },
    { value: 'SD', label: 'South Dakota' },
    { value: 'TN', label: 'Tennessee' },
    { value: 'TX', label: 'Texas' },
    { value: 'UT', label: 'Utah' },
    { value: 'VT', label: 'Vermont' },
    { value: 'VA', label: 'Virginia' },
    { value: 'WA', label: 'Washington' },
    { value: 'WV', label: 'West Virginia' },
    { value: 'WI', label: 'Wisconsin' },
    { value: 'WY', label: 'Wyoming' },
];

export const IDENTITY_VERIFICATION_STATUS_OPTIONS = [
    { value: 'all', label: 'All Verification Statuses' },
    { value: 'approved', label: 'Verified' },
    { value: 'manually_approved', label: 'Marked Verified' },
    { value: 'pending', label: 'Pending' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'not_submitted', label: 'Not Submitted' },
] as const;

export interface PlayersFiltersState {
    username: string;
    full_name: string;
    email: string;
    referred_by: string;
    agent: string;
    date_from: string;
    date_to: string;
    status: string;
    state: string;
    identity_verification_status: string;
    first_deposit_done: string;
}

type PlayersFilterKey = keyof PlayersFiltersState;

const FILTER_ICON = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
);

/* ------------------------------------------------------------------ */
/* Shared tokens & small building blocks (reused by the superadmin view) */
/* ------------------------------------------------------------------ */

export const FILTER_FIELD_LABEL_CLASSES =
    'block text-xs font-medium text-muted-foreground mb-1.5 transition-colors dark:text-slate-400';

export const FILTER_TEXT_INPUT_CLASSES =
    'w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground text-sm shadow-sm transition-all duration-150 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:ring-primary/30';

export const FILTER_SECTION_HEADING_CLASSES =
    'mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400';

const SECTION_BAR = (
    <span
        className="h-3.5 w-1 rounded-full bg-gradient-to-b from-primary to-primary/40"
        aria-hidden
    />
);

export const SEARCH_SECTION_ICON = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
    </svg>
);

export const FILTERS_SECTION_ICON = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
);

export const DATE_SECTION_ICON = (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

export const USER_ICON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

export const FULL_NAME_ICON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0a2 2 0 104 0m-4 0a2 2 0 114 0m-6 8a2 2 0 100-4 2 2 0 000 4zm8 0a2 2 0 100-4 2 2 0 000 4z" />
    </svg>
);

export const MAIL_ICON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
);

export const LINK_ICON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.172-1.172" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.172 1.172" />
    </svg>
);

export const BUILDING_ICON = (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9h.01M9 12h.01M9 15h.01M9 18h.01" />
    </svg>
);

/** Labeled wrapper for a single filter field (dropdowns, etc.). */
export function FilterField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div>
            <label className={FILTER_FIELD_LABEL_CLASSES}>{label}</label>
            {children}
        </div>
    );
}

/** Text input with a leading icon inside the filter panel. */
export function IconInput({
    label,
    icon,
    value,
    onChange,
    placeholder,
    type = 'text',
}: {
    label: string;
    icon: ReactNode;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    type?: string;
}) {
    return (
        <div>
            <label className={FILTER_FIELD_LABEL_CLASSES}>{label}</label>
            <div className="relative">
                <span
                    className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground/60 dark:text-slate-500"
                    aria-hidden
                >
                    {icon}
                </span>
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${FILTER_TEXT_INPUT_CLASSES} pl-9`}
                />
            </div>
        </div>
    );
}

/** Number of filters that currently hold a non-default value. */
export function countActiveFilters(filters: PlayersFiltersState): number {
    let count = 0;
    if (filters.username.trim() !== '') count += 1;
    if (filters.full_name.trim() !== '') count += 1;
    if (filters.email.trim() !== '') count += 1;
    if (filters.referred_by.trim() !== '') count += 1;
    if (filters.agent.trim() !== '') count += 1;
    if (filters.date_from.trim() !== '') count += 1;
    if (filters.date_to.trim() !== '') count += 1;
    if (filters.status.trim() !== '' && filters.status !== 'all') count += 1;
    if (filters.state.trim() !== '' && filters.state !== 'all') count += 1;
    if (filters.identity_verification_status.trim() !== '' && filters.identity_verification_status !== 'all') count += 1;
    if (filters.first_deposit_done !== 'all') count += 1;
    return count;
}

interface PlayersFiltersProps {
    filters: PlayersFiltersState;
    onFilterChange: (key: PlayersFilterKey, value: string) => void;
    onApply: () => void;
    onClear: () => void;
    isOpen: boolean;
    onToggle: () => void;
    agentOptions?: Array<{ value: string; label: string }>;
    isAgentLoading?: boolean;
    isLoading?: boolean;
    showAgentFilter?: boolean;
}

export function PlayersFilters({
    filters,
    onFilterChange,
    onApply,
    onClear,
    isOpen,
    onToggle,
    agentOptions,
    isAgentLoading = false,
    isLoading = false,
    showAgentFilter = true,
}: PlayersFiltersProps) {
    const activeCount = countActiveFilters(filters);

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border/80 dark:border-slate-700/80">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/10 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20">
                        {FILTER_ICON}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-foreground leading-tight">
                            Filters
                            {activeCount > 0 && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary align-middle dark:bg-indigo-500/10 dark:text-indigo-400">
                                    {activeCount}
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-muted-foreground dark:text-slate-400 truncate">
                            {activeCount > 0
                                ? `${activeCount} active filter${activeCount === 1 ? '' : 's'} applied`
                                : 'Narrow down your player list'}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={onToggle}
                    aria-expanded={isOpen}
                    className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-slate-800"
                >
                    {isOpen ? (
                        <>
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            Hide
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                            Show
                        </>
                    )}
                </Button>
            </div>

            {isOpen && (
                <div className="p-4 sm:p-5 text-foreground space-y-6 animate-fade-in">
                    {/* Search */}
                    <section>
                        <h4 className={FILTER_SECTION_HEADING_CLASSES}>
                            {SECTION_BAR}
                            <span className="inline-flex items-center gap-1.5">
                                {SEARCH_SECTION_ICON}
                                Search
                            </span>
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <IconInput
                                label="Username"
                                icon={USER_ICON}
                                value={filters.username}
                                onChange={(v) => onFilterChange('username', v)}
                                placeholder="Enter username..."
                            />
                            <IconInput
                                label="Full name"
                                icon={FULL_NAME_ICON}
                                value={filters.full_name}
                                onChange={(v) => onFilterChange('full_name', v)}
                                placeholder="Enter full name..."
                            />
                            <IconInput
                                label="Email"
                                icon={MAIL_ICON}
                                type="email"
                                value={filters.email}
                                onChange={(v) => onFilterChange('email', v)}
                                placeholder="Filter by email"
                            />
                            <IconInput
                                label="Referred by"
                                icon={LINK_ICON}
                                value={filters.referred_by}
                                onChange={(v) => onFilterChange('referred_by', v)}
                                placeholder="Enter referrer username..."
                            />
                        </div>
                    </section>

                    {/* Filters (dropdowns) */}
                    <section>
                        <h4 className={FILTER_SECTION_HEADING_CLASSES}>
                            {SECTION_BAR}
                            <span className="inline-flex items-center gap-1.5">
                                {FILTERS_SECTION_ICON}
                                Filters
                            </span>
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {showAgentFilter && (
                                <FilterField label="Agent">
                                    <Select
                                        value={filters.agent}
                                        onChange={(v) => onFilterChange('agent', v)}
                                        options={[
                                            { value: '', label: 'All Agents' },
                                            ...(agentOptions || []),
                                            ...(filters.agent && agentOptions && !agentOptions.some((o) => o.value === filters.agent)
                                                ? [{ value: filters.agent, label: filters.agent }]
                                                : []),
                                        ]}
                                        placeholder="All Agents"
                                        isLoading={isAgentLoading}
                                        disabled={isAgentLoading}
                                    />
                                </FilterField>
                            )}
                            <FilterField label="Status">
                                <Select
                                    value={filters.status}
                                    onChange={(v) => onFilterChange('status', v)}
                                    options={[
                                        { value: 'all', label: 'All Statuses' },
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                    ]}
                                    placeholder="All Statuses"
                                />
                            </FilterField>
                            <FilterField label="State">
                                <Select
                                    value={filters.state}
                                    onChange={(v) => onFilterChange('state', v)}
                                    options={[
                                        { value: 'all', label: 'All States' },
                                        ...US_STATES,
                                    ]}
                                    placeholder="All States"
                                />
                            </FilterField>
                            <FilterField label="Identity verification">
                                <Select
                                    value={filters.identity_verification_status}
                                    onChange={(v) => onFilterChange('identity_verification_status', v)}
                                    options={[...IDENTITY_VERIFICATION_STATUS_OPTIONS]}
                                    placeholder="All Verification Statuses"
                                />
                            </FilterField>
                            <FilterField label="First deposit">
                                <Select
                                    value={filters.first_deposit_done}
                                    onChange={(v) => onFilterChange('first_deposit_done', v)}
                                    options={[
                                        { value: 'all', label: 'All' },
                                        { value: 'true', label: 'Deposit' },
                                        { value: 'false', label: 'No deposit' },
                                    ]}
                                    placeholder="All"
                                />
                            </FilterField>
                        </div>
                    </section>

                    {/* Date range */}
                    <section>
                        <h4 className={FILTER_SECTION_HEADING_CLASSES}>
                            {SECTION_BAR}
                            <span className="inline-flex items-center gap-1.5">
                                {DATE_SECTION_ICON}
                                Date range
                            </span>
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <DateSelect
                            label="From date"
                            labelVariant="field"
                            value={filters.date_from}
                            onChange={(v) => onFilterChange('date_from', v)}
                          />
                          <DateSelect
                            label="To date"
                            labelVariant="field"
                            value={filters.date_to}
                            onChange={(v) => onFilterChange('date_to', v)}
                          />
                        </div>
                    </section>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border dark:border-slate-700/80">
                        <p className="text-xs text-muted-foreground dark:text-slate-500">
                            {activeCount === 0
                                ? 'No filters applied'
                                : `${activeCount} filter${activeCount === 1 ? '' : 's'} active`}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                type="button"
                                onClick={onClear}
                                disabled={isLoading}
                                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                                Reset
                            </Button>
                            <Button
                                size="sm"
                                type="button"
                                onClick={onApply}
                                isLoading={isLoading}
                                disabled={isLoading}
                                className="min-w-[120px] shadow-sm disabled:opacity-50"
                            >
                                Apply filters
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
