import { forwardRef } from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onChange, disabled = false, label, className = '' }, ref) => {
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
            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${checked 
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600' 
              : 'bg-gray-300 dark:bg-gray-600'
            }
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

