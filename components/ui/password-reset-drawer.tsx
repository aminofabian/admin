'use client';

import { useState } from 'react';
import { Drawer, Button, Input } from './';

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
    } else if (password.length < 5) {
      newErrors.password = 'Password must be at least 5 characters';
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
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
        </div>
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
            <Input
              type="password"
              label="New Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) {
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }
              }}
              placeholder="Enter new password (min 5 characters)"
              error={errors.password}
              disabled={isLoading}
              className="w-full"
            />
          </div>
          
          <div>
            <Input
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) {
                  setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                }
              }}
              placeholder="Confirm new password"
              error={errors.confirmPassword}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

