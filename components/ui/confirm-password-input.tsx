'use client';

import { useMemo } from 'react';
import { Input } from './input';

interface ConfirmPasswordInputProps {
  label?: string;
  value: string;
  password: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
}

export function ConfirmPasswordInput({
  label = 'Confirm Password',
  value,
  password,
  onChange,
  error: externalError,
  placeholder = 'Re-enter your password',
  disabled = false,
  className = '',
  autoComplete = 'new-password',
}: ConfirmPasswordInputProps) {
  const matchStatus = useMemo(() => {
    if (!value) return null;
    if (value === password) return 'match';
    return 'mismatch';
  }, [value, password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const displayError = externalError;

  return (
    <div className="space-y-2">
      <div className="relative w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type="password"
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`w-full px-3 py-2 pr-10 border rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors duration-200 ${
              displayError
                ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                : matchStatus === 'match'
                ? 'border-green-500 dark:border-green-400 focus:ring-green-500'
                : matchStatus === 'mismatch'
                ? 'border-red-500 dark:border-red-400 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
            } ${className}`}
          />
          {matchStatus === 'match' && value && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {matchStatus === 'mismatch' && value && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          )}
        </div>
        {displayError && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{displayError}</p>
        )}
      </div>
      {matchStatus === 'match' && value && !displayError && (
        <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1.5 animate-in fade-in duration-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">Passwords match</span>
        </p>
      )}
      {matchStatus === 'mismatch' && value && !displayError && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 animate-in fade-in duration-200">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <span>Passwords do not match</span>
        </p>
      )}
    </div>
  );
}
