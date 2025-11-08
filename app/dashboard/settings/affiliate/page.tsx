'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAffiliateSettingsStore } from '@/stores';
import {
  Button,
  Card,
  CardContent,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { Input } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/features';

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
    <TableRow key={field.key} className="border-gray-100 last:border-0 dark:border-gray-800">
      <TableCell className="min-w-[220px]">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${field.icon.background}`}
          >
            <svg className={`h-6 w-6 ${field.icon.color}`} fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={field.icon.path} />
            </svg>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">{field.label}</p>
            <p className="text-xs text-muted-foreground">{field.description}</p>
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
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            %
          </span>
        </div>
        {error ? <p className="mt-2 text-xs font-medium text-red-600">{error}</p> : null}
      </TableCell>
    </TableRow>
  );
}

export default function AffiliateSettingsPage() {
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
    fetchAffiliateDefaults();
  }, [fetchAffiliateDefaults]);

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

  if (isLoading && !affiliateDefaults) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchAffiliateDefaults} />;
  }

  const handleFieldChange = (key: FormFieldKey, value: number) => {
    setFormData((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-8">
      <Card className="overflow-hidden border border-gray-200 shadow-md dark:border-gray-800 dark:shadow-none">
        <CardContent className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6l4 2" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3a9 9 0 109 9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Affiliate Settings</h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Configure default commission percentages and fees for affiliate payouts.
              </p>
            </div>
          </div>
          <Button
            type="submit"
            form="affiliate-settings-form"
            size="lg"
            disabled={isSubmitting}
            className="lg:ml-auto"
          >
            {isSubmitting ? 'Updating…' : 'Save Changes'}
          </Button>
        </CardContent>
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/40">
          <SearchInput
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search settings…"
            className="h-12 w-full rounded-xl border-gray-200 text-base dark:border-gray-700"
          />
        </div>
      </Card>

      <form id="affiliate-settings-form" onSubmit={handleSubmit}>
        <Card className="overflow-hidden border border-gray-200 shadow-md dark:border-gray-800 dark:shadow-none">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-900/40">
              <TableRow>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Setting
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Value
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSettings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="py-12 text-center text-sm text-muted-foreground">
                    No settings match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredSettings.map((field) => (
                  <SettingRow
                    key={field.key}
                    field={field}
                    value={formData[field.key]}
                    error={errors[field.key]}
                    isSubmitting={isSubmitting}
                    onChange={(value) => handleFieldChange(field.key, value)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </form>
    </div>
  );
}
