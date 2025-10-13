'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { Game, UpdateGameRequest } from '@/types';

interface GameFormProps {
  game: Game;
  onSubmit: (data: UpdateGameRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GameForm = ({ game, onSubmit, onCancel, isLoading }: GameFormProps) => {
  const [formData, setFormData] = useState<UpdateGameRequest>({
    title: game.title,
    dashboard_url: game.dashboard_url || '',
    game_status: game.game_status,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    // Dashboard URL validation (optional, but if provided must be valid)
    if (formData.dashboard_url && formData.dashboard_url.trim()) {
      if (!/^https?:\/\/.+/.test(formData.dashboard_url)) {
        newErrors.dashboard_url = 'Must be a valid URL (e.g., https://example.com)';
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
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleChange = (field: keyof UpdateGameRequest, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        {/* Code (read-only) */}
        <Input
          label="Game Code"
          type="text"
          value={game.code}
          disabled
          placeholder="Game code"
        />

        {/* Category (read-only) */}
        <Input
          label="Category"
          type="text"
          value={game.game_category}
          disabled
          placeholder="Category"
          className="capitalize"
        />

        {/* Title (editable) */}
        <Input
          label="Game Title *"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          placeholder="Cool Slots"
          disabled={isLoading}
        />

        {/* Dashboard URL (editable) */}
        <Input
          label="Dashboard URL"
          type="url"
          value={formData.dashboard_url}
          onChange={(e) => handleChange('dashboard_url', e.target.value)}
          error={errors.dashboard_url}
          placeholder="https://dashboard.game.com"
          disabled={isLoading}
        />

        {/* Status Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
            Game Status
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleChange('game_status', !formData.game_status)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.game_status ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              disabled={isLoading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.game_status ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formData.game_status ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Toggle to enable or disable this game for users
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
        <strong>Note:</strong> Game code and category cannot be changed. Games are manually created and managed by system administrators.
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
          Update Game
        </Button>
      </div>
    </form>
  );
};

