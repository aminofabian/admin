'use client';

import { useState, FormEvent } from 'react';
import { Input, Button, PasswordInput } from '@/components/ui';
import { validatePassword } from '@/lib/utils/password-validation';
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
    service_email: company?.service_email || '',
    service_name: company?.service_name || '',
    game_api_url: company?.game_api_url || '',
    game_api_key: company?.game_api_key || '',
    btcpay_api_key: company?.btcpay_api_key ?? '',
    btcpay_store_id: company?.btcpay_store_id ?? '',
    btcpay_webhook_secret: company?.btcpay_webhook_secret ?? '',
    binpay_api_key: company?.binpay_api_key ?? '',
    binpay_secret_key: company?.binpay_secret_key ?? '',
    binpay_deposit_secret_key: company?.binpay_deposit_secret_key ?? '',
    binpay_withdrawal_secret_key: company?.binpay_withdrawal_secret_key ?? '',
    brenzi_merchant_slug: company?.brenzi_merchant_slug ?? '',
    taparcaida_vendor_id: company?.taparcaida_vendor_id ?? '',
    tierlock_merchant_id: company?.tierlock_merchant_id ?? '',
    tierlock_merchant_secret: company?.tierlock_merchant_secret ?? '',
    tierlock_webhook_secret: company?.tierlock_webhook_secret ?? '',
    tierlock_payout_shared_secret: company?.tierlock_payout_shared_secret ?? '',
    tierlock_payout_client_secret: company?.tierlock_payout_client_secret ?? '',
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
      } else {
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.isValid) {
          newErrors.password = passwordValidation.errors[0];
        }
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
        // For edit, include all fields that can be updated
        const updateData: UpdateCompanyRequest = {
          project_name: formData.project_name,
          project_domain: formData.project_domain,
          admin_project_domain: formData.admin_project_domain,
          username: formData.username,
          email: formData.email,
          service_email: formData.service_email || undefined,
          service_name: formData.service_name || undefined,
          game_api_url: formData.game_api_url || undefined,
          game_api_key: formData.game_api_key || undefined,
          btcpay_api_key: formData.btcpay_api_key || undefined,
          btcpay_store_id: formData.btcpay_store_id || undefined,
          btcpay_webhook_secret: formData.btcpay_webhook_secret || undefined,
          binpay_api_key: formData.binpay_api_key || undefined,
          binpay_secret_key: formData.binpay_secret_key || undefined,
          binpay_deposit_secret_key: formData.binpay_deposit_secret_key || undefined,
          binpay_withdrawal_secret_key: formData.binpay_withdrawal_secret_key || undefined,
          brenzi_merchant_slug: formData.brenzi_merchant_slug || undefined,
          taparcaida_vendor_id: formData.taparcaida_vendor_id || undefined,
          tierlock_merchant_id: formData.tierlock_merchant_id || undefined,
          tierlock_merchant_secret: formData.tierlock_merchant_secret || undefined,
          tierlock_webhook_secret: formData.tierlock_webhook_secret || undefined,
          tierlock_payout_shared_secret: formData.tierlock_payout_shared_secret || undefined,
          tierlock_payout_client_secret: formData.tierlock_payout_client_secret || undefined,
        };
        
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
          <PasswordInput
            label="Password *"
            value={formData.password}
            onChange={(value) => handleChange('password', value)}
            error={errors.password}
            placeholder="Enter password"
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

      {/* Binpay Configuration */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Binpay Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Binpay API Key"
            type="text"
            value={formData.binpay_api_key}
            onChange={(e) => handleChange('binpay_api_key', e.target.value)}
            placeholder="Binpay API Key"
            disabled={isLoading}
          />

          <Input
            label="Binpay Secret Key"
            type="text"
            value={formData.binpay_secret_key}
            onChange={(e) => handleChange('binpay_secret_key', e.target.value)}
            placeholder="Binpay Secret Key"
            disabled={isLoading}
          />

          <Input
            label="Binpay Deposit Secret Key"
            type="text"
            value={formData.binpay_deposit_secret_key}
            onChange={(e) => handleChange('binpay_deposit_secret_key', e.target.value)}
            placeholder="Binpay Deposit Secret Key"
            disabled={isLoading}
          />

          <Input
            label="Binpay Withdrawal Secret Key"
            type="text"
            value={formData.binpay_withdrawal_secret_key}
            onChange={(e) => handleChange('binpay_withdrawal_secret_key', e.target.value)}
            placeholder="Binpay Withdrawal Secret Key"
            disabled={isLoading}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Tierlock Configuration */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Tierlock Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Tierlock Merchant ID"
            type="text"
            value={formData.tierlock_merchant_id}
            onChange={(e) => handleChange('tierlock_merchant_id', e.target.value)}
            placeholder="Tierlock Merchant ID"
            disabled={isLoading}
          />

          <Input
            label="Tierlock Merchant Secret"
            type="text"
            value={formData.tierlock_merchant_secret}
            onChange={(e) => handleChange('tierlock_merchant_secret', e.target.value)}
            placeholder="Tierlock Merchant Secret"
            disabled={isLoading}
          />

          <Input
            label="Tierlock Webhook Secret"
            type="text"
            value={formData.tierlock_webhook_secret}
            onChange={(e) => handleChange('tierlock_webhook_secret', e.target.value)}
            placeholder="Tierlock Webhook Secret"
            disabled={isLoading}
            className="md:col-span-2"
          />

          <Input
            label="Tierlock Payout Shared Secret"
            type="text"
            value={formData.tierlock_payout_shared_secret}
            onChange={(e) => handleChange('tierlock_payout_shared_secret', e.target.value)}
            placeholder="Tierlock Payout Shared Secret"
            disabled={isLoading}
          />

          <Input
            label="Tierlock Payout Client Secret"
            type="text"
            value={formData.tierlock_payout_client_secret}
            onChange={(e) => handleChange('tierlock_payout_client_secret', e.target.value)}
            placeholder="Tierlock Payout Client Secret"
            disabled={isLoading}
            className="md:col-span-2"
          />
        </div>
      </div>

      {/* Brenzi & Taparcaida Payment Configuration */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Brenzi & Taparcaida Payment Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Brenzi Merchant Slug"
            type="text"
            value={formData.brenzi_merchant_slug}
            onChange={(e) => handleChange('brenzi_merchant_slug', e.target.value)}
            placeholder="e.g., tastey"
            disabled={isLoading}
          />
          <Input
            label="Taparcaida Vendor ID"
            type="text"
            value={formData.taparcaida_vendor_id}
            onChange={(e) => handleChange('taparcaida_vendor_id', e.target.value)}
            placeholder="Taparcaida Vendor ID"
            disabled={isLoading}
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

