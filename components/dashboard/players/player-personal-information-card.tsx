import type { ReactNode } from 'react';

export interface PlayerPersonalInformationCardProps {
  email: string;
  fullName?: string | null;
  dob?: string | null;
  state?: string | null;
  address?: string | null;
  city?: string | null;
  zipCode?: string | null;
  mobileNumber?: string | null;
  phoneVerified?: boolean;
  created?: string | null;
  createdByUsername?: string | null;
  companyUsername?: string | null;
  formatDate?: (date: string) => string;
}

function displayValue(value: ReactNode) {
  if (value === null || value === undefined || value === '') return '—';
  return value;
}

function PersonalInfoRow({
  label,
  value,
  breakAll,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-2 px-2 py-1.5 sm:px-2.5 sm:py-2">
      <dt className="shrink-0 text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`min-w-0 text-right text-[11px] font-semibold leading-tight text-gray-900 dark:text-gray-100 sm:text-xs ${
          breakAll ? 'break-all' : 'truncate'
        }`}
      >
        {displayValue(value)}
      </dd>
    </div>
  );
}

function PhoneValue({
  mobileNumber,
  phoneVerified,
}: {
  mobileNumber?: string | null;
  phoneVerified?: boolean;
}) {
  if (!mobileNumber) return '—';

  const hasPhone = mobileNumber.trim().length > 0;
  if (!hasPhone) return '—';

  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5">
      <span className="truncate">{mobileNumber}</span>
      <span
        className={`shrink-0 text-[10px] font-medium sm:text-[11px] ${
          phoneVerified
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {phoneVerified ? 'Verified' : 'Not Verified'}
      </span>
    </span>
  );
}

function PersonalInfoHalf({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0 px-2 py-1.5 sm:px-2.5 sm:py-2">
      <dt className="text-[10px] font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 truncate text-[11px] font-semibold leading-tight text-gray-900 dark:text-gray-100 sm:text-xs">
        {displayValue(value)}
      </dd>
    </div>
  );
}

export function PlayerPersonalInformationCard({
  email,
  fullName,
  dob,
  state,
  address,
  city,
  zipCode,
  mobileNumber,
  phoneVerified,
  created,
  createdByUsername,
  companyUsername,
  formatDate,
}: PlayerPersonalInformationCardProps) {
  const formattedCreated = created && formatDate ? formatDate(created) : created;
  const hasCreated = Boolean(formattedCreated);
  const hasCreatedBy = Boolean(createdByUsername);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-3">
      <div className="mb-1.5 flex items-center gap-1.5 sm:mb-2 sm:gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 sm:h-7 sm:w-7">
          <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
        <h2 className="text-xs font-semibold text-gray-900 dark:text-gray-100 sm:text-sm">Personal Information</h2>
      </div>

      <dl className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-100 bg-gray-50/50 dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-800/30">
        <PersonalInfoRow label="Full Name" value={fullName} />

        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
          <PersonalInfoHalf label="DOB" value={dob} />
          <PersonalInfoHalf label="State" value={state} />
        </div>

        <PersonalInfoRow label="Address" value={address} breakAll />

        <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
          <PersonalInfoHalf label="City" value={city} />
          <PersonalInfoHalf label="ZIP Code" value={zipCode} />
        </div>

        <PersonalInfoRow label="Email" value={email} breakAll />
        <PersonalInfoRow
          label="Phone"
          value={<PhoneValue mobileNumber={mobileNumber} phoneVerified={phoneVerified} />}
        />

        {companyUsername ? <PersonalInfoRow label="Company" value={companyUsername} /> : null}

        {hasCreated && hasCreatedBy ? (
          <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-800">
            <PersonalInfoHalf label="Created" value={formattedCreated} />
            <PersonalInfoHalf label="Created By" value={createdByUsername} />
          </div>
        ) : null}
        {hasCreated && !hasCreatedBy ? <PersonalInfoRow label="Created" value={formattedCreated} /> : null}
        {!hasCreated && hasCreatedBy ? <PersonalInfoRow label="Created By" value={createdByUsername} /> : null}
      </dl>
    </section>
  );
}
