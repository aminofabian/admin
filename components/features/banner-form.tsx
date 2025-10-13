'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Banner, CreateBannerRequest, UpdateBannerRequest } from '@/types';

interface BannerFormProps {
  onSubmit: (data: CreateBannerRequest | UpdateBannerRequest) => Promise<void>;
  onCancel: () => void;
  initialData?: Banner;
}

export function BannerForm({ onSubmit, onCancel, initialData }: BannerFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    banner_type: initialData?.banner_type || 'HOMEPAGE' as const,
    banner_category: initialData?.banner_category || 'DESKTOP' as const,
    redirect_url: initialData?.redirect_url || '',
    is_active: initialData?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.redirect_url && !formData.redirect_url.match(/^https?:\/\/.+/)) {
      newErrors.redirect_url = 'URL must start with http:// or https://';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Title *
        </label>
        <Input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={errors.title ? 'border-red-500' : ''}
          placeholder="Enter banner title"
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Banner Type *
        </label>
        <select
          value={formData.banner_type}
          onChange={(e) => setFormData({ ...formData, banner_type: e.target.value as 'HOMEPAGE' | 'PROMOTIONAL' })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="HOMEPAGE">Homepage</option>
          <option value="PROMOTIONAL">Promotional</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Banner Category *
        </label>
        <select
          value={formData.banner_category}
          onChange={(e) => setFormData({ ...formData, banner_category: e.target.value as 'DESKTOP' | 'MOBILE_RESPONSIVE' | 'MOBILE_APP' })}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="DESKTOP">Desktop</option>
          <option value="MOBILE_RESPONSIVE">Mobile Responsive</option>
          <option value="MOBILE_APP">Mobile App</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Redirect URL
        </label>
        <Input
          type="url"
          value={formData.redirect_url}
          onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
          className={errors.redirect_url ? 'border-red-500' : ''}
          placeholder="https://example.com/promotion"
        />
        {errors.redirect_url && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.redirect_url}</p>
        )}
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="w-4 h-4 text-blue-600 bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
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
          {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Banner' : 'Create Banner')}
        </Button>
        <Button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          variant="outline"
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

