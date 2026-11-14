'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { StaffSettingsSection } from '@/components/staff';
import { ManagerSettingsSection } from '@/components/manager';

type SettingGroup = 'games' | 'platform' | 'payments' | 'players' | 'growth' | 'email';

interface SettingItem {
  id: string;
  title: string;
  description: string;
  href: string;
  group: SettingGroup;
  permissions: string[];
  emphasis?: boolean;
  icon: ReactNode;
}

const GROUPS: { id: SettingGroup; title: string; description: string }[] = [
  {
    id: 'games',
    title: 'Games',
    description: 'Which games are available, and which game API category 2 uses.',
  },
  {
    id: 'platform',
    title: 'Platform',
    description: 'Companies and how each whitelabel is set up.',
  },
  {
    id: 'payments',
    title: 'Payments',
    description: 'How players buy in and cash out.',
  },
  {
    id: 'players',
    title: 'Players',
    description: 'Signup checks, bonuses, and the prize wheel.',
  },
  {
    id: 'growth',
    title: 'Referrals',
    description: 'How players and affiliates bring in new players.',
  },
  {
    id: 'email',
    title: 'Email',
    description: 'Messages players receive automatically or from a campaign.',
  },
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {children}
    </svg>
  );
}

const settingsCategories: SettingItem[] = [
  {
    id: 'game-api',
    title: 'Category 2 game API',
    description: 'Switch category 2 games between API v1 and v2. Use v1 while v2 is down.',
    href: '/dashboard/games',
    group: 'games',
    permissions: ['superadmin'],
    emphasis: true,
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </Icon>
    ),
  },
  {
    id: 'games',
    title: 'Game settings',
    description: 'Minimum redeem multiplier for games.',
    href: '/dashboard/settings/games',
    group: 'games',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h1m4 0h1m6-7a9 9 0 11-18 0 9 9 0 0118 0z" />
      </Icon>
    ),
  },
  {
    id: 'roulette',
    title: 'Prize wheel',
    description: 'Daily free spins and the rewards on the wheel.',
    href: '/dashboard/settings/roulette',
    group: 'players',
    permissions: ['company', 'superadmin'],
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <circle cx="12" cy="12" r="9" strokeWidth={2} />
        <path strokeLinecap="round" strokeWidth={2} d="M12 3v2M12 19v2M3 12h2M19 12h2" />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    ),
  },
  {
    id: 'company',
    title: 'Company settings',
    description: 'Domains, logos, admin accounts, and service configuration.',
    href: '/dashboard/settings/company',
    group: 'platform',
    permissions: ['superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </Icon>
    ),
  },
  {
    id: 'payment',
    title: 'Payment methods',
    description: 'Turn purchase and cashout methods on or off for each company.',
    href: '/dashboard/settings/payment',
    group: 'payments',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </Icon>
    ),
  },
  {
    id: 'cashout-24h',
    title: '24-hour cashout limit',
    description: 'The rolling 24-hour cashout cap, separate from the wallet limit.',
    href: '/dashboard/settings/cashout-24h',
    group: 'payments',
    permissions: ['company', 'superadmin', 'manager'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </Icon>
    ),
  },
  {
    id: 'bonuses',
    title: 'Bonuses',
    description: 'Purchase, recharge, transfer, and signup bonus rules.',
    href: '/dashboard/settings/bonuses',
    group: 'players',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </Icon>
    ),
  },
  {
    id: 'verification',
    title: 'Verification',
    description: 'Phone OTP and identity checks during signup and Complete Profile.',
    href: '/dashboard/settings/verification',
    group: 'players',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </Icon>
    ),
  },
  {
    id: 'referral',
    title: 'Referral program',
    description: 'Turn referrals on or off and set the rewards.',
    href: '/dashboard/settings/referral',
    group: 'growth',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </Icon>
    ),
  },
  {
    id: 'referral-promo-codes',
    title: 'Promo codes',
    description: 'Custom codes players can use when they sign up.',
    href: '/dashboard/settings/referral-promo-codes',
    group: 'growth',
    permissions: ['company', 'superadmin', 'manager'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </Icon>
    ),
  },
  {
    id: 'affiliate',
    title: 'Affiliate defaults',
    description: 'Default commission and fee settings for affiliates.',
    href: '/dashboard/settings/affiliate',
    group: 'growth',
    permissions: ['company', 'superadmin'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </Icon>
    ),
  },
  {
    id: 'email-templates',
    title: 'Email templates',
    description: 'Transactional emails sent automatically to players.',
    href: '/dashboard/settings/email-templates',
    group: 'email',
    permissions: ['company', 'manager', 'staff'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </Icon>
    ),
  },
  {
    id: 'email-broadcasts',
    title: 'Email campaigns',
    description: 'Compose, schedule, and review marketing broadcasts.',
    href: '/dashboard/settings/email-broadcasts',
    group: 'email',
    permissions: ['company', 'manager', 'staff'],
    icon: (
      <Icon>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </Icon>
    ),
  },
];

function SettingLink({ item }: { item: SettingItem }) {
  return (
    <Link
      href={item.href}
      className={`group flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 ${
        item.emphasis
          ? 'border-amber-300/80 bg-amber-50/80 dark:border-amber-700/60 dark:bg-amber-950/30'
          : 'border-border'
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
          item.emphasis
            ? 'bg-amber-500 text-white'
            : 'bg-muted text-foreground group-hover:bg-primary group-hover:text-primary-foreground'
        }`}
      >
        {item.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{item.title}</h3>
          {item.emphasis ? (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-200">
              Live switch
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">{item.description}</p>
      </div>
      <svg
        className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();

  if (user?.role === USER_ROLES.STAFF) {
    return <StaffSettingsSection />;
  }

  if (user?.role === USER_ROLES.MANAGER) {
    return <ManagerSettingsSection />;
  }

  const visible = settingsCategories.filter((category) => {
    if (!user?.role) return false;
    return category.permissions.includes(user.role);
  });

  const groups = GROUPS.map((group) => ({
    ...group,
    items: visible.filter((item) => item.group === group.id),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a section below. Each row opens that setting.
        </p>
      </div>

      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
          </div>
          <div className="space-y-2">
            {group.items.map((item) => (
              <SettingLink key={item.id} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
