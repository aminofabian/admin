'use client';

import { useState } from 'react';
import { Button, Input, PasswordInput, ConfirmPasswordInput } from './';
import { validatePassword } from '@/lib/utils/password-validation';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  title?: string;
  description?: string;
  username?: string;
  isLoading?: boolean;
}

export function PasswordResetModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Reset Password',
  description,
  username,
  isLoading = false,
}: PasswordResetModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  if (!isOpen) return null;

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
      await onConfirm(password);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg 
              className="w-6 h-6 text-blue-600 dark:text-blue-400" 
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
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {description || defaultDescription}
            </p>
            
            <form autoComplete="off" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
              <div className="space-y-4 mb-6">
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
              
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

