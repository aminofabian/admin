'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ReactElement, RefObject } from 'react';

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

interface MenuPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function useSelectMenuPosition(
  isOpen: boolean,
  triggerRef: RefObject<HTMLButtonElement | null>,
  menuRef: RefObject<HTMLDivElement | null>,
) {
  const [position, setPosition] = useState<MenuPosition | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuHeight = menuRef.current?.getBoundingClientRect().height ?? 240;
      const gap = 4;
      const viewportPadding = 8;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openAbove = spaceBelow < Math.min(menuHeight, 240) && spaceAbove > spaceBelow;

      const maxHeight = openAbove
        ? Math.max(120, spaceAbove - gap)
        : Math.max(120, spaceBelow - gap);

      const top = openAbove
        ? Math.max(viewportPadding, rect.top - Math.min(menuHeight, maxHeight) - gap)
        : rect.bottom + gap;

      setPosition({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    const frameId = requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, triggerRef, menuRef]);

  return position;
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
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const position = useSelectMenuPosition(isOpen, buttonRef, menuRef);

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

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, closeMenu]);

  const buttonClasses = `w-full appearance-none px-3 py-2 pr-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 text-sm shadow-sm transition-all duration-150 focus:border-blue-500 dark:focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/30 ${
    isOpen ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20 dark:ring-blue-500/30' : ''
  } ${
    disabled || isLoading ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
  } ${className}`;

  const menu =
    isOpen && !disabled && !isLoading && position ? (
      <div
        ref={menuRef}
        className="fixed overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-gray-700 dark:bg-slate-950"
        style={{
          zIndex: 9999,
          top: position.top,
          left: position.left,
          width: position.width,
          maxHeight: position.maxHeight,
        }}
        role="listbox"
      >
        {options.length === 0 ? (
          <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
            No options available
          </div>
        ) : (
          options.map((option) => {
            const isSelected = option.value === value;
            const isOptionDisabled = option.disabled;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={isOptionDisabled}
                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-blue-50 font-medium text-blue-900 dark:bg-blue-900/30 dark:text-blue-100'
                    : 'text-gray-900 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-900'
                } ${
                  isOptionDisabled
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center justify-between">
                  <span>{option.label}</span>
                  {isSelected && (
                    <svg
                      className="h-4 w-4 text-blue-600 dark:text-blue-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
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
    ) : null;

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
        <span className="block truncate text-left">
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

      {typeof window !== 'undefined' && menu ? createPortal(menu, document.body) : null}
    </div>
  );
}
