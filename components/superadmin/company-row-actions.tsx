'use client';

import type { LucideIcon } from 'lucide-react';
import { KeyRound, Pencil, Power } from 'lucide-react';

interface CompanyRowActionsProps {
  isActive: boolean;
  onEdit: () => void;
  onChangePassword: () => void;
  onToggleStatus: () => void;
}

function ActionButton({ label, icon: Icon, onClick, tone = 'default' }: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  tone?: 'default' | 'danger' | 'success';
}) {
  const toneStyles = {
    default: 'hover:bg-muted hover:text-foreground',
    danger: 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400',
    success: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${toneStyles[tone]}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

export function CompanyRowActions({ isActive, onEdit, onChangePassword, onToggleStatus }: CompanyRowActionsProps) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <ActionButton label="Edit company" icon={Pencil} onClick={onEdit} />
      <ActionButton label="Change password" icon={KeyRound} onClick={onChangePassword} />
      <ActionButton
        label={isActive ? 'Deactivate company' : 'Activate company'}
        icon={Power}
        onClick={onToggleStatus}
        tone={isActive ? 'danger' : 'success'}
      />
    </div>
  );
}
