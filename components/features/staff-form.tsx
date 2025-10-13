'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { Staff, CreateUserRequest, UpdateUserRequest } from '@/types';

interface StaffFormProps {
  staff?: Staff;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const StaffForm = ({ staff, onSubmit, onCancel, isLoading }: StaffFormProps) => {
  const isEditMode = !!staff;
  
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: staff?.username || '',
    email: staff?.email || '',
    password: '',
    role: 'staff',
    mobile_number: staff?.mobile_number || '',
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

    // Mobile number validation (optional but if provided, must be valid)
    if (formData.mobile_number && formData.mobile_number.trim()) {
      const mobileRegex = /^\+?[\d\s\-\(\)]+$/;
      if (!mobileRegex.test(formData.mobile_number)) {
        newErrors.mobile_number = 'Please enter a valid mobile number';
      }
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
        // For edit, only send mobile_number and is_active changes
        const updateData: UpdateUserRequest = {
          mobile_number: formData.mobile_number,
        };
        
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
          placeholder="staff123"
          disabled={isLoading || isEditMode}
        />

        {/* Email */}
        <Input
          label="Email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="staff@example.com"
          disabled={isLoading || isEditMode}
        />

        {/* Mobile Number */}
        <Input
          label="Mobile Number"
          type="tel"
          value={formData.mobile_number}
          onChange={(e) => handleChange('mobile_number', e.target.value)}
          error={errors.mobile_number}
          placeholder="+1234567890"
          disabled={isLoading}
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

        {/* Role (hidden, always staff) */}
        <input type="hidden" value="staff" />
      </div>

      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
          <strong>Note:</strong> Username and email cannot be changed. Mobile number can be updated. Use the status toggle button in the table to activate/deactivate this staff member.
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
            Create Staff
          </Button>
        )}
      </div>
    </form>
  );
};
