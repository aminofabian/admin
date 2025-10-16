'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { Player, CreatePlayerRequest, UpdateUserRequest } from '@/types';

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const PlayerForm = ({ player, onSubmit, onCancel, isLoading }: PlayerFormProps) => {
  const isEditMode = !!player;
  
  const [formData, setFormData] = useState<CreatePlayerRequest>({
    username: player?.username || '',
    full_name: player?.full_name || '',
    dob: player?.dob || '',
    email: player?.email || '',
    mobile_number: player?.mobile_number || '',
    password: '',
    role: 'player',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Username must be alphanumeric';
    }

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Must be a valid email address';
    }

    if (!isEditMode) {
      if (!formData.dob.trim()) {
        newErrors.dob = 'Date of birth is required';
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.dob)) {
        newErrors.dob = 'Must be in YYYY-MM-DD format';
      }

      if (!formData.mobile_number.trim()) {
        newErrors.mobile_number = 'Mobile number is required';
      }

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
        const updateData: UpdateUserRequest = {
          full_name: formData.full_name,
          mobile_number: formData.mobile_number,
        };
        
        await onSubmit(updateData);
      } else {
        await onSubmit(formData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof CreatePlayerRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Username *"
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          placeholder="player123"
          disabled={isLoading || isEditMode}
        />

        <Input
          label="Full Name *"
          type="text"
          value={formData.full_name}
          onChange={(e) => handleChange('full_name', e.target.value)}
          error={errors.full_name}
          placeholder="John Doe"
          disabled={isLoading}
        />

        <Input
          label="Email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="player@example.com"
          disabled={isLoading || isEditMode}
        />

        <Input
          label="Mobile Number *"
          type="tel"
          value={formData.mobile_number}
          onChange={(e) => handleChange('mobile_number', e.target.value)}
          error={errors.mobile_number}
          placeholder="+1234567890"
          disabled={isLoading}
        />

        {!isEditMode && (
          <>
            <Input
              label="Date of Birth *"
              type="date"
              value={formData.dob}
              onChange={(e) => handleChange('dob', e.target.value)}
              error={errors.dob}
              placeholder="YYYY-MM-DD"
              disabled={isLoading}
            />

            <Input
              label="Password *"
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              error={errors.password}
              placeholder="Minimum 5 characters"
              disabled={isLoading}
            />
          </>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={isLoading}
        >
          {isEditMode ? 'Update Player' : 'Create Player'}
        </Button>
      </div>
    </form>
  );
};

