'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { Company, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

interface CompanyFormProps {
  company?: Company;
  onSubmit: (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const CompanyForm = ({ company, onSubmit, onCancel, isLoading }: CompanyFormProps) => {
  const isEditMode = !!company;
  
  const [formData, setFormData] = useState<CreateCompanyRequest>({
    project_name: company?.project_name || '',
    project_domain: company?.project_domain || '',
    admin_project_domain: company?.admin_project_domain || '',
    username: company?.username || '',
    password: '',
    email: company?.email || '',
    service_email: '',
    service_name: '',
    game_api_url: '',
    game_api_key: '',
    btcpay_api_key: company?.btcpay_api_key ?? '',
    btcpay_store_id: company?.btcpay_store_id ?? '',
    btcpay_webhook_secret: company?.btcpay_webhook_secret ?? '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    if (!formData.project_domain.trim()) {
      newErrors.project_domain = 'Project domain is required';
    } else if (!/^https?:\/\/.+/.test(formData.project_domain)) {
      newErrors.project_domain = 'Must be a valid URL (e.g., https://example.com)';
    }

    if (!formData.admin_project_domain.trim()) {
      newErrors.admin_project_domain = 'Admin domain is required';
    } else if (!/^https?:\/\/.+/.test(formData.admin_project_domain)) {
      newErrors.admin_project_domain = 'Must be a valid URL (e.g., https://admin.example.com)';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
    } else if (!/^[a-zA-Z0-9]+$/.test(formData.username)) {
      newErrors.username = 'Username must be alphanumeric';
    }

    if (!isEditMode) {
      if (!formData.password.trim()) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 5) {
        newErrors.password = 'Password must be at least 5 characters';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Must be a valid email address';
    }

    if (!isEditMode) {
      if (!formData.service_email.trim()) {
        newErrors.service_email = 'Service email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.service_email)) {
        newErrors.service_email = 'Must be a valid email address';
      }

      if (!formData.service_name.trim()) {
        newErrors.service_name = 'Service name is required';
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
        // For edit, only send changed fields
        const updateData: UpdateCompanyRequest = {
          project_name: formData.project_name,
          project_domain: formData.project_domain,
          admin_project_domain: formData.admin_project_domain,
          username: formData.username,
          email: formData.email,
        };
        
        if (formData.service_email) {
          updateData.service_email = formData.service_email;
        }
        if (formData.service_name) {
          updateData.service_name = formData.service_name;
        }
        if (formData.btcpay_api_key !== undefined) {
          updateData.btcpay_api_key = formData.btcpay_api_key || undefined;
        }
        if (formData.btcpay_store_id !== undefined) {
          updateData.btcpay_store_id = formData.btcpay_store_id || undefined;
        }
        if (formData.btcpay_webhook_secret !== undefined) {
          updateData.btcpay_webhook_secret = formData.btcpay_webhook_secret || undefined;
        }
        
        await onSubmit(updateData as CreateCompanyRequest | UpdateCompanyRequest);
      } else {
        await onSubmit(formData as CreateCompanyRequest | UpdateCompanyRequest);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof CreateCompanyRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Name */}
        <Input
          label="Project Name *"
          type="text"
          value={formData.project_name}
          onChange={(e) => handleChange('project_name', e.target.value)}
          error={errors.project_name}
          placeholder="My Gaming Platform"
          disabled={isLoading}
        />

        {/* Username */}
        <Input
          label="Username *"
          type="text"
          value={formData.username}
          onChange={(e) => handleChange('username', e.target.value)}
          error={errors.username}
          placeholder="companyadmin"
          disabled={isLoading}
        />

        {/* Project Domain */}
        <Input
          label="Project Domain *"
          type="url"
          value={formData.project_domain}
          onChange={(e) => handleChange('project_domain', e.target.value)}
          error={errors.project_domain}
          placeholder="https://mygaming.com"
          disabled={isLoading}
        />

        {/* Admin Domain */}
        <Input
          label="Admin Domain *"
          type="url"
          value={formData.admin_project_domain}
          onChange={(e) => handleChange('admin_project_domain', e.target.value)}
          error={errors.admin_project_domain}
          placeholder="https://admin.mygaming.com"
          disabled={isLoading}
        />

        {/* Email */}
        <Input
          label="Admin Email *"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          placeholder="admin@mygaming.com"
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

        {/* Service Email */}
        <Input
          label={`Service Email ${!isEditMode ? '*' : ''}`}
          type="email"
          value={formData.service_email}
          onChange={(e) => handleChange('service_email', e.target.value)}
          error={errors.service_email}
          placeholder="support@mygaming.com"
          disabled={isLoading}
        />

        {/* Service Name */}
        <Input
          label={`Service Name ${!isEditMode ? '*' : ''}`}
          type="text"
          value={formData.service_name}
          onChange={(e) => handleChange('service_name', e.target.value)}
          error={errors.service_name}
          placeholder="My Gaming Support"
          disabled={isLoading}
        />
      </div>

      {/* Optional Fields */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Optional Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Game API URL"
            type="url"
            value={formData.game_api_url}
            onChange={(e) => handleChange('game_api_url', e.target.value)}
            placeholder="https://api.games.com"
            disabled={isLoading}
          />

          <Input
            label="Game API Key"
            type="text"
            value={formData.game_api_key}
            onChange={(e) => handleChange('game_api_key', e.target.value)}
            placeholder="API Key"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* BTC Pay Configuration */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">BTC Pay Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="BTC Pay API Key"
            type="text"
            value={formData.btcpay_api_key}
            onChange={(e) => handleChange('btcpay_api_key', e.target.value)}
            placeholder="BTC Pay API Key"
            disabled={isLoading}
          />

          <Input
            label="BTC Pay Store ID"
            type="text"
            value={formData.btcpay_store_id}
            onChange={(e) => handleChange('btcpay_store_id', e.target.value)}
            placeholder="BTC Pay Store ID"
            disabled={isLoading}
          />

          <Input
            label="BTC Pay Webhook Secret"
            type="text"
            value={formData.btcpay_webhook_secret}
            onChange={(e) => handleChange('btcpay_webhook_secret', e.target.value)}
            placeholder="BTC Pay Webhook Secret"
            disabled={isLoading}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Form Actions */}
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
          {isEditMode ? 'Update Company' : 'Create Company'}
        </Button>
      </div>
    </form>
  );
};

