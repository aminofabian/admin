import { forwardRef } from 'react';

export type SwitchTone = 'default' | 'violet' | 'emerald';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  tone?: SwitchTone;
}

const TONE_ON: Record<SwitchTone, string> = {
  default: 'bg-gradient-to-r from-purple-600 to-indigo-600 focus:ring-purple-500',
  violet: 'bg-violet-600 focus:ring-violet-500',
  emerald: 'bg-emerald-600 focus:ring-emerald-500',
};

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    { checked, onChange, disabled = false, label, className = '', tone = 'default' },
    ref,
  ) => {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {label && (
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}
        <button
          ref={ref}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => !disabled && onChange(!checked)}
          className={`
            relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background
            disabled:cursor-not-allowed disabled:opacity-50
            ${checked ? TONE_ON[tone] : 'bg-muted-foreground/30 focus:ring-muted-foreground'}
          `}
        >
          <span
            className={`
              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
              ${checked ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = 'Switch';

