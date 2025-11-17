'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    href: '/dashboard/games',
    label: 'Games',
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/players',
    label: 'Players',
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    href: '/dashboard',
    label: 'Home',
    isCenter: true,
    icon: (isActive: boolean) => (
      <svg className="w-6 h-6" fill={isActive ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/transactions',
    label: 'Activity',
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    href: '/dashboard/managers',
    label: 'Menu',
    icon: (isActive: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      {/* Navigation items */}
      <div className="flex items-center justify-around px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const isCenter = item.isCenter;

          if (isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative group"
              >
                {/* Center button */}
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-primary text-white shadow-lg'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {/* Icon */}
                  <div className={`transition-all duration-300 ${
                    isActive ? 'scale-110' : 'scale-100'
                  }`}>
                    {item.icon(isActive)}
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center gap-1 py-2 px-3 group active:scale-95 transition-all duration-300"
            >
              {/* Icon */}
              <div className={`transition-all duration-300 ${
                isActive 
                  ? 'text-primary scale-110' 
                  : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'
              }`}>
                {item.icon(isActive)}
              </div>

              {/* Label */}
              <span className={`text-[10px] font-medium transition-all duration-300 ${
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
