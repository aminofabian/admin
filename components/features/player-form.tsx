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
    <form id="create-player-form" onSubmit={handleSubmit} className="space-y-6">
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
            placeholder="player123"
            disabled={isLoading || isEditMode}
            className="transition-all duration-200"
          />

          <Input
            label="Full Name *"
            type="text"
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            error={errors.full_name}
            placeholder="John Doe"
            disabled={isLoading}
            className="transition-all duration-200"
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
            Contact Information
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder="player@example.com"
            disabled={isLoading || isEditMode}
            className="transition-all duration-200"
          />

          <Input
            label="Mobile Number *"
            type="tel"
            value={formData.mobile_number}
            onChange={(e) => handleChange('mobile_number', e.target.value)}
            error={errors.mobile_number}
            placeholder="+1234567890"
            disabled={isLoading}
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
              label="Date of Birth *"
              type="date"
              value={formData.dob}
              onChange={(e) => handleChange('dob', e.target.value)}
              error={errors.dob}
              placeholder="YYYY-MM-DD"
              disabled={isLoading}
              className="transition-all duration-200"
            />

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
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                <span className="font-medium">Password Requirements:</span> Must be at least 5 characters long. Choose a strong password to secure the player's account.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

