import { InputHTMLAttributes, forwardRef, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  compact?: boolean;
  hint?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, compact = false, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <div className={`flex items-center justify-between gap-2 ${compact ? 'mb-0.5' : 'mb-1'}`}>
            <label className={`font-medium text-gray-700 dark:text-gray-300 ${compact ? 'text-xs' : 'text-sm'}`}>
              {label}
            </label>
            {hint}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed ${
            compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2'
          } ${error ? 'border-red-500 dark:border-red-400' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className={`text-red-600 dark:text-red-400 ${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

