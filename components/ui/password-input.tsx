'use client';

import { useState, useCallback, useMemo } from 'react';
import { Input } from './input';
import { validatePassword, getPasswordErrorMessage, type PasswordValidationRules } from '@/lib/utils/password-validation';

interface PasswordInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoComplete?: string;
  showRequirements?: boolean;
  compact?: boolean;
  validationRules?: PasswordValidationRules;
  onValidationChange?: (isValid: boolean) => void;
}

function RequirementChips({
  requirements,
}: {
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasAlphabet: boolean;
    hasNumber: boolean;
  };
}) {
  const chips = [
    { met: requirements.minLength, label: '8+ chars', icon: '8' },
    { met: requirements.hasUppercase, label: 'A-Z', icon: 'A' },
    { met: requirements.hasAlphabet && requirements.hasNumber, label: 'A-z 0-9', icon: 'A1' },
  ];

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {chips.map((chip) => (
        <span
          key={chip.label}
          title={chip.label}
          className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-px text-[10px] font-medium transition-colors ${
            chip.met
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500'
          }`}
        >
          <span
            className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold ${
              chip.met ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
            }`}
          >
            {chip.met ? (
              <svg className="h-2 w-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              chip.icon
            )}
          </span>
          {chip.label}
        </span>
      ))}
    </div>
  );
}

export function PasswordInput({
  label = 'Password',
  value,
  onChange,
  error: externalError,
  placeholder = 'Min 8 chars, A-Z, letters & numbers',
  disabled = false,
  className = '',
  autoComplete = 'new-password',
  showRequirements = true,
  compact = false,
  validationRules,
  onValidationChange,
}: PasswordInputProps) {
  const [internalError, setInternalError] = useState<string>('');

  const validation = useMemo(() => {
    if (!value) {
      return {
        isValid: false,
        errors: [],
        requirements: {
          minLength: false,
          hasUppercase: false,
          hasNumber: false,
          hasAlphabet: false,
        },
      };
    }
    return validatePassword(value, validationRules);
  }, [value, validationRules]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      onChange(newValue);

      if (newValue) {
        const validationResult = validatePassword(newValue, validationRules);
        const errorMessage = getPasswordErrorMessage(validationResult.errors);
        setInternalError(errorMessage);

        if (onValidationChange) {
          onValidationChange(validationResult.isValid);
        }
      } else {
        setInternalError('');
        if (onValidationChange) {
          onValidationChange(false);
        }
      }
    },
    [onChange, validationRules, onValidationChange]
  );

  const handleBlur = useCallback(() => {
    if (value) {
      const validationResult = validatePassword(value, validationRules);
      const errorMessage = getPasswordErrorMessage(validationResult.errors);
      setInternalError(errorMessage);
    }
  }, [value, validationRules]);

  const displayError = externalError || internalError;
  const requirements = validation.requirements;

  return (
    <Input
      label={label}
      type="password"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={displayError}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      autoComplete={autoComplete}
      compact={compact}
      hint={showRequirements ? <RequirementChips requirements={requirements} /> : undefined}
    />
  );
}
