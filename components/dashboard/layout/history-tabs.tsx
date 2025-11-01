'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/history/transactions', label: 'Transactions' },
  { href: '/dashboard/history/game-activities', label: 'Game Activities' },
];

export function HistoryTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="History sections" className="flex flex-wrap gap-2 mb-4">
      {TABS.map((tab) => {
        const isActive = pathname?.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

