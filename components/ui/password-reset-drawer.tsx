'use client';

import { useState } from 'react';
import { Drawer, Button, Input, PasswordInput, ConfirmPasswordInput } from './';
import { validatePassword } from '@/lib/utils/password-validation';

interface PasswordResetDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string, confirmPassword: string) => Promise<void>;
  title?: string;
  description?: string;
  username?: string;
  isLoading?: boolean;
}

export function PasswordResetDrawer({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reset Password',
  description,
  username,
  isLoading = false,
}: PasswordResetDrawerProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = (): boolean => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        newErrors.password = passwordValidation.errors[0];
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm the password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    try {
      await onConfirm(password, confirmPassword);
      // Reset form on success
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    } catch {
      // Error handling is done by parent component
    }
  };

  const handleClose = () => {
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    onClose();
  };

  const defaultDescription = username
    ? `Enter a new password for "${username}". The user will need to use this password to log in.`
    : 'Enter a new password for this user. The user will need to use this password to log in.';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
            className="px-6 py-2.5 font-medium transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            isLoading={isLoading}
            className="px-6 py-2.5 font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Description */}
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
          <svg 
            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
            />
          </svg>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            {description || defaultDescription}
          </p>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div>
            <PasswordInput
              label="New Password"
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="Enter new password"
              error={errors.password}
              disabled={isLoading}
              className="w-full"
              autoComplete="new-password"
            />
          </div>
          
          <div>
            <ConfirmPasswordInput
              label="Confirm Password"
              value={confirmPassword}
              password={password}
              onChange={(value) => {
                setConfirmPassword(value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              placeholder="Confirm new password"
              error={errors.confirmPassword}
              disabled={isLoading}
              className="w-full"
              autoComplete="new-password"
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

