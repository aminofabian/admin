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
  validationRules?: PasswordValidationRules;
  onValidationChange?: (isValid: boolean) => void;
}

export function PasswordInput({
  label = 'Password',
  value,
  onChange,
  error: externalError,
  placeholder = 'Enter password',
  disabled = false,
  className = '',
  autoComplete = 'new-password',
  showRequirements = true,
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
    <div className="space-y-2">
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
      />
      {showRequirements && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
          <div className="flex items-start gap-2">
            <svg
              className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300 mb-1.5">
                Password Requirements:
              </p>
              <ul className="text-xs space-y-1.5">
                <li className={`flex items-center gap-2 transition-colors duration-200 ${requirements.minLength ? 'text-green-600 dark:text-green-400' : 'text-amber-800 dark:text-amber-300'}`}>
                  {requirements.minLength ? (
                    <svg className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-400">•</span>
                  )}
                  <span className={requirements.minLength ? 'font-medium' : ''}>Minimum 8 characters</span>
                </li>
                <li className={`flex items-center gap-2 transition-colors duration-200 ${requirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-amber-800 dark:text-amber-300'}`}>
                  {requirements.hasUppercase ? (
                    <svg className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-400">•</span>
                  )}
                  <span className={requirements.hasUppercase ? 'font-medium' : ''}>At least one uppercase letter</span>
                </li>
                <li className={`flex items-center gap-2 transition-colors duration-200 ${requirements.hasAlphabet && requirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-amber-800 dark:text-amber-300'}`}>
                  {(requirements.hasAlphabet && requirements.hasNumber) ? (
                    <svg className="w-4 h-4 flex-shrink-0 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-4 h-4 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-400">•</span>
                  )}
                  <span className={requirements.hasAlphabet && requirements.hasNumber ? 'font-medium' : ''}>Must contain both letters and numbers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
