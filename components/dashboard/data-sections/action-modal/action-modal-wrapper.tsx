'use client';

import { ReactNode } from 'react';
import { Drawer } from '@/components/ui';

interface ActionModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: ReactNode;
}

export function ActionModalWrapper({
  isOpen,
  onClose,
  title,
  size = 'lg',
  children,
}: ActionModalWrapperProps) {
  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <div className="space-y-6">{children}</div>
    </Drawer>
  );
}

interface ModalHeaderProps {
  badges: ReactNode;
  amount: ReactNode;
  bonus?: ReactNode;
}

export function ModalHeader({ badges, amount, bonus }: ModalHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/50">
      <div className="flex items-center gap-3">{badges}</div>
      <div className="text-right">
        <div className="text-2xl font-bold text-foreground">{amount}</div>
        {bonus && (
          <div className="text-sm font-semibold text-green-600">{bonus}</div>
        )}
      </div>
    </div>
  );
}

interface ModalSectionProps {
  title: string;
  children: ReactNode;
}

export function ModalSection({ title, children }: ModalSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
}

interface ModalInfoGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function ModalInfoGrid({
  children,
  columns = 2,
}: ModalInfoGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
  }[columns];

  return <div className={`grid ${gridCols} gap-4`}>{children}</div>;
}

interface ModalInfoItemProps {
  label: string;
  value: ReactNode;
}

export function ModalInfoItem({ label, value }: ModalInfoItemProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

interface ModalInfoBoxProps {
  children: ReactNode;
  variant?: 'blue' | 'purple' | 'yellow' | 'green';
}

export function ModalInfoBox({
  children,
  variant = 'blue',
}: ModalInfoBoxProps) {
  const variants = {
    blue: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/30',
    purple:
      'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/30',
    yellow:
      'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900/30',
    green:
      'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30',
  };

  return (
    <div className={`p-4 ${variants[variant]} rounded-xl border`}>
      {children}
    </div>
  );
}

interface ModalInfoBoxItemProps {
  label: string;
  value: ReactNode;
  variant?: 'blue' | 'green' | 'purple';
}

export function ModalInfoBoxItem({
  label,
  value,
  variant = 'blue',
}: ModalInfoBoxItemProps) {
  const labelColors = {
    blue: 'text-blue-700 dark:text-blue-400',
    green: 'text-green-700 dark:text-green-400',
    purple: 'text-purple-700 dark:text-purple-400',
  };

  const valueColors = {
    blue: 'text-blue-900 dark:text-blue-100',
    green: 'text-green-900 dark:text-green-100',
    purple: 'text-purple-900 dark:text-purple-100',
  };

  return (
    <div className="space-y-1">
      <label
        className={`block text-xs font-semibold ${labelColors[variant]} uppercase tracking-wide`}
      >
        {label}
      </label>
      <div className={`text-lg font-bold ${valueColors[variant]}`}>{value}</div>
    </div>
  );
}

interface ModalIdDisplayProps {
  label: string;
  value: string;
}

export function ModalIdDisplay({ label, value }: ModalIdDisplayProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      <div className="text-sm font-mono font-medium text-foreground bg-muted/50 px-3 py-2 rounded-lg border border-border/30">
        {value}
      </div>
    </div>
  );
}

interface ModalRemarksProps {
  remarks: string;
}

export function ModalRemarks({ remarks }: ModalRemarksProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wide border-b border-border pb-2">
        Remarks
      </h3>
      <div className="text-sm text-foreground bg-yellow-50 dark:bg-yellow-950/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-900/30">
        {remarks}
      </div>
    </div>
  );
}
