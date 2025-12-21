'use client';

import { useState, FormEvent } from 'react';
import { Input, Button, PasswordInput } from '@/components/ui';
import { validatePassword } from '@/lib/utils/password-validation';
import type { Agent, CreateUserRequest, UpdateUserRequest } from '@/types';

interface AgentFormProps {
  agent?: Agent;
  onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AgentForm = ({ agent, onSubmit, onCancel, isLoading }: AgentFormProps) => {
  const isEditMode = !!agent;
  
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: agent?.username || '',
    email: agent?.email || '',
    password: '',
    role: 'agent',
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
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0];
        }
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
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
      <div className="grid grid-cols-1 gap-4">
        {/* Username */}
        <Input
          label="Username *"
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          placeholder="agent123"
          disabled={isLoading || isEditMode}
          autoComplete="off"
        />

        {/* Email */}
        <Input
          label="Email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="agent@example.com"
          disabled={isLoading || isEditMode}
          autoComplete="off"
        />

        {/* Password (only for create) */}
        {!isEditMode && (
          <PasswordInput
            label="Password *"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            error={errors.password}
            placeholder="Enter password"
            disabled={isLoading}
            autoComplete="new-password"
          />
        )}

        {/* Role (hidden, always agent) */}
        <input type="hidden" value="agent" autoComplete="off" />
      </div>

      {isEditMode && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
          <strong>Note:</strong> Username and email cannot be changed. Use the status toggle button in the table to activate/deactivate this agent.
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
            Create Agent
          </Button>
        )}
      </div>
    </form>
  );
};

