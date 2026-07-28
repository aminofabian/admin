import type { ReactNode } from 'react';
import { PlayerDetailPanel } from '@/components/dashboard/players/player-detail-panel';

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
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 border-b border-gray-100 px-0 py-1.5 last:border-b-0 dark:border-gray-800 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-xs text-gray-500 dark:text-gray-400">{label}</dt>
      <dd
        className={`min-w-0 text-xs font-medium leading-snug text-gray-900 dark:text-gray-100 sm:text-sm ${
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
  if (!mobileNumber?.trim()) return '—';

  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      <span className="truncate">{mobileNumber}</span>
      <span
        className={`shrink-0 text-[11px] font-medium ${
          phoneVerified
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-amber-600 dark:text-amber-400'
        }`}
      >
        {phoneVerified ? 'Verified' : 'Not verified'}
      </span>
    </span>
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

  return (
    <PlayerDetailPanel title="Personal information">
      <dl>
        <PersonalInfoRow label="Full name" value={fullName} />
        <PersonalInfoRow label="DOB" value={dob} />
        <PersonalInfoRow label="State" value={state} />
        <PersonalInfoRow label="Address" value={address} breakAll />
        <PersonalInfoRow label="City" value={city} />
        <PersonalInfoRow label="ZIP" value={zipCode} />
        <PersonalInfoRow label="Email" value={email} breakAll />
        <PersonalInfoRow
          label="Phone"
          value={<PhoneValue mobileNumber={mobileNumber} phoneVerified={phoneVerified} />}
        />
        {companyUsername ? <PersonalInfoRow label="Company" value={companyUsername} /> : null}
        {formattedCreated ? <PersonalInfoRow label="Created" value={formattedCreated} /> : null}
        {createdByUsername ? <PersonalInfoRow label="Created by" value={createdByUsername} /> : null}
      </dl>
    </PlayerDetailPanel>
  );
}
