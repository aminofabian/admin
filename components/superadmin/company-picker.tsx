'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Search } from 'lucide-react';
import type { Company } from '@/types';

interface CompanyPickerProps {
  companies: Company[];
  selectedCompanyId: number | null;
  onSelect: (companyId: number) => void;
}

function matchesSearch(company: Company, search: string): boolean {
  return (
    company.project_name.toLowerCase().includes(search) ||
    company.username.toLowerCase().includes(search)
  );
}

function useCloseOnOutsideClick(isOpen: boolean, close: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [isOpen, close]);
  return containerRef;
}

function CompanyOption({ company, isSelected, onSelect }: {
  company: Company;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-accent ${isSelected ? 'bg-muted' : ''}`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        }`}
      >
        {company.project_name.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{company.project_name}</span>
        <span className="block truncate text-xs text-muted-foreground">@{company.username}</span>
      </span>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
    </button>
  );
}

export function CompanyPicker({ companies, selectedCompanyId, onSelect }: CompanyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
  }, []);
  const containerRef = useCloseOnOutsideClick(isOpen, close);

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const normalizedSearch = search.trim().toLowerCase();
  const visibleCompanies = normalizedSearch
    ? companies.filter((company) => matchesSearch(company, normalizedSearch))
    : companies;

  return (
    <div ref={containerRef} className="relative w-full md:w-72">
      <button
        type="button"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        className="flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-left hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <Building2 className="h-4 w-4 shrink-0 text-primary" />
        <span className={`min-w-0 flex-1 truncate text-sm ${selectedCompany ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
          {selectedCompany ? selectedCompany.project_name : `Choose company (${companies.length})`}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[16rem] overflow-hidden rounded-lg border border-border bg-card shadow-xl">
          <div className="relative border-b border-border p-2">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search companies..."
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {visibleCompanies.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No companies match your search</p>
            ) : (
              visibleCompanies.map((company) => (
                <CompanyOption
                  key={company.id}
                  company={company}
                  isSelected={company.id === selectedCompanyId}
                  onSelect={() => { onSelect(company.id); close(); }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
