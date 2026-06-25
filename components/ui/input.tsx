'use client';

import { InputHTMLAttributes, forwardRef, useState, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  compact?: boolean;
  hint?: ReactNode;
  showPasswordToggle?: boolean;
}

function PasswordToggleButton({
  visible,
  onToggle,
  disabled,
  compact,
}: {
  visible: boolean;
  onToggle: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      tabIndex={-1}
      aria-label={visible ? 'Hide password' : 'Show password'}
      className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:text-gray-300 ${
        compact ? 'right-1.5' : 'right-2'
      }`}
    >
      {visible ? (
        <svg className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
        </svg>
      ) : (
        <svg className={compact ? 'h-4 w-4' : 'h-5 w-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )}
    </button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, compact = false, showPasswordToggle = true, className = '', type, disabled, ...props }, ref) => {
    const [passwordVisible, setPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && passwordVisible ? 'text' : type;

    const inputClassName = `w-full border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed ${
      compact ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2'
    } ${isPassword && showPasswordToggle ? (compact ? 'pr-8' : 'pr-10') : ''} ${error ? 'border-red-500 dark:border-red-400' : ''} ${className}`;

    const inputElement = (
      <input
        ref={ref}
        type={inputType}
        disabled={disabled}
        className={inputClassName}
        {...props}
      />
    );

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
        {isPassword && showPasswordToggle ? (
          <div className="relative">
            {inputElement}
            <PasswordToggleButton
              visible={passwordVisible}
              onToggle={() => setPasswordVisible((v) => !v)}
              disabled={disabled}
              compact={compact}
            />
          </div>
        ) : (
          inputElement
        )}
        {error && (
          <p className={`text-red-600 dark:text-red-400 ${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'}`}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
