'use client';

import { useEffect, useMemo, useState } from 'react';
import { companiesApi } from '@/lib/api';
import { extractProjectUuid } from '@/lib/utils/project-uuid';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Company } from '@/types';

interface ProjectScopePickerProps {
  value: string;
  onChange: (uuid: string) => void;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  hint?: string;
}

/**
 * Superadmin project scoping control for email APIs that require
 * `whitelabel_admin_uuid`.
 */
export function ProjectScopePicker({
  value,
  onChange,
  disabled = false,
  required = false,
  label = 'Project scope',
  hint = 'Required for superadmin. Select a company or paste its whitelabel UUID.',
}: ProjectScopePickerProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
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

  const options = useMemo(
    () =>
      companies.map((company) => {
        const uuid = extractProjectUuid(company) || '';
        return {
          value: String(company.id),
          label: `${company.project_name || company.username}${uuid ? '' : ' (no UUID)'}`,
          disabled: !uuid,
        };
      }),
    [companies],
  );

  useEffect(() => {
    if (!value || !companies.length) return;
    const match = companies.find((company) => extractProjectUuid(company) === value);
    if (match) setSelectedId(String(match.id));
  }, [value, companies]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    const company = companies.find((row) => String(row.id) === id);
    const uuid = extractProjectUuid(company);
    if (uuid) onChange(uuid);
  };

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </p>
        <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{hint}</p>
      </div>

      <Select
        value={selectedId}
        onChange={handleSelect}
        options={[{ value: '', label: 'Select a company…' }, ...options]}
        placeholder="Select a company…"
        disabled={disabled}
        isLoading={isLoading}
      />

      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        disabled={disabled}
        label="Whitelabel admin UUID"
      />
    </div>
  );
}
