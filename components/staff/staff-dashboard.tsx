'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface SectionItem {
  label: string;
  href: string;
  icon: ReactNode;
}

export function StaffDashboard() {
  // Staff sections as mobile app-like buttons
  const sections: SectionItem[] = [
    {
      label: 'Transactions',
      href: '/dashboard/history/transactions',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Game Activities',
      href: '/dashboard/history/game-activities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Purchase Processing',
      href: '/dashboard/processing/purchase',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l-1 11H6L5 9z" />
        </svg>
      ),
    },
    {
      label: 'Cashout Processing',
      href: '/dashboard/processing/cashout',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m4-4H8m-6 0a10 10 0 1020 0 10 10 0 00-20 0z" />
        </svg>
      ),
    },
    {
      label: 'Game Activities Processing',
      href: '/dashboard/processing/game-activities',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center pb-24">
      {/* Mobile App-style Button Grid - Centered in the middle of the page */}
      <div className="w-full max-w-5xl px-4">
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 sm:gap-4">
          {sections.map((section, index) => (
            <Link
              key={index}
              href={section.href}
              className="group flex flex-col items-center justify-center bg-card border border-border/50 rounded-lg hover:border-primary/50 hover:shadow-md active:scale-95 transition-all duration-200 p-4 sm:p-3"
            >
              {/* Icon Container - Mobile App Style */}
              <div className="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors mb-2 flex-shrink-0">
                <div className="text-primary">
                  {section.icon}
                </div>
              </div>
              
              {/* Label - Mobile App Style */}
              <span className="text-xs sm:text-xs font-medium text-foreground text-center leading-tight line-clamp-2 group-hover:text-primary transition-colors px-1">
                {section.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

