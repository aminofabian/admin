'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import type { SettingItem } from '@/lib/constants/settings-catalog';
import { groupSettingsForRole, type SettingSection } from '@/lib/utils/group-settings-for-role';
import { StaffSettingsSection } from '@/components/staff';
import { ManagerSettingsSection } from '@/components/manager';

function SettingRow({ item }: { item: SettingItem }) {
  const ItemIcon = item.icon;
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        <ItemIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-foreground">{item.title}</span>
        <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

function SettingSectionCard({ section }: { section: SettingSection }) {
  return (
    <section className="mb-4 break-inside-avoid overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="border-b border-border bg-muted/30 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {section.title}
      </h2>
      <div className="divide-y divide-border">
        {section.items.map((item) => (
          <SettingRow key={item.id} item={item} />
        ))}
      </div>
    </section>
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

  const sections = groupSettingsForRole(user?.role);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">Settings</h1>
        <p className="text-sm text-muted-foreground">Configure the platform, payments, and player rewards.</p>
      </div>
      <div className="gap-4 md:columns-2">
        {sections.map((section) => (
          <SettingSectionCard key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
