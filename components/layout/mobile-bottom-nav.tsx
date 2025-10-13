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
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Premium floating island container */}
      <div className="relative px-6 pb-8">
        <div className="pointer-events-auto relative">
          {/* Main navigation island */}
          <div className="relative bg-card/80 backdrop-blur-2xl rounded-[32px] border border-border/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.4)]">
            {/* Ambient glow effect */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-t from-primary/5 via-transparent to-transparent opacity-50" />
            
            {/* Navigation items */}
            <div className="relative flex items-center justify-around px-3 py-3">
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
                      {/* Center button with elevated design */}
                      <div className={`relative flex items-center justify-center w-[60px] h-[60px] -mt-8 rounded-[20px] transition-all duration-500 active:scale-90 ${
                        isActive
                          ? 'bg-gradient-to-br from-primary via-primary to-primary/90 shadow-[0_12px_40px_rgba(0,0,0,0.25)] dark:shadow-[0_12px_56px_rgba(0,0,0,0.5)]'
                          : 'bg-gradient-to-br from-primary/95 to-primary/85 shadow-[0_8px_32px_rgba(0,0,0,0.2)]'
                      }`}>
                        {/* Animated glow ring */}
                        <div className={`absolute -inset-1 rounded-[22px] bg-gradient-to-br from-primary/30 to-primary/10 blur-xl transition-all duration-500 ${
                          isActive ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-60 scale-100'
                        }`} />
                        
                        {/* Icon */}
                        <div className={`relative text-white transition-all duration-300 ${
                          isActive ? 'scale-110' : 'scale-100'
                        }`}>
                          {item.icon(isActive)}
                        </div>

                        {/* Orbital indicator */}
                        {isActive && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                            <div className="w-1.5 h-1.5 bg-white rounded-full shadow-lg" />
                          </div>
                        )}
                      </div>

                      {/* Label appears below when active */}
                      <div className={`absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${
                        isActive ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
                      }`}>
                        <span className="text-[9px] font-bold text-primary tracking-wide uppercase">
                          {item.label}
                        </span>
                      </div>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex flex-col items-center gap-1.5 py-2 px-4 group active:scale-95 transition-all duration-300"
                  >
                    {/* Background pill for active state */}
                    <div className={`absolute inset-0 rounded-2xl transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary/10 dark:bg-primary/15 scale-100 opacity-100' 
                        : 'bg-transparent scale-90 opacity-0 group-hover:opacity-50 group-hover:scale-95'
                    }`} />

                    {/* Icon with dynamic sizing */}
                    <div className={`relative transition-all duration-300 ${
                      isActive 
                        ? 'text-primary scale-110' 
                        : 'text-muted-foreground/70 group-hover:text-foreground group-hover:scale-105'
                    }`}>
                      {item.icon(isActive)}
                    </div>

                    {/* Label with smooth appearance */}
                    <span className={`relative text-[9px] font-bold tracking-wide transition-all duration-300 ${
                      isActive 
                        ? 'text-primary opacity-100 translate-y-0' 
                        : 'text-muted-foreground/60 opacity-80 translate-y-0.5'
                    }`}>
                      {item.label}
                    </span>

                    {/* Minimal active indicator */}
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full shadow-sm" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Reflection effect */}
          <div className="absolute inset-x-0 -bottom-1 h-8 bg-gradient-to-t from-background/20 to-transparent blur-xl rounded-[32px] -z-10" />
        </div>
      </div>
    </div>
  );
}
