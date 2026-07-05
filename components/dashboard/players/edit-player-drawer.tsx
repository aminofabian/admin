'use client';

import type { ReactNode } from 'react';
import { Button, Input, Select, Switch, DateSelect } from '@/components/ui';
import type { EditablePlayerFields } from '@/types/player-edit';
import { getPlayerIdentityStatusLabel } from '@/lib/players/player-verification';
import type { Player } from '@/types';

// All 50 US States
const US_STATES = [
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

interface EditPlayerDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editableFields: EditablePlayerFields;
  setEditableFields: React.Dispatch<React.SetStateAction<EditablePlayerFields>>;
  isSaving: boolean;
  onSave: () => void;
  canEditVerification?: boolean;
  player?: Player | null;
}

const inputClass =
  'h-10 w-full rounded-lg text-sm transition-all focus:ring-2 focus:ring-purple-500 focus:border-purple-500';

function Section({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/50">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      {children}
    </label>
  );
}

function SwitchRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-3 dark:border-gray-800 dark:bg-gray-800/50">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} disabled={disabled} tone="emerald" />
    </div>
  );
}

export function EditPlayerDetailsDrawer({
  isOpen,
  onClose,
  editableFields,
  setEditableFields,
  isSaving,
  onSave,
  canEditVerification = false,
  player = null,
}: EditPlayerDetailsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 dark:bg-black/80"
        onClick={() => !isSaving && onClose()}
        aria-hidden="true"
      />
      
      {/* Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-[60] w-full bg-gray-50 shadow-2xl transition-transform duration-300 ease-in-out dark:bg-gray-950 sm:max-w-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-5 py-4 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-900/20">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-purple-600 dark:text-purple-300">
                    Player profile
                  </p>
                  <h2 className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
                    Edit details
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                disabled={isSaving}
                aria-label="Close drawer"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-24 sm:px-5">
            <Section
              title="Identity"
              description="Core profile fields shown across the admin dashboard."
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>First name</FieldLabel>
                  <Input
                    type="text"
                    value={editableFields.first_name}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, first_name: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <FieldLabel>Last name</FieldLabel>
                  <Input
                    type="text"
                    value={editableFields.last_name}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, last_name: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </div>
                <div>
                  <FieldLabel>Email address</FieldLabel>
                  <Input
                    type="email"
                    value={editableFields.email}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, email: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="player@example.com"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <FieldLabel>Mobile number</FieldLabel>
                  <Input
                    type="tel"
                    value={editableFields.mobile_number}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, mobile_number: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="+1 (555) 123-4567"
                    autoComplete="tel"
                  />
                </div>
                <div className="sm:col-span-2">
                  <DateSelect
                    label="Date of Birth"
                    value={editableFields.dob}
                    onChange={(value) => setEditableFields(prev => ({ ...prev, dob: value }))}
                    disabled={isSaving}
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Address"
              description="Use the complete mailing address, not just the state."
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 9c0 7-7.5 12-7.5 12S4.5 16 4.5 9a7.5 7.5 0 1115 0z" />
                </svg>
              }
            >
              <div>
                <FieldLabel>Street address</FieldLabel>
                <Input
                  type="text"
                  value={editableFields.address}
                  onChange={(e) => setEditableFields(prev => ({ ...prev, address: e.target.value }))}
                  className={inputClass}
                  disabled={isSaving}
                  placeholder="123 Main St"
                  autoComplete="street-address"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>City</FieldLabel>
                  <Input
                    type="text"
                    value={editableFields.city}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, city: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="New York"
                    autoComplete="address-level2"
                  />
                </div>
                <div>
                  <FieldLabel>ZIP code</FieldLabel>
                  <Input
                    type="text"
                    value={editableFields.zip_code}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, zip_code: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="10001"
                    autoComplete="postal-code"
                  />
                </div>
                <div>
                  <FieldLabel>State</FieldLabel>
                  <Select
                    value={editableFields.state}
                    onChange={(value: string) => setEditableFields(prev => ({ ...prev, state: value }))}
                    options={US_STATES}
                    placeholder="Select state"
                    disabled={isSaving}
                    className="h-10 w-full"
                  />
                </div>
                <div>
                  <FieldLabel>Country</FieldLabel>
                  <Input
                    type="text"
                    value={editableFields.country}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, country: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="US"
                    autoComplete="country"
                  />
                </div>
              </div>
            </Section>

            <Section
              title="Access"
              description="Control login status and optionally reset the player's password."
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            >
              <SwitchRow
                title="Account status"
                description={editableFields.is_active ? 'Player account is active' : 'Player account is inactive'}
                checked={editableFields.is_active}
                disabled={isSaving}
                onChange={(checked) => setEditableFields(prev => ({ ...prev, is_active: checked }))}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel>New password</FieldLabel>
                  <Input
                    type="password"
                    value={editableFields.password}
                    onChange={(e) => setEditableFields(prev => ({ ...prev, password: e.target.value }))}
                    className={inputClass}
                    disabled={isSaving}
                    placeholder="Leave blank to keep current"
                    autoComplete="new-password"
                  />
                </div>
                {editableFields.password ? (
                  <div>
                    <FieldLabel>Confirm password</FieldLabel>
                    <Input
                      type="password"
                      value={editableFields.confirm_password}
                      onChange={(e) => setEditableFields(prev => ({ ...prev, confirm_password: e.target.value }))}
                      className={`${inputClass} ${
                        editableFields.password &&
                        editableFields.confirm_password &&
                        editableFields.password !== editableFields.confirm_password
                          ? 'border-red-500 dark:border-red-400'
                          : ''
                      }`}
                      disabled={isSaving}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                    {editableFields.password &&
                    editableFields.confirm_password &&
                    editableFields.password !== editableFields.confirm_password ? (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </Section>

            {canEditVerification ? (
              <Section
                title="KYC verification"
                description="Manual overrides for step 2 phone and step 3 identity checks."
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <SwitchRow
                    title="Phone verified"
                    description="Step 2 OTP verification"
                    checked={editableFields.phone_verified}
                    disabled={isSaving}
                    onChange={(checked) =>
                      setEditableFields((prev) => ({ ...prev, phone_verified: checked }))
                    }
                  />
                  <SwitchRow
                    title="Identity verified"
                    description={`Step 3 identity check${player ? ` · ${getPlayerIdentityStatusLabel(player)}` : ''}`}
                    checked={editableFields.identity_verified}
                    disabled={isSaving}
                    onChange={(checked) =>
                      setEditableFields((prev) => ({ ...prev, identity_verified: checked }))
                    }
                  />
                </div>
              </Section>
            ) : null}
          </div>

          {/* Drawer Footer */}
          <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-gray-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
            <p className="hidden text-xs text-gray-500 dark:text-gray-400 sm:block">
              Changes apply after saving.
            </p>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              disabled={isSaving}
              isLoading={isSaving}
              className="min-w-[132px] bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

