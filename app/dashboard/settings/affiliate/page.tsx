'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAffiliateSettingsStore } from '@/stores';
import {
  Button,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Skeleton,
} from '@/components/ui';
import { Input } from '@/components/ui/input';
import { ErrorState, EmptyState } from '@/components/features';

type FormFieldKey =
  | 'default_affiliation_percentage'
  | 'default_fee_percentage'
  | 'default_payment_method_fee_percentage';

type AffiliateSetting = {
  key: FormFieldKey;
  label: string;
  description: string;
  icon: {
    background: string;
    color: string;
    path: string;
  };
};

const AFFILIATE_SETTINGS: AffiliateSetting[] = [
  {
    key: 'default_affiliation_percentage',
    label: 'Default Affiliation Percentage',
    description: 'Commission percentage for new affiliate agents (0-100%).',
    icon: {
      background: 'bg-blue-500/10',
      color: 'text-blue-500',
      path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    },
  },
  {
    key: 'default_fee_percentage',
    label: 'Default Fee Percentage',
    description: 'Platform fee applied to affiliate payouts (0-100%).',
    icon: {
      background: 'bg-orange-500/10',
      color: 'text-orange-500',
      path: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    },
  },
  {
    key: 'default_payment_method_fee_percentage',
    label: 'Default Payment Method Fee Percentage',
    description: 'Payment processor fee passed to affiliates (0-100%).',
    icon: {
      background: 'bg-green-500/10',
      color: 'text-green-500',
      path: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    },
  },
];

type SettingRowProps = {
  field: AffiliateSetting;
  value: number;
  error?: string;
  isSubmitting: boolean;
  onChange: (value: number) => void;
};

function SettingRow({ field, value, error, isSubmitting, onChange }: SettingRowProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = Number.parseFloat(event.target.value);
    onChange(Number.isNaN(nextValue) ? 0 : nextValue);
  };

  return (
    <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell>
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={field.icon.path} />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-gray-900 dark:text-gray-100">{field.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{field.description}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <div className="relative max-w-[220px]">
          <Input
            type="number"
            value={Number.isFinite(value) ? value : 0}
            onChange={handleChange}
            className={error ? 'border-red-500' : ''}
            placeholder="0.00"
            min="0"
            max="100"
            step="0.01"
            disabled={isSubmitting}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
            %
          </span>
        </div>
        {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export default function AffiliateSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Staff users don't have permission to access affiliate settings
  // Redirect them back to settings page
  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/settings');
    }
  }, [user?.role, router]);

  const [formData, setFormData] = useState({
    default_affiliation_percentage: 0,
    default_fee_percentage: 0,
    default_payment_method_fee_percentage: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const {
    affiliateDefaults,
    isLoading,
    error,
    fetchAffiliateDefaults,
    patchAffiliateDefaults,
  } = useAffiliateSettingsStore();

  useEffect(() => {
    // Only fetch if not staff
    if (user?.role !== USER_ROLES.STAFF) {
      fetchAffiliateDefaults();
    }
  }, [fetchAffiliateDefaults, user?.role]);

  useEffect(() => {
    if (affiliateDefaults) {
      setFormData({
        default_affiliation_percentage: parseFloat(affiliateDefaults.default_affiliation_percentage) || 0,
        default_fee_percentage: parseFloat(affiliateDefaults.default_fee_percentage) || 0,
        default_payment_method_fee_percentage: parseFloat(affiliateDefaults.default_payment_method_fee_percentage) || 0,
      });
    }
  }, [affiliateDefaults]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.default_affiliation_percentage < 0 || formData.default_affiliation_percentage > 100) {
      newErrors.default_affiliation_percentage = 'Must be between 0 and 100';
    }

    if (formData.default_fee_percentage < 0 || formData.default_fee_percentage > 100) {
      newErrors.default_fee_percentage = 'Must be between 0 and 100';
    }

    if (formData.default_payment_method_fee_percentage < 0 || formData.default_payment_method_fee_percentage > 100) {
      newErrors.default_payment_method_fee_percentage = 'Must be between 0 and 100';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await patchAffiliateDefaults(formData);
      alert('Settings updated successfully!');
    } catch (err) {
      console.error('Error updating settings:', err);
      alert('Failed to update settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSettings = useMemo(
    () =>
      AFFILIATE_SETTINGS.filter((field) =>
        field.label.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [searchTerm],
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
          <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
            <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-lg shrink-0" />
            <Skeleton className="h-6 sm:h-7 md:h-8 lg:h-9 w-40 shrink-0" />
            <div className="flex-1 min-w-0" />
            <Skeleton className="h-9 w-32 rounded-md shrink-0" />
          </div>
        </div>

        {/* Search Skeleton */}
        <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <Skeleton className="h-10 w-full" />
        </div>

        {/* Table Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              {/* Table Header Skeleton */}
              <div className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4 px-4 py-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              
              {/* Table Rows Skeleton */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="grid grid-cols-2 gap-4 px-4 py-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                    </div>
                    <div className="flex items-start">
                      <div className="relative max-w-[220px] w-full">
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !affiliateDefaults) {
    return <ErrorState message={error} onRetry={fetchAffiliateDefaults} />;
  }

  const handleFieldChange = (key: FormFieldKey, value: number) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-[#eff3ff] dark:bg-indigo-950/30">
        <div className="relative flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 md:p-4 lg:p-6">
          {/* Icon */}
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-md shrink-0">
            <svg className="h-4 w-4 sm:h-5 sm:w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3a9 9 0 109 9" />
            </svg>
          </div>
          
          {/* Title */}
          <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold text-gray-900 dark:text-gray-100 shrink-0">
            Affiliate Settings
          </h2>
          
          {/* Spacer */}
          <div className="flex-1 min-w-0" />
          
          {/* Save Button */}
          <Button
            type="submit"
            form="affiliate-settings-form"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="shrink-0"
          >
            {isSubmitting ? 'Updating…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-border/70 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <SearchInput
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search settings…"
        />
      </div>

      <form id="affiliate-settings-form" onSubmit={handleSubmit}>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          {!affiliateDefaults || filteredSettings.length === 0 ? (
            <div className="py-12">
              <EmptyState title="No settings match your search" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setting</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSettings.map((field) => (
                    <SettingRow
                      key={field.key}
                      field={field}
                      value={formData[field.key]}
                      error={errors[field.key]}
                      isSubmitting={isSubmitting}
                      onChange={(value) => handleFieldChange(field.key, value)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
