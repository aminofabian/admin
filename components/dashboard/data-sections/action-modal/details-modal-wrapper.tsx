'use client';

import { ReactNode } from 'react';
import { Modal } from '@/components/ui';
import { Button } from '@/components/ui/button';

interface DetailsModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function DetailsModalWrapper({
  isOpen,
  onClose,
  title,
  children,
}: DetailsModalWrapperProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-2">{children}</div>
    </Modal>
  );
}

interface DetailsCardProps {
  id: string;
  children: ReactNode;
}

export function DetailsCard({ id, children }: DetailsCardProps) {
  return (
    <div className="border border-border rounded-lg">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground">#{id}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}

interface DetailsHeaderProps {
  icon: ReactNode;
  label: string;
  status: string;
  statusColor?: 'red' | 'yellow' | 'green' | 'gray';
}

export function DetailsHeader({ icon, label, status, statusColor = 'yellow' }: DetailsHeaderProps) {
  const statusColors = {
    red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    gray: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };

  return (
    <div className="flex items-center justify-between pb-2 border-b border-border">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-xs font-semibold text-foreground">{label}</div>
        </div>
      </div>
      <div className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[statusColor]}`}>
        {status.toUpperCase()}
      </div>
    </div>
  );
}

interface DetailsRowProps {
  children: ReactNode;
}

export function DetailsRow({ children }: DetailsRowProps) {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

interface DetailsFieldProps {
  label: string;
  value: ReactNode;
}

export function DetailsField({ label, value }: DetailsFieldProps) {
  return (
    <div className="flex flex-col">
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}

interface DetailsHighlightBoxProps {
  label: string;
  value: ReactNode;
  variant?: 'blue' | 'green' | 'purple' | 'amber';
}

export function DetailsHighlightBox({ label, value, variant = 'blue' }: DetailsHighlightBoxProps) {
  const variants = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/30 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800/30 text-purple-600 dark:text-purple-400',
    amber: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300',
  };

  const [bgColor, textColor] = variants[variant].split(' text-');

  return (
    <div className={`p-1.5 ${bgColor} rounded border`}>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-sm font-bold text-${textColor}`}>{value}</div>
    </div>
  );
}

interface DetailsAmountBoxProps {
  amount: ReactNode;
  bonus?: ReactNode;
}

export function DetailsAmountBox({ amount, bonus }: DetailsAmountBoxProps) {
  return (
    <div className="p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-[10px] text-muted-foreground mb-0.5">Amount</div>
          <div className="text-base font-bold text-green-600 dark:text-green-400">{amount}</div>
        </div>
        {bonus && (
          <>
            <div className="h-6 w-px bg-green-300 dark:bg-green-700 mx-2" />
            <div className="flex-1 text-right">
              <div className="text-[10px] text-muted-foreground mb-0.5">Bonus</div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">{bonus}</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DetailsRemarksProps {
  remarks: string;
}

export function DetailsRemarks({ remarks }: DetailsRemarksProps) {
  return (
    <div className="mt-2 pt-2 border-t border-border">
      <div className="p-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded">
        <h4 className="text-[10px] font-semibold text-amber-900 dark:text-amber-200 mb-0.5">Remarks</h4>
        <p className="text-[10px] text-amber-800 dark:text-amber-300">{remarks}</p>
      </div>
    </div>
  );
}

interface DetailsCloseButtonProps {
  onClose: () => void;
}

export function DetailsCloseButton({ onClose }: DetailsCloseButtonProps) {
  return (
    <div className="flex justify-end pt-1.5 border-t border-border">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        size="sm"
        className="text-xs h-7 px-2"
      >
        Close
      </Button>
    </div>
  );
}

