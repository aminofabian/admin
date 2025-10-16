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
  const [files, setFiles] = useState<{
    web_banner?: File;
    mobile_banner?: File;
    banner_thumbnail?: File;
  }>({});
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

    // Validate at least one banner image for new banners
    if (!initialData && !files.web_banner && !files.mobile_banner && !files.banner_thumbnail) {
      newErrors.banner = 'At least one banner image (web, mobile, or thumbnail) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'web_banner' | 'mobile_banner' | 'banner_thumbnail') => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setErrors({ ...errors, [field]: 'Only PNG, JPEG, and JPG files are allowed' });
        return;
      }
      setFiles({ ...files, [field]: file });
      // Clear error for this field
      const newErrors = { ...errors };
      delete newErrors[field];
      delete newErrors.banner;
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
        ...files,
      };
      await onSubmit(submitData);
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
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
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
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1]"
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

      <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Banner Images {!initialData && '*'}
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Web Banner (Desktop)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, 'web_banner')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3]"
          />
          {initialData?.web_banner && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Current: {initialData.web_banner.split('/').pop()}
            </p>
          )}
          {errors.web_banner && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.web_banner}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Mobile Banner
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, 'mobile_banner')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3]"
          />
          {initialData?.mobile_banner && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Current: {initialData.mobile_banner.split('/').pop()}
            </p>
          )}
          {errors.mobile_banner && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mobile_banner}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Banner Thumbnail (Legacy)
          </label>
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, 'banner_thumbnail')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3]"
          />
          {initialData?.banner_thumbnail && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Current: {initialData.banner_thumbnail.split('/').pop()}
            </p>
          )}
          {errors.banner_thumbnail && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.banner_thumbnail}</p>
          )}
        </div>

        {errors.banner && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.banner}</p>
        )}
      </div>

      <div className="flex items-center space-x-3">
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
          {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Banner' : 'Create Banner')}
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

