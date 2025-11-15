'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  isLoading = false,
  className = '',
}: SelectProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleToggle = useCallback(() => {
    if (!disabled && !isLoading) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled, isLoading]);

  const handleSelect = useCallback(
    (optionValue: string) => {
      if (options.find((opt) => opt.value === optionValue)?.disabled) {
        return;
      }
      onChange(optionValue);
      setIsOpen(false);
    },
    [onChange, options],
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const buttonClasses = `w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 text-sm shadow-sm transition-all duration-150 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 ${
    disabled || isLoading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
  } ${className}`;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={buttonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block text-left truncate">
          {isLoading ? (
            <span className="text-gray-500 dark:text-gray-400">Loading...</span>
          ) : selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
          )}
        </span>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-500 dark:text-gray-400">
          {isLoading ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" />
              <path className="opacity-75" d="M4 12a8 8 0 018-8" strokeWidth="4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </button>

      {isOpen && !disabled && !isLoading && (
        <div
          ref={selectRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          role="listbox"
        >
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = option.value === value;
              const isDisabled = option.disabled;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={isDisabled}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 font-medium'
                      : 'text-gray-900 dark:text-slate-100 hover:bg-gray-50 dark:hover:bg-slate-900'
                  } ${
                    isDisabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'cursor-pointer'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center justify-between">
                    <span>{option.label}</span>
                    {isSelected && (
                      <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

