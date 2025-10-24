'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';

export type ControlSection = 'companies' | 'players' | 'games' | 'managers' | 'agents' | 'staffs' | 'transactions' | 'bonuses' | 'banners' | 'affiliates' | 'support';

interface ControlItem {
  icon: ReactNode;
  label: string;
  section?: ControlSection;
  active?: boolean;
}

const controlItems: ControlItem[] = [
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ), 
    label: 'Companies',
    section: 'companies'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ), 
    label: 'Players',
    section: 'players'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
      </svg>
    ), 
    label: 'Games',
    section: 'games'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ), 
    label: 'Transactions',
    section: 'transactions'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ), 
    label: 'Managers',
    section: 'managers'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ), 
    label: 'Agents',
    section: 'agents'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ), 
    label: 'Staffs',
    section: 'staffs'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ), 
    label: 'Bonuses',
    section: 'bonuses'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ), 
    label: 'Banners',
    section: 'banners'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ), 
    label: 'Affiliates',
    section: 'affiliates'
  },
  { 
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ), 
    label: 'Support',
    section: 'support'
  },
];

interface ControlGridProps {
  onSectionClick?: (section: ControlSection | undefined) => void;
  activeSection?: ControlSection | null;
}

export function ControlGrid({ onSectionClick, activeSection }: ControlGridProps) {
  const { user } = useAuth();
  
  // Filter control items based on user role
  const filteredItems = controlItems.filter(item => {
    // Hide Companies control for non-superadmin users
    if (item.section === 'companies' && user?.role !== USER_ROLES.SUPERADMIN) {
      return false;
    }
    return true;
  });
  
  // Priority system: show most important controls first
  const priorityItems = filteredItems.slice(0, 8); // Top 8 for small screens
  const allItems = filteredItems;

  const handleClick = (section: ControlSection | undefined) => {
    if (onSectionClick && section) {
      onSectionClick(section);
    }
  };

  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 md:p-4 lg:p-5 xl:p-5 border border-border shadow-sm">
      {/* Header with count indicator */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm md:text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Quick Controls
        </h3>
        <span className="text-[10px] sm:text-xs text-muted-foreground/60 font-medium">
          {allItems.length}
        </span>
      </div>
      
      {/* 🎨 CREATIVE RESPONSIVE GRID SYSTEM:
          Mobile (< 640px): 2 cols, 8 items shown
          Tablet (640px-768px): 3 cols, all items
          13" & 14" Laptop (768px-1024px): 5 cols (compact for text overflow)
          15" Laptop (1024px-1280px): 4 cols (more breathing room)
          17" Desktop (1280px+): 3 cols (full sidebar with generous spacing)
      */}
      
      {/* Mobile: Exact Copy of Reference Design */}
      <div className="grid sm:hidden grid-cols-2 gap-4">
        {priorityItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-card/95 backdrop-blur-sm border transition-all duration-300 active:scale-[0.97] shadow-sm ${
              activeSection === item.section
                ? 'border-primary bg-primary/10'
                : 'border-border/30 hover:border-primary/50 hover:bg-card'
            }`}
            title={item.label}
          >
            <div className="flex flex-col items-center gap-4 w-full">
              {/* Icon Container - Exact Style from Reference */}
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all duration-300 border border-primary/20">
                <div className="text-primary group-hover:scale-110 transition-transform duration-300">
                  {item.icon}
                </div>
              </div>
              
              {/* Text Content - Clean Typography */}
              <div className="text-center w-full">
                <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                  {item.label}
                </div>
              </div>
            </div>
            
            {/* Notification Badge - Prominent Red */}
            {(index === 3 || index === 10) && (
              <span className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-full text-[11px] text-white font-bold flex items-center justify-center shadow-lg ring-2 ring-card">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tablet & Small Laptop: 3 columns */}
      <div className="hidden sm:grid md:hidden grid-cols-3 gap-2">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 aspect-square ${
              activeSection === item.section
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-gradient-to-br from-secondary/90 to-secondary/70 hover:from-primary hover:to-primary/90 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20'
            }`}
            title={item.label}
          >
            <div className="text-secondary-foreground group-hover:text-primary-foreground transition-colors">
              {item.icon}
            </div>
            <span className="text-[10px] font-bold text-secondary-foreground group-hover:text-primary-foreground transition-colors text-center leading-tight px-1">
              {item.label}
            </span>
            {(index === 3 || index === 10) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[8px] text-white font-bold flex items-center justify-center shadow-md animate-pulse">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Medium Laptop (13" & 14" with collapsed sidebar): 5 columns for better fit */}
      <div className="hidden md:grid lg:hidden grid-cols-5 gap-2">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 min-h-[4rem] ${
              activeSection === item.section
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-gradient-to-br from-secondary/90 to-secondary/70 hover:from-primary hover:to-primary/90 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20'
            }`}
            title={item.label}
          >
            <div className="text-secondary-foreground group-hover:text-primary-foreground transition-colors scale-90">
              {item.icon}
            </div>
            <span className="text-[9px] font-bold text-secondary-foreground group-hover:text-primary-foreground transition-colors text-center leading-tight px-0.5 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {item.label}
            </span>
            {(index === 3 || index === 10) && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full text-[7px] text-white font-bold flex items-center justify-center shadow-md animate-pulse">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Large Laptop (15" with collapsed sidebar): 4 columns */}
      <div className="hidden lg:grid xl:hidden grid-cols-4 gap-2.5">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border shadow-sm transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 min-h-[4.5rem] ${
              activeSection === item.section
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-gradient-to-br from-secondary/90 to-secondary/70 hover:from-primary hover:to-primary/90 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20'
            }`}
            title={item.label}
          >
            <div className="text-secondary-foreground group-hover:text-primary-foreground transition-colors">
              {item.icon}
            </div>
            <span className="text-[10px] font-bold text-secondary-foreground group-hover:text-primary-foreground transition-colors text-center leading-tight px-1 overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
              {item.label}
            </span>
            {(index === 3 || index === 10) && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full text-[8px] text-white font-bold flex items-center justify-center shadow-md animate-pulse">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Large Desktop (17"+ with full sidebar): 3 columns for better spacing */}
      <div className="hidden xl:grid grid-cols-3 gap-3">
        {allItems.map((item, index) => (
          <button
            key={index}
            onClick={() => handleClick(item.section)}
            className={`group relative flex flex-col items-center justify-center gap-3 p-4 rounded-xl border shadow-md transition-all duration-300 hover:-translate-y-1 active:translate-y-0 min-h-[5rem] ${
              activeSection === item.section
                ? 'bg-primary text-primary-foreground border-primary shadow-xl'
                : 'bg-gradient-to-br from-secondary/90 to-secondary/70 hover:from-primary hover:to-primary/90 border-border/50 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/30'
            }`}
            title={item.label}
          >
            <div className="text-secondary-foreground group-hover:text-primary-foreground transition-colors scale-110">
              {item.icon}
            </div>
            <span className="text-xs font-bold text-secondary-foreground group-hover:text-primary-foreground transition-colors text-center leading-tight px-1">
              {item.label}
            </span>
            {(index === 3 || index === 10) && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full text-[9px] text-white font-bold flex items-center justify-center shadow-lg animate-pulse">
                {index === 3 ? '5' : '2'}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Footer hint - responsive */}
      <div className="mt-3 sm:mt-4 pt-3 border-t border-border/50">
        <p className="text-[9px] sm:text-[10px] text-muted-foreground/60 text-center sm:text-left">
          <span className="sm:hidden">Tap any control • Showing {priorityItems.length}/{allItems.length}</span>
          <span className="hidden sm:inline">Click any control for quick access</span>
        </p>
      </div>
    </div>
  );
}
