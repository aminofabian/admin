'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { Manager, CreateUserRequest, UpdateUserRequest } from '@/types';

interface ManagerFormProps {
  manager?: Manager;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ManagerForm = ({ manager, onSubmit, onCancel, isLoading }: ManagerFormProps) => {
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Username */}
        <Input
          label="Username *"
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          placeholder="manager123"
          disabled={isLoading || isEditMode}
        />

        {/* Email */}
        <Input
          label="Email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="manager@example.com"
          disabled={isLoading || isEditMode}
        />

        {/* Password (only for create) */}
        {!isEditMode && (
          <Input
            label="Password *"
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            placeholder="Minimum 5 characters"
            disabled={isLoading}
          />
        )}

        {/* Role (hidden, always manager) */}
        <input type="hidden" value="manager" />
      </div>

      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
          <strong>Note:</strong> Username and email cannot be changed. Use the status toggle button in the table to activate/deactivate this manager.
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          {isEditMode ? 'Close' : 'Cancel'}
        </Button>
        {!isEditMode && (
          <Button
            type="submit"
            isLoading={isLoading}
            disabled={isLoading}
          >
            Create Manager
          </Button>
        )}
      </div>
    </form>
  );
};

