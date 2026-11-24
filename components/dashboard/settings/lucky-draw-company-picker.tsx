'use client';

import { useEffect, useState } from 'react';
import { companiesApi } from '@/lib/api';
import { Select } from '@/components/ui/select';
import type { Company } from '@/types';

export function LuckyDrawCompanyPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (companyId: number | null) => void;
}) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await companiesApi.list({ page_size: 200 });
        const rows = Array.isArray(response?.results) ? response.results : [];
        if (!cancelled) setCompanies(rows);
      } catch {
        if (!cancelled) setCompanies([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-md space-y-2 rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Company</p>
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Super Admin must choose a company. Each company has its own weekly and monthly draw.
      </p>
      <Select
        value={value == null ? '' : String(value)}
        onChange={(next) => onChange(next ? Number(next) : null)}
        options={[
          { value: '', label: 'Select a company…' },
          ...companies.map((company) => ({
            value: String(company.id),
            label: company.project_name || company.username,
          })),
        ]}
        placeholder="Select a company…"
        isLoading={isLoading}
      />
    </div>
  );
}
