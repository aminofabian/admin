'use client';

import { useState, FormEvent } from 'react';
import { Input } from '@/components/ui';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';

interface ManagerFormProps {
  manager?: Manager;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ManagerForm = ({ manager, onSubmit, isLoading }: ManagerFormProps) => {
  const isEditMode = !!manager;
  
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: manager?.username || '',
    email: manager?.email || '',
    password: '',
    role: 'manager',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Username must be alphanumeric (letters and numbers only)';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Must be a valid email address';
    }

    // Password validation (only required for create mode)
    if (!isEditMode) {
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 5) {
        newErrors.password = 'Password must be at least 5 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      if (isEditMode) {
        // For edit, only send username and email (and password if provided)
        const updateData: UpdateUserRequest = {};
        
        // In edit mode, we typically don't change username/email
        // Only status changes via toggle button, so this form is mainly for viewing
        // But we'll keep it flexible for future enhancements
        
        await onSubmit(updateData as CreateUserRequest | UpdateUserRequest);
      } else {
        await onSubmit(formData as CreateUserRequest | UpdateUserRequest);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof CreateUserRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form id="create-manager-form" onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Basic Information
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Username *"
            type="text"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            error={errors.username}
            placeholder="manager123"
            disabled={isLoading || isEditMode}
            className="transition-all duration-200"
          />

          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder="manager@example.com"
            disabled={isLoading || isEditMode}
            className="transition-all duration-200"
          />
        </div>
      </div>

      {/* Account Security Section */}
      {!isEditMode && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
            <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
              Account Security
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Password *"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              placeholder="Minimum 5 characters"
              disabled={isLoading}
              className="transition-all duration-200"
            />
            <div className="hidden md:block" /> {/* Spacer for grid */}
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-medium">Password Requirements:</span> Must be at least 5 characters long. Choose a strong password to secure the manager&apos;s account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden role field */}
      <input type="hidden" value="manager" />

      {isEditMode && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <span className="font-medium">Note:</span> Username and email cannot be changed. Use the status toggle button in the table to activate/deactivate this manager.
            </p>
          </div>
        </div>
      )}
    </form>
  );
};

