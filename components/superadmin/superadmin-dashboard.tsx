'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Gamepad2,
  Phone,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { useProcessingWebSocketContext } from '@/contexts/processing-websocket-context';
import { timeOfDayGreeting } from '@/lib/utils/time-of-day-greeting';

interface Destination {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

interface Queue {
  label: string;
  href: string;
  icon: LucideIcon;
  count: number;
}

const MANAGE_DESTINATIONS: Destination[] = [
  { title: 'Companies', description: 'Whitelabels, domains, and admin accounts', href: '/dashboard/companies', icon: Building2 },
  { title: 'Games management', description: 'Enable games per company and switch the category 2 API', href: '/dashboard/games', icon: Gamepad2 },
  { title: 'Payment methods', description: 'Purchase and cashout methods per company', href: '/dashboard/settings/payment', icon: CreditCard },
];

const SETTING_SHORTCUTS: Destination[] = [
  { title: 'Company settings', description: 'Domains, logos, and services', href: '/dashboard/settings/company', icon: Building2 },
  { title: 'Verification', description: 'Phone OTP and identity checks', href: '/dashboard/settings/verification', icon: Phone },
  { title: 'Bonuses', description: 'Purchase, recharge, and signup bonuses', href: '/dashboard/settings/bonuses', icon: CircleDollarSign },
];

function DestinationRow({ destination }: { destination: Destination }) {
  const Icon = destination.icon;
  return (
    <Link href={destination.href} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{destination.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{destination.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </header>
      <div className="flex-1 divide-y divide-border">{children}</div>
    </section>
  );
}

function QueueCell({ queue }: { queue: Queue }) {
  const Icon = queue.icon;
  const isWaiting = queue.count > 0;
  return (
    <Link href={queue.href} className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-medium text-muted-foreground">{queue.label}</span>
        <span className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-foreground">{queue.count}</span>
          <span className={`flex items-center gap-1 text-xs ${isWaiting ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isWaiting ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            {isWaiting ? 'waiting' : 'clear'}
          </span>
        </span>
      </span>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function useGreeting(): string {
  const [greeting, setGreeting] = useState('Welcome back');
  useEffect(() => setGreeting(timeOfDayGreeting(new Date())), []);
  return greeting;
}

export function SuperAdminDashboard() {
  const { user } = useAuth();
  const { counts } = useProcessingWebSocketContext();
  const greeting = useGreeting();

  const queues: Queue[] = [
    { label: 'Purchases', href: '/dashboard/processing/purchase', icon: ShoppingBag, count: counts.purchase_count ?? 0 },
    { label: 'Cashouts', href: '/dashboard/processing/cashout', icon: Wallet, count: counts.cashout_count ?? 0 },
    { label: 'Game activities', href: '/dashboard/processing/game-activities', icon: Gamepad2, count: counts.game_activities_count ?? 0 },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
          {greeting}, {user?.username ?? 'superadmin'}
        </h1>
        <p className="text-sm text-muted-foreground">Live queues and controls across every company.</p>
      </div>

      <section aria-label="Processing queues" className="grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-border">
        {queues.map((queue) => (
          <QueueCell key={queue.href} queue={queue} />
        ))}
      </section>

      <div className="grid items-stretch gap-5 lg:grid-cols-2">
        <Panel title="Manage">
          {MANAGE_DESTINATIONS.map((destination) => (
            <DestinationRow key={destination.href} destination={destination} />
          ))}
        </Panel>
        <Panel
          title="Settings"
          action={
            <Link href="/dashboard/settings" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              All settings <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {SETTING_SHORTCUTS.map((destination) => (
            <DestinationRow key={destination.href} destination={destination} />
          ))}
        </Panel>
      </div>
    </div>
  );
}
