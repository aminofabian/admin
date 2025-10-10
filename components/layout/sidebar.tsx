'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
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
    name: 'User Management',
    icon: '👥',
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Companies', href: '/dashboard/companies', icon: '🏢' },
      { name: 'Managers', href: '/dashboard/managers', icon: '👨‍💼' },
      { name: 'Agents', href: '/dashboard/agents', icon: '🤝' },
      { name: 'Players', href: '/dashboard/players', icon: '🎮' },
      { name: 'User Reports', href: '/dashboard/users/reports', icon: '📋' },
      { name: 'User Settings', href: '/dashboard/users/settings', icon: '⚙️' },
    ],
  },
  {
    name: 'Games & Content',
    icon: '🎯',
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Games', href: '/dashboard/games', icon: '🎮' },
      { name: 'Categories', href: '/dashboard/categories', icon: '📂' },
      { name: 'Tournaments', href: '/dashboard/tournaments', icon: '🏆' },
      { name: 'Game Analytics', href: '/dashboard/games/analytics', icon: '📈' },
    ],
  },
  {
    name: 'Financial',
    icon: '💰',
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Transactions', href: '/dashboard/transactions', icon: '💳' },
      { name: 'Bonuses', href: '/dashboard/bonuses', icon: '🎁' },
      { name: 'Payments', href: '/dashboard/payments', icon: '💵' },
      { name: 'Financial Reports', href: '/dashboard/finance/reports', icon: '📊' },
      { name: 'Settings', href: '/dashboard/finance/settings', icon: '⚙️' },
    ],
  },
  {
    name: 'Marketing',
    icon: '📢',
    roles: Object.values(USER_ROLES),
    submenu: [
      { name: 'Banners', href: '/dashboard/banners', icon: '🖼️' },
      { name: 'Affiliates', href: '/dashboard/affiliates', icon: '🔗' },
      { name: 'Campaigns', href: '/dashboard/campaigns', icon: '📣' },
      { name: 'Campaign Analytics', href: '/dashboard/marketing/analytics', icon: '📈' },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

function MenuItem({ 
  category, 
  pathname, 
  onClose 
}: { 
  category: MenuCategory; 
  pathname: string; 
  onClose?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubmenu = category.submenu && category.submenu.length > 0;
  const isActive = category.href && pathname === category.href;

  if (!hasSubmenu && category.href) {
    return (
      <Link
        href={category.href}
        onClick={onClose}
        className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-primary text-primary-foreground shadow-md'
            : 'text-foreground hover:bg-accent/80 hover:shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{category.icon}</span>
          <span>{category.name}</span>
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-accent/80 transition-all duration-200"
      >
        <div className="flex items-center space-x-3">
          <span className="text-lg">{category.icon}</span>
          <span>{category.name}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && category.submenu && (
        <div className="ml-4 space-y-1 border-l-2 border-border pl-2">
          {category.submenu.map((item) => {
            const isSubActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isSubActive
                    ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary -ml-[2px]'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const filteredCategories = user 
    ? MENU_CATEGORIES.filter((cat) => cat.roles.includes(user.role))
    : MENU_CATEGORIES;

  return (
    <aside className="w-full h-full bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-lg">A</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">Admin</h1>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* User Profile Section */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-md">
              <span className="text-primary-foreground font-semibold text-lg">
                {user?.username?.charAt(0).toUpperCase() || 'A'}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                {user?.username || 'Admin User'}
              </div>
              <div className="text-xs text-muted-foreground capitalize flex items-center space-x-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>{user?.role || 'SuperAdmin'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {filteredCategories.map((category) => (
          <MenuItem 
            key={category.name} 
            category={category} 
            pathname={pathname}
            onClose={onClose}
          />
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-4 border-t border-border bg-accent/30">
        <div className="text-xs space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-medium">System Status</span>
            <span className="flex items-center space-x-1 text-green-500">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              <span className="font-medium">Online</span>
            </span>
          </div>
          <div className="text-muted-foreground/80 text-[10px]">
            Version 2.1.4 • Updated 2h ago
          </div>
        </div>
      </div>
    </aside>
  );
}

