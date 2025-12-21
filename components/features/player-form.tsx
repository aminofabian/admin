'use client';

import { useState, FormEvent } from 'react';
import { Input, Select, PasswordInput, ConfirmPasswordInput } from '@/components/ui';
import { validatePassword } from '@/lib/utils/password-validation';
import type { Player, CreatePlayerRequest, UpdateUserRequest } from '@/types';

// All 50 US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

interface PlayerFormProps {
  player?: Player;
  onSubmit: (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export const PlayerForm = ({ player, onSubmit, isLoading }: PlayerFormProps) => {
  const isEditMode = !!player;
  
  const [formData, setFormData] = useState<CreatePlayerRequest & { state?: string; confirm_password?: string }>({
    username: player?.username || '',
    full_name: player?.full_name || '',
    dob: player?.dob || '',
    email: player?.email || '',
    mobile_number: player?.mobile_number || '',
    password: '',
    confirm_password: '',
    role: 'player',
    state: player?.state || '',
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

      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0];
        }
      }

      if (!formData.confirm_password?.trim()) {
        newErrors.confirm_password = 'Please confirm your password';
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match';
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
          mobile_number: formData.mobile_number.trim() || undefined,
          state: formData.state?.trim() || undefined,
        };
        
        await onSubmit(updateData);
      } else {
        const createData: CreatePlayerRequest & { confirm_password?: string; state?: string } = {
          username: formData.username,
          full_name: formData.full_name,
          dob: formData.dob,
          email: formData.email,
          mobile_number: formData.mobile_number.trim() || '',
          password: formData.password,
          confirm_password: formData.confirm_password || '',
          role: 'player',
        };
        
        // Include state if provided
        if (formData.state?.trim()) {
          createData.state = formData.state.trim();
        }
        
        await onSubmit(createData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof (CreatePlayerRequest & { state?: string; confirm_password?: string }), value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Clear confirm_password error when password changes
    if (field === 'password' && errors.confirm_password) {
      setErrors(prev => ({ ...prev, confirm_password: '' }));
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
            label="Mobile Number"
            type="tel"
            value={formData.mobile_number}
            onChange={(e) => handleChange('mobile_number', e.target.value)}
            error={errors.mobile_number}
            placeholder="+1234567890"
            disabled={isLoading}
            className="transition-all duration-200"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              State
            </label>
            <Select
              value={formData.state || ''}
              onChange={(value) => handleChange('state', value)}
              options={[
                { value: '', label: 'Select a state' },
                ...US_STATES,
              ]}
              placeholder="Select a state"
              disabled={isLoading}
            />
          </div>
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

            <div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PasswordInput
              label="Password *"
              value={formData.password}
              onChange={(value) => handleChange('password', value)}
              error={errors.password}
              placeholder="Enter password"
              disabled={isLoading}
              className="transition-all duration-200"
            />

            <ConfirmPasswordInput
              label="Confirm Password *"
              value={formData.confirm_password || ''}
              password={formData.password}
              onChange={(value) => handleChange('confirm_password', value)}
              error={errors.confirm_password}
              placeholder="Re-enter your password"
              disabled={isLoading}
              className="transition-all duration-200"
            />
          </div>
        </div>
      )}
    </form>
  );
};

