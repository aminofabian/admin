'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CompanySettings, CreateCompanyRequest, UpdateCompanyRequest } from '@/types';

interface CompanySettingsFormProps {
  onSubmit: (data: CreateCompanyRequest | UpdateCompanyRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: CompanySettings;
}

export function CompanySettingsForm({ onSubmit, onCancel, initialData }: CompanySettingsFormProps) {
  const [formData, setFormData] = useState({
    project_name: initialData?.project_name || '',
    project_domain: initialData?.project_domain || '',
    admin_project_domain: initialData?.admin_project_domain || '',
    username: initialData?.username || '',
    password: '', // Never pre-fill password
    email: initialData?.email || '',
    service_email: '',
    service_name: '',
    game_api_url: '',
    game_api_key: '',
    service_creds: '',
    is_active: initialData?.is_active ?? true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    if (!formData.project_domain.trim()) {
      newErrors.project_domain = 'Project domain is required';
    } else if (!formData.project_domain.match(/^https?:\/\/.+/)) {
      newErrors.project_domain = 'Project domain must start with http:// or https://';
    }

    if (!formData.admin_project_domain.trim()) {
      newErrors.admin_project_domain = 'Admin project domain is required';
    } else if (!formData.admin_project_domain.match(/^https?:\/\/.+/)) {
      newErrors.admin_project_domain = 'Admin project domain must start with http:// or https://';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 4) {
      newErrors.username = 'Username must be at least 4 characters';
    } else if (!formData.username.match(/^[a-zA-Z0-9]+$/)) {
      newErrors.username = 'Username must be alphanumeric only';
    }

    // Password validation only for new companies or when password is provided
    if (!initialData && !formData.password.trim()) {
      newErrors.password = 'Password is required for new companies';
    } else if (formData.password && formData.password.length < 5) {
      newErrors.password = 'Password must be at least 5 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.service_email.trim()) {
      newErrors.service_email = 'Service email is required';
    } else if (!formData.service_email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.service_email = 'Please enter a valid service email address';
    }

    if (!formData.service_name.trim()) {
      newErrors.service_name = 'Service name is required';
    }

    // Optional URL validation
    if (formData.game_api_url && !formData.game_api_url.match(/^https?:\/\/.+/)) {
      newErrors.game_api_url = 'Game API URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
        setErrors({ ...errors, logo: 'Only PNG, JPEG, JPG, and SVG files are allowed' });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, logo: 'File size must be less than 5MB' });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      setLogoFile(file);
      // Clear error for this field
      const newErrors = { ...errors };
      delete newErrors.logo;
      setErrors(newErrors);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const submitData = {
        ...formData,
        ...(logoFile && { logo: logoFile }),
        // Only include password if it's provided (for updates) or it's a new company
        ...((!initialData || formData.password) && { password: formData.password }),
      };
      await onSubmit(submitData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearLogoPreview = () => {
    setLogoPreview(null);
    setLogoFile(null);
    const newErrors = { ...errors };
    delete newErrors.logo;
    setErrors(newErrors);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Project Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Project Information
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Project Name *
          </label>
          <Input
            type="text"
            value={formData.project_name}
            onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
            className={errors.project_name ? 'border-red-500' : ''}
            placeholder="Enter project/platform name"
          />
          {errors.project_name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Project Domain *
          </label>
          <Input
            type="url"
            value={formData.project_domain}
            onChange={(e) => setFormData({ ...formData, project_domain: e.target.value })}
            className={errors.project_domain ? 'border-red-500' : ''}
            placeholder="https://example.com"
          />
          {errors.project_domain && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.project_domain}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Admin Project Domain *
          </label>
          <Input
            type="url"
            value={formData.admin_project_domain}
            onChange={(e) => setFormData({ ...formData, admin_project_domain: e.target.value })}
            className={errors.admin_project_domain ? 'border-red-500' : ''}
            placeholder="https://admin.example.com"
          />
          {errors.admin_project_domain && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.admin_project_domain}</p>
          )}
        </div>
      </div>

      {/* Admin Account */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Admin Account
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Username *
          </label>
          <Input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className={errors.username ? 'border-red-500' : ''}
            placeholder="Enter admin username (alphanumeric, min 4 chars)"
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.username}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Password {!initialData && '*'}
          </label>
          <Input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={errors.password ? 'border-red-500' : ''}
            placeholder={initialData ? "Leave blank to keep current password" : "Enter admin password (min 5 chars)"}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Email *
          </label>
          <Input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className={errors.email ? 'border-red-500' : ''}
            placeholder="Enter admin email"
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Service Information */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Service Information
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Service Email *
          </label>
          <Input
            type="email"
            value={formData.service_email}
            onChange={(e) => setFormData({ ...formData, service_email: e.target.value })}
            className={errors.service_email ? 'border-red-500' : ''}
            placeholder="support@example.com"
          />
          {errors.service_email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.service_email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Service Name *
          </label>
          <Input
            type="text"
            value={formData.service_name}
            onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
            className={errors.service_name ? 'border-red-500' : ''}
            placeholder="Customer Support"
          />
          {errors.service_name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.service_name}</p>
          )}
        </div>
      </div>

      {/* Optional Settings */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Optional Settings
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Game API URL
          </label>
          <Input
            type="url"
            value={formData.game_api_url}
            onChange={(e) => setFormData({ ...formData, game_api_url: e.target.value })}
            className={errors.game_api_url ? 'border-red-500' : ''}
            placeholder="https://api.example.com"
          />
          {errors.game_api_url && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.game_api_url}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Game API Key
          </label>
          <Input
            type="text"
            value={formData.game_api_key}
            onChange={(e) => setFormData({ ...formData, game_api_key: e.target.value })}
            placeholder="Enter game API authentication key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Company Logo
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleLogoChange}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3]"
          />
          
          {/* Logo Preview */}
          {(logoPreview || initialData?.username) && (
            <div className="mt-3">
              <img
                src={logoPreview || '/api/placeholder/100/50'} // Fallback for existing companies
                alt="Company logo preview"
                className="max-w-32 h-16 object-contain rounded border border-gray-200 dark:border-gray-600"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {logoPreview ? 'New logo' : 'Current logo'}
              </p>
              {logoPreview && (
                <button
                  type="button"
                  onClick={clearLogoPreview}
                  className="mt-1 text-xs text-red-600 dark:text-red-400 hover:underline"
                >
                  Remove new logo
                </button>
              )}
            </div>
          )}
          
          {errors.logo && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.logo}</p>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center space-x-3 border-t border-gray-200 dark:border-gray-700 pt-4">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 text-[#6366f1] bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-[#6366f1]"
        />
        <label htmlFor="is_active" className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Active
        </label>
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Company' : 'Create Company')}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="secondary"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
