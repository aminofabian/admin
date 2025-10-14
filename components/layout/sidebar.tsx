'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { Logo } from '@/components/ui';
import { useState } from 'react';

interface SubMenuItem {
  name: string;
  href: string;
  icon: string;
}

interface MenuCategory {
  name: string;
  icon: string;
  roles: string[];
  href?: string;
  submenu?: SubMenuItem[];
}

const MENU_CATEGORIES: MenuCategory[] = [
  {
    name: 'Dashboard',
    icon: '📊',
    roles: Object.values(USER_ROLES),
    href: '/dashboard',
  },
  {
    name: 'Companies',
    icon: '🏢',
    roles: [USER_ROLES.SUPERADMIN],
    href: '/dashboard/companies',
  },
  {
    name: 'User Management',
    icon: '👥',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER, USER_ROLES.AGENT],
    submenu: [
      { name: 'Managers', href: '/dashboard/managers', icon: '👨‍💼' },
      { name: 'Agents', href: '/dashboard/agents', icon: '🤝' },
      { name: 'Staffs', href: '/dashboard/staffs', icon: '👔' },
      { name: 'Players', href: '/dashboard/players', icon: '🎮' },
    ],
  },
  {
    name: 'Games',
    icon: '🎯',
    roles: Object.values(USER_ROLES),
    href: '/dashboard/games',
  },
  {
    name: 'Transactions',
    icon: '💳',
    roles: Object.values(USER_ROLES),
    href: '/dashboard/transactions',
  },
  {
    name: 'Bonuses',
    icon: '🎁',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/bonuses',
  },
  {
    name: 'Banners',
    icon: '🖼️',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY],
    href: '/dashboard/banners',
  },
  {
    name: 'Affiliates',
    icon: '🔗',
    roles: [USER_ROLES.SUPERADMIN, USER_ROLES.COMPANY, USER_ROLES.MANAGER],
    href: '/dashboard/affiliates',
  },
];

interface SidebarProps {
  onClose?: () => void;
  isCollapsed?: boolean;
}

function MenuItem({ 
  category, 
  pathname, 
  onClose,
  isCollapsed 
}: { 
  category: MenuCategory; 
  pathname: string; 
  onClose?: () => void;
  isCollapsed?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubmenu = category.submenu && category.submenu.length > 0;
  const isActive = category.href && pathname === category.href;

  if (!hasSubmenu && category.href) {
    return (
      <Link
        href={category.href}
        onClick={onClose}
        className={`group relative flex items-center justify-center md:justify-center xl:justify-start gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[0.98]'
            : 'text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99]'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <span className="text-lg md:text-xl xl:text-lg shrink-0 transition-transform group-hover:scale-110">
          {category.icon}
        </span>
        <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
        )}
      </Link>
    );
  }

  // For collapsed state with submenu - show first item
  if (isCollapsed && hasSubmenu && category.submenu) {
    const firstItem = category.submenu[0];
    return (
      <Link
        href={firstItem.href}
        onClick={onClose}
        className="group relative flex items-center justify-center md:justify-center xl:justify-start gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99] transition-all duration-300 rounded-lg"
        title={category.name}
      >
        <span className="text-lg md:text-xl xl:text-lg shrink-0 transition-transform group-hover:scale-110">
          {category.icon}
        </span>
        <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
      </Link>
    );
  }

  return (
    <div className="space-y-1.5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`group w-full flex items-center justify-center md:justify-center xl:justify-between gap-3 px-4 md:px-3 xl:px-4 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium transition-all duration-300 rounded-lg ${
          isExpanded 
            ? 'bg-accent/70 text-foreground shadow-sm' 
            : 'text-foreground/80 hover:text-foreground hover:bg-accent/60 hover:shadow-sm hover:scale-[0.99]'
        }`}
        title={isCollapsed ? category.name : undefined}
      >
        <div className="flex items-center justify-center md:justify-center xl:justify-start gap-3">
          <span className="text-lg md:text-xl xl:text-lg shrink-0 transition-transform group-hover:scale-110">
            {category.icon}
          </span>
          <span className="md:hidden xl:block truncate text-sm font-medium">{category.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-all duration-300 md:hidden xl:block ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && category.submenu && (
        <div className="space-y-1 pl-0 md:pl-0 xl:pl-3 pt-1">
          {category.submenu.map((item) => {
            const isSubActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-center md:justify-center xl:justify-start gap-2.5 px-4 md:px-3 xl:px-3.5 py-2 md:py-1.5 xl:py-2 text-sm transition-all duration-300 rounded-lg border-l-2 ${
                  isSubActive
                    ? 'bg-primary/10 text-primary font-medium border-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/50 border-transparent hover:border-accent'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <span className="text-base md:text-lg xl:text-base shrink-0 transition-transform group-hover:scale-110">
                  {item.icon}
                </span>
                <span className="md:hidden xl:block truncate text-sm">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose, isCollapsed = true }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredCategories = user 
    ? MENU_CATEGORIES.filter((cat) => cat.roles.includes(user.role))
    : MENU_CATEGORIES;

  const handleLogout = () => {
    logout();
    onClose?.();
  };

  return (
    <aside className="w-full h-screen bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-3 xl:p-4 flex items-center justify-center md:justify-center xl:justify-between border-b border-border/50 bg-gradient-to-r from-background to-accent/10">
        <Logo 
          showText={true} 
          size="sm" 
          className="md:scale-75 xl:scale-85"
        />
        <button
          onClick={onClose}
          className="md:hidden p-2 hover:bg-accent/80 active:bg-accent transition-all duration-200 rounded-lg absolute right-3 top-3 hover:rotate-90"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-3 md:p-2.5 xl:p-3">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-xl p-3 md:p-2.5 xl:p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-300">
          <div className="flex items-center md:flex-col md:gap-2 xl:flex-row xl:gap-3">
            <div className="w-10 h-10 md:w-9 md:h-9 xl:w-10 xl:h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md shrink-0 ring-2 ring-primary/20">
              <span className="text-primary-foreground font-bold text-sm md:text-xs xl:text-sm">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1 md:text-center xl:text-left min-w-0">
              <div className="font-semibold text-foreground text-sm md:text-xs xl:text-sm truncate">
                {user?.username || 'Admin'}
              </div>
              <div className="text-muted-foreground capitalize text-xs md:text-[10px] xl:text-xs flex items-center md:justify-center xl:justify-start gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full shrink-0 animate-pulse"></span>
                <span className="truncate">{user?.role || 'SuperAdmin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2">
        {filteredCategories.map((category) => (
          <MenuItem
            key={category.name}
            category={category}
            pathname={pathname}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      {/* Footer Section */}
      <div className="border-t border-border/50 bg-gradient-to-t from-accent/20 to-transparent p-3 md:p-2.5 xl:p-3 space-y-3">
        <div className="text-xs md:text-center xl:text-left space-y-1.5">
          <div className="flex items-center md:flex-col md:gap-1 xl:flex-row xl:justify-between text-muted-foreground">
            <span className="font-medium text-[10px] md:text-[9px] xl:text-[10px]">Status</span>
            <span className="flex items-center text-green-500 text-[10px] md:text-[9px] xl:text-[10px] gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shrink-0 shadow-sm shadow-green-500/50"></span>
              <span className="font-medium">Online</span>
            </span>
          </div>
          <div className="text-muted-foreground/80 text-[9px] md:text-[8px] xl:text-[9px] md:hidden xl:block">
            v2.1.4 • Updated 2h ago
          </div>
        </div>
        
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="group w-full flex items-center justify-center md:justify-center xl:justify-start gap-2.5 px-3 py-2.5 md:py-2 xl:py-2.5 text-sm font-medium text-destructive hover:text-destructive-foreground hover:bg-destructive transition-all duration-300 rounded-lg border border-destructive/30 hover:border-destructive shadow-sm hover:shadow-md active:scale-95"
          title="Logout"
        >
          <svg 
            className="w-4 h-4 md:w-3.5 md:h-3.5 xl:w-4 xl:h-4 shrink-0 transition-transform group-hover:translate-x-0.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
            />
          </svg>
          <span className="md:hidden xl:block text-sm font-semibold">Logout</span>
        </button>
      </div>
    </aside>
  );
}
