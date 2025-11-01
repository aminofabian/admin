'use client';

import type { ChangeEventHandler, ReactNode } from 'react';
import { SearchInput } from '@/components/ui';

interface DashboardSearchBarProps {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  addon?: ReactNode;
}

export function DashboardSearchBar({
  value,
  onChange,
  placeholder,
  addon,
}: DashboardSearchBarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="w-full sm:max-w-md">
        <SearchInput value={value} onChange={onChange} placeholder={placeholder} />
      </div>
      {addon}
    </div>
  );
}

