'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
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
    redirect_url: initialData?.redirect_url || '',
    is_active: initialData?.is_active ?? true,
  });
  const [files, setFiles] = useState<{
    web_banner?: File;
    mobile_banner?: File;
  }>({});
  const [previews, setPreviews] = useState<{
    web_banner?: string;
    mobile_banner?: string;
  }>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validating, setValidating] = useState<{
    web_banner?: boolean;
    mobile_banner?: boolean;
  }>({});

  // Clear files and errors when banner type changes (different validation rules)
  useEffect(() => {
    if (files.web_banner || files.mobile_banner) {
      // Clear files and previews when banner type changes
      setFiles({});
      setPreviews({});
      // Clear file-related errors
      const newErrors = { ...errors };
      delete newErrors.web_banner;
      delete newErrors.mobile_banner;
      delete newErrors.banner;
      setErrors(newErrors);
    }
  }, [formData.banner_type]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (formData.redirect_url && !formData.redirect_url.match(/^https?:\/\/.+/)) {
      newErrors.redirect_url = 'URL must start with http:// or https://';
    }

    // Validate at least one banner image for new banners
    if (!initialData && !files.web_banner && !files.mobile_banner) {
      newErrors.banner = 'At least one banner image (web or mobile) is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateImageDimensions = (
    file: File,
    field: 'web_banner' | 'mobile_banner',
    bannerType: 'HOMEPAGE' | 'PROMOTIONAL' = formData.banner_type
  ): Promise<{ valid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      // Use browser's native Image constructor, not Next.js Image component
      // The imported Image from 'next/image' shadows the global Image, so we use HTMLImageElement
      const img = document.createElement('img') as HTMLImageElement;
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          URL.revokeObjectURL(url);
          const width = img.width;
          const height = img.height;
          
          if (!width || !height || width === 0 || height === 0) {
            resolve({
              valid: false,
              error: 'Unable to read image dimensions. Please ensure the image file is valid and not corrupted.',
            });
            return;
          }
          
          const aspectRatio = width / height;

          console.log('Image dimensions:', { width, height, aspectRatio, field, bannerType });

        if (field === 'web_banner') {
          if (bannerType === 'HOMEPAGE') {
            // HOMEPAGE: Nearly 3/4 screen height, nearly full width
            // Flexible range to accommodate various screen sizes
            // Width: 1280-2560px (allows smaller widths like 1280px)
            // Height: 600-1080px (nearly 3/4 viewport height range)
            // Aspect ratio: ~1.5:1 to ~3:1 (flexible landscape)
            const minWidth = 1000;
            const maxWidth = 2560;
            const minHeight = 500;
            const maxHeight = 1080;
            const minRatio = 1.2; // More lenient - allow slightly narrower
            const maxRatio = 4.0; // More lenient - allow wider banners

            if (width < minWidth || width > maxWidth) {
              const widthIssue = width < minWidth ? 'too narrow' : 'too wide';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The width is ${widthIssue} (${width}px). Kindly adjust the width to between ${minWidth} and ${maxWidth}px.`,
              });
              return;
            }
            if (height < minHeight || height > maxHeight) {
              const heightIssue = height < minHeight ? 'too short' : 'too tall';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The height is ${heightIssue} (${height}px). Kindly adjust the height to between ${minHeight} and ${maxHeight}px.`,
              });
              return;
            }
            // Validate aspect ratio is reasonable landscape (1.2:1 to 4:1) - more lenient
            if (aspectRatio < minRatio || aspectRatio > maxRatio) {
              const ratioIssue = aspectRatio < minRatio ? 'too narrow (portrait-like)' : 'too wide';
              const suggestedWidth = Math.round(height * 2.5); // Suggest a good width based on current height
              const suggestedHeight = Math.round(width / 2.5); // Suggest a good height based on current width
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px (aspect ratio ${aspectRatio.toFixed(2)}:1). The aspect ratio is ${ratioIssue}. Kindly adjust to: width ${minWidth}-${maxWidth}px and height ${minHeight}-${maxHeight}px. Suggested: ${suggestedWidth}x${height}px or ${width}x${suggestedHeight}px.`,
              });
              return;
            }
          } else if (bannerType === 'PROMOTIONAL') {
            // PROMOTIONAL: 1/3 screen height, full width (Facebook cover photo spec)
            // Flexible range to accommodate various screen sizes
            // Width: 1280-2560px (allows smaller widths like 1280px)
            // Height: 400-950px (1/3 viewport height range)
            // Aspect ratio: ~1.5:1 to ~3:1 (flexible landscape, Facebook-like)
            const minWidth = 1000;
            const maxWidth = 2560;
            const minHeight = 350;
            const maxHeight = 950;
            const minRatio = 1.2; // More lenient - allow slightly narrower
            const maxRatio = 4.0; // More lenient - allow wider banners

            if (width < minWidth || width > maxWidth) {
              const widthIssue = width < minWidth ? 'too narrow' : 'too wide';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The width is ${widthIssue} (${width}px). Kindly adjust the width to between ${minWidth} and ${maxWidth}px.`,
              });
              return;
            }
            if (height < minHeight || height > maxHeight) {
              const heightIssue = height < minHeight ? 'too short' : 'too tall';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The height is ${heightIssue} (${height}px). Kindly adjust the height to between ${minHeight} and ${maxHeight}px.`,
              });
              return;
            }
            // Validate aspect ratio is reasonable landscape (1.2:1 to 4:1) - more lenient
            if (aspectRatio < minRatio || aspectRatio > maxRatio) {
              const ratioIssue = aspectRatio < minRatio ? 'too narrow (portrait-like)' : 'too wide';
              const suggestedWidth = Math.round(height * 2.5); // Suggest a good width based on current height
              const suggestedHeight = Math.round(width / 2.5); // Suggest a good height based on current width
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px (aspect ratio ${aspectRatio.toFixed(2)}:1). The aspect ratio is ${ratioIssue}. Kindly adjust to: width ${minWidth}-${maxWidth}px and height ${minHeight}-${maxHeight}px. Suggested: ${suggestedWidth}x${height}px or ${width}x${suggestedHeight}px.`,
              });
              return;
            }
          }
        } else if (field === 'mobile_banner') {
          if (bannerType === 'HOMEPAGE') {
            // HOMEPAGE mobile: Nearly 3/4 screen height
            // Mobile viewports: 375x667 to 414x896
            // 3/4 of 667 = 500px, 3/4 of 896 = 672px
            // Width: 375-414px (nearly full width)
            // Height: 500-672px (nearly 3/4 viewport height)
            if (width < 375 || width > 414) {
              const widthIssue = width < 375 ? 'too narrow' : 'too wide';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The width is ${widthIssue} (${width}px). Kindly adjust the width to between 375 and 414px.`,
              });
              return;
            }
            if (height < 500 || height > 672) {
              const heightIssue = height < 500 ? 'too short' : 'too tall';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The height is ${heightIssue} (${height}px). Kindly adjust the height to between 500 and 672px.`,
              });
              return;
            }
          } else if (bannerType === 'PROMOTIONAL') {
            // PROMOTIONAL mobile: Facebook spec 640x360
            // Width: 640px (standard mobile width, allow small range)
            // Height: 360px (1/3 viewport height, allow small range)
            // Aspect ratio: ~1.78:1
            if (width < 600 || width > 680) {
              const widthIssue = width < 600 ? 'too narrow' : 'too wide';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The width is ${widthIssue} (${width}px). Kindly adjust the width to approximately 640px (600-680px range, Facebook spec).`,
              });
              return;
            }
            if (height < 340 || height > 380) {
              const heightIssue = height < 340 ? 'too short' : 'too tall';
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px. The height is ${heightIssue} (${height}px). Kindly adjust the height to approximately 360px (340-380px range, Facebook spec).`,
              });
              return;
            }
            // Validate aspect ratio is approximately 1.78:1 (Facebook spec)
            const expectedRatio = 1.78;
            const ratioTolerance = 0.1;
            if (Math.abs(aspectRatio - expectedRatio) > ratioTolerance) {
              const suggestedWidth = Math.round(height * 1.78);
              const suggestedHeight = Math.round(width / 1.78);
              resolve({
                valid: false,
                error: `Your image is ${width}x${height}px (aspect ratio ${aspectRatio.toFixed(2)}:1). The aspect ratio doesn't match Facebook spec (1.78:1). Kindly adjust to approximately 640x360px. Suggested: ${suggestedWidth}x${height}px or ${width}x${suggestedHeight}px.`,
              });
              return;
            }
          }
        }

          resolve({ valid: true });
        } catch (error) {
          URL.revokeObjectURL(url);
          console.error('Error during image validation:', error);
          resolve({
            valid: false,
            error: error instanceof Error 
              ? `Validation error: ${error.message}. Please try a different image file.`
              : 'An error occurred while validating image dimensions. Please try a different image file.',
          });
        }
      };

      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        console.error('Image load error:', error);
        resolve({
          valid: false,
          error: 'Failed to load image. Please ensure the file is a valid image file (PNG, JPEG, or JPG).',
        });
      };

      img.onabort = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: false,
          error: 'Image loading was cancelled. Please try uploading again.',
        });
      };

      try {
        img.src = url;
      } catch (error) {
        URL.revokeObjectURL(url);
        console.error('Error setting image source:', error);
        resolve({
          valid: false,
          error: error instanceof Error 
            ? `Error loading image: ${error.message}. Please try a different image file.`
            : 'Error loading image. Please try a different image file.',
        });
      }
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: 'web_banner' | 'mobile_banner') => {
    const file = e.target.files?.[0];
    const fileInput = e.target;
    
    // Clear previous errors for this field
    const newErrors = { ...errors };
    delete newErrors[field];
    delete newErrors.banner;
    setErrors(newErrors);

    // Clear previous file and preview if validation fails
    const clearFile = () => {
      setFiles((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      setPreviews((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
      // Reset file input
      if (fileInput) {
        fileInput.value = '';
      }
    };

    if (!file) {
      clearFile();
      return;
    }

    // Set validating state
    setValidating((prev) => ({ ...prev, [field]: true }));

    try {
      // Validate file type
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setErrors({ ...newErrors, [field]: 'Only PNG, JPEG, and JPG files are allowed' });
        clearFile();
        setValidating((prev) => ({ ...prev, [field]: false }));
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...newErrors, [field]: 'File size must be less than 5MB' });
        clearFile();
        setValidating((prev) => ({ ...prev, [field]: false }));
        return;
      }

      // Validate image dimensions (pass current banner type)
      const dimensionValidation = await validateImageDimensions(file, field, formData.banner_type);
      if (!dimensionValidation.valid) {
        console.log('Validation failed:', {
          field,
          bannerType: formData.banner_type,
          error: dimensionValidation.error,
        });
        setErrors({ ...newErrors, [field]: dimensionValidation.error || 'Invalid image dimensions' });
        clearFile();
        setValidating((prev) => ({ ...prev, [field]: false }));
        return;
      }

      // All validations passed - create preview and set file
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviews((prev) => ({ ...prev, [field]: event.target?.result as string }));
        setValidating((prev) => ({ ...prev, [field]: false }));
      };
      reader.onerror = () => {
        setErrors({ ...newErrors, [field]: 'Failed to read image file' });
        clearFile();
        setValidating((prev) => ({ ...prev, [field]: false }));
      };
      reader.readAsDataURL(file);

      setFiles((prev) => ({ ...prev, [field]: file }));
    } catch (error) {
      console.error('Error validating image:', error);
      const errorMessage = error instanceof Error 
        ? `Error: ${error.message}. Please ensure the image file is valid and try again.`
        : 'An error occurred while validating the image. Please ensure the image file is valid and try again.';
      setErrors({ ...newErrors, [field]: errorMessage });
      clearFile();
      setValidating((prev) => ({ ...prev, [field]: false }));
    }
  };

  const clearFilePreviews = () => {
    setPreviews({});
    setFiles({});
    // Clear any file-related errors
    const newErrors = { ...errors };
    delete newErrors.web_banner;
    delete newErrors.mobile_banner;
    delete newErrors.banner;
    setErrors(newErrors);
  };

  // Helper function to convert image URL to File object using proxy to avoid CORS
  const urlToFile = async (url: string, filename: string): Promise<File> => {
    try {
      console.log('📥 Fetching image via proxy:', {
        original: url,
        filename,
      });
      
      // Get auth token for authenticated requests
      const { storage } = await import('@/lib/utils/storage');
      const { TOKEN_KEY } = await import('@/lib/constants/api');
      const token = storage.get(TOKEN_KEY);
      
      // Use Next.js API route to proxy the image fetch (avoids CORS)
      const proxyUrl = `/api/banner-image-proxy?url=${encodeURIComponent(url)}`;
      
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      console.log('📦 Blob created:', {
        size: blob.size,
        type: blob.type,
        filename,
      });
      
      if (blob.size === 0) {
        throw new Error('Received empty image file');
      }
      
      // Determine MIME type from blob or filename
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = filename.split('.').pop()?.toLowerCase();
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
        };
        mimeType = mimeTypes[ext || ''] || 'image/jpeg';
      }
      
      const file = new File([blob], filename, { type: mimeType });
      console.log('✅ File object created:', {
        name: file.name,
        size: file.size,
        type: file.type,
      });
      
      return file;
    } catch (error) {
      console.error('❌ Error converting URL to File:', {
        url,
        filename,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new Error(`Failed to load existing image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const trimmedTitle = formData.title.trim();
      const trimmedRedirectUrl = formData.redirect_url.trim();
      
      // Prepare submit data
      let submitData: CreateBannerRequest | UpdateBannerRequest;
      
      if (initialData) {
        // For updates: only include fields that have changed or new files
        submitData = {} as UpdateBannerRequest;
        
        // Only include title if it changed
        if (trimmedTitle !== initialData.title) {
          submitData.title = trimmedTitle;
        }
        
        // Only include banner_type if it changed
        if (formData.banner_type !== initialData.banner_type) {
          submitData.banner_type = formData.banner_type;
        }
        
        // Only include is_active if it changed
        if (formData.is_active !== initialData.is_active) {
          submitData.is_active = formData.is_active;
        }
        
        // Handle redirect_url: include if it changed
        if (trimmedRedirectUrl !== (initialData.redirect_url || '')) {
          if (trimmedRedirectUrl) {
            submitData.redirect_url = trimmedRedirectUrl;
          } else {
            // If clearing redirect_url, send null
            submitData.redirect_url = null;
          }
        }
        
        // Include files if they exist (new uploads)
        if (files.web_banner) {
          submitData.web_banner = files.web_banner;
        }
        if (files.mobile_banner) {
          submitData.mobile_banner = files.mobile_banner;
        }
        
        // Backend requires at least one image for ALL updates, not just title/banner_type changes
        // So we always need to include existing images if no new files are being uploaded
        const hasNewFiles = files.web_banner || files.mobile_banner;
        
        if (!hasNewFiles) {
          console.log('🔄 Fetching existing images for update (backend requires images for all updates):', {
            webBanner: initialData.web_banner,
            mobileBanner: initialData.mobile_banner,
            bannerThumbnail: initialData.banner_thumbnail,
          });
          
          let imageFetched = false;
          
          // Try to fetch web_banner first
          if (initialData.web_banner) {
            try {
              const fileName = initialData.web_banner.split('/').pop() || 'web_banner.jpg';
              submitData.web_banner = await urlToFile(initialData.web_banner, fileName);
              imageFetched = true;
              console.log('✅ Successfully fetched web_banner:', fileName);
            } catch (error) {
              console.error('❌ Failed to fetch web_banner:', error);
            }
          }
          
          // Try mobile_banner if web_banner failed or doesn't exist
          if (!imageFetched && initialData.mobile_banner) {
            try {
              const fileName = initialData.mobile_banner.split('/').pop() || 'mobile_banner.jpg';
              submitData.mobile_banner = await urlToFile(initialData.mobile_banner, fileName);
              imageFetched = true;
              console.log('✅ Successfully fetched mobile_banner:', fileName);
            } catch (error) {
              console.error('❌ Failed to fetch mobile_banner:', error);
            }
          }
          
          // Try banner_thumbnail as last resort
          if (!imageFetched && initialData.banner_thumbnail) {
            try {
              const fileName = initialData.banner_thumbnail.split('/').pop() || 'banner_thumbnail.jpg';
              submitData.banner_thumbnail = await urlToFile(initialData.banner_thumbnail, fileName);
              imageFetched = true;
              console.log('✅ Successfully fetched banner_thumbnail:', fileName);
            } catch (error) {
              console.error('❌ Failed to fetch banner_thumbnail:', error);
            }
          }
          
          if (!imageFetched) {
            throw new Error('Failed to fetch existing images. The backend requires at least one banner image for all updates. Please upload at least one new image or ensure existing images are accessible.');
          }
          
          console.log('📦 Final submitData before sending:', {
            keys: Object.keys(submitData),
            hasWebBanner: submitData.web_banner instanceof File,
            hasMobileBanner: submitData.mobile_banner instanceof File,
            hasBannerThumbnail: submitData.banner_thumbnail instanceof File,
            webBannerName: submitData.web_banner instanceof File ? submitData.web_banner.name : 'N/A',
            mobileBannerName: submitData.mobile_banner instanceof File ? submitData.mobile_banner.name : 'N/A',
          });
        }
        
        // If no fields changed and no new files, don't submit
        if (Object.keys(submitData).length === 0) {
          alert('No changes to save');
          setIsSubmitting(false);
          return;
        }
      } else {
        // For creates: include all required fields
        submitData = {
          title: trimmedTitle,
          banner_type: formData.banner_type,
          is_active: formData.is_active,
        };
        
        // Handle redirect_url: include if it has a value
        if (trimmedRedirectUrl) {
          submitData.redirect_url = trimmedRedirectUrl;
        }
        
        // Include files if they exist
        if (files.web_banner) {
          submitData.web_banner = files.web_banner;
        }
        if (files.mobile_banner) {
          submitData.mobile_banner = files.mobile_banner;
        }
      }

      await onSubmit(submitData);
      clearFilePreviews();
    } catch (error) {
      console.error('Form submission error:', error);
      // Display error to user
      let errorMessage = 'Failed to save banner. Please try again.';
      if (error && typeof error === 'object' && 'detail' in error) {
        const detail = error.detail;
        if (typeof detail === 'string') {
          errorMessage = detail;
        } else if (typeof detail === 'object' && detail !== null) {
          // Handle validation errors object
          const errorMessages = Object.entries(detail)
            .map(([field, messages]) => {
              const msgArray = Array.isArray(messages) ? messages : [String(messages)];
              return `${field}: ${msgArray.join(', ')}`;
            })
            .join('\n');
          errorMessage = errorMessages || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    clearFilePreviews();
    onCancel();
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
          {formData.banner_type === 'HOMEPAGE' ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Required: Width 1280-2560px, Height 600-1080px (aspect ratio 1.2:1 to 4:1). 
              Designed for nearly full-width, nearly 3/4 viewport height display. Displays at max 85vh height on desktop.
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Required: Width 1280-2560px, Height 400-950px (aspect ratio 1.2:1 to 4:1). 
              Designed for full-width, 1/3 viewport height display. Displays at max 85vh height on desktop.
            </p>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, 'web_banner')}
            disabled={validating.web_banner}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {validating.web_banner && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Validating image dimensions...
            </p>
          )}
          
          {/* Image Preview */}
          {(previews.web_banner || initialData?.web_banner) && (
            <div className="mt-3">
              <div className="hidden sm:block">
                <div className="max-h-[85vh] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                  <Image
                    src={previews.web_banner || initialData?.web_banner || ''}
                    alt="Web banner preview (desktop)"
                    width={800}
                    height={600}
                    className="w-full max-h-[85vh] object-contain"
                  />
                </div>
              </div>
              <div className="sm:hidden">
                <Image
                  src={previews.web_banner || initialData?.web_banner || ''}
                  alt="Web banner preview (mobile view)"
                  width={400}
                  height={128}
                  className="max-w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {previews.web_banner ? 'New image' : `Current: ${initialData?.web_banner?.split('/').pop()}`}
              </p>
            </div>
          )}
          
          {errors.web_banner && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.web_banner}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Mobile Banner
          </label>
          {formData.banner_type === 'HOMEPAGE' ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Required: Width 375-414px, Height 500-672px. 
              Designed for nearly full-width, nearly 3/4 viewport height on mobile. Displays at max 65vh height on mobile (≤640px).
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Required: Width ~640px (600-680px), Height ~360px (340-380px) (Facebook spec). 
              Designed for full-width, 1/3 viewport height on mobile. Displays at max 65vh height on mobile (≤640px).
            </p>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg"
            onChange={(e) => handleFileChange(e, 'mobile_banner')}
            disabled={validating.mobile_banner}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6366f1] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#6366f1] file:text-white hover:file:bg-[#5558e3] disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {validating.mobile_banner && (
            <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">
              Validating image dimensions...
            </p>
          )}
          
          {/* Image Preview */}
          {(previews.mobile_banner || initialData?.mobile_banner) && (
            <div className="mt-3">
              <div className="block sm:hidden">
                <div className="max-h-[65vh] overflow-hidden rounded-lg border border-gray-200 dark:border-gray-600">
                  <Image
                    src={previews.mobile_banner || initialData?.mobile_banner || ''}
                    alt="Mobile banner preview (mobile)"
                    width={400}
                    height={600}
                    className="w-full max-h-[65vh] object-contain"
                  />
                </div>
              </div>
              <div className="hidden sm:block">
                <Image
                  src={previews.mobile_banner || initialData?.mobile_banner || ''}
                  alt="Mobile banner preview (desktop view)"
                  width={400}
                  height={128}
                  className="max-w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {previews.mobile_banner ? 'New image' : `Current: ${initialData?.mobile_banner?.split('/').pop()}`}
              </p>
            </div>
          )}
          
          {errors.mobile_banner && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.mobile_banner}</p>
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
          onClick={handleCancel}
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


