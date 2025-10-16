'use client';

import { useState, FormEvent } from 'react';
import { Input, Button } from '@/components/ui';
import type { AddManualAffiliateRequest } from '@/types';

interface AddManualAffiliateFormProps {
  onSubmit: (data: AddManualAffiliateRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const AddManualAffiliateForm = ({ 
  onSubmit, 
  onCancel, 
  isLoading 
}: AddManualAffiliateFormProps) => {
  const [formData, setFormData] = useState<AddManualAffiliateRequest>({
    agent_id: 0,
    player_id: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Agent ID validation
    if (!formData.agent_id || formData.agent_id <= 0) {
      newErrors.agent_id = 'Agent ID is required and must be a valid positive number';
    }

    // Player ID validation
    if (!formData.player_id || formData.player_id <= 0) {
      newErrors.player_id = 'Player ID is required and must be a valid positive number';
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

  const handleChange = (field: keyof AddManualAffiliateRequest, value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({ ...prev, [field]: numValue }));
    // Clear error when user starts typing
    if (errors[field as string]) {
      setErrors(prev => ({ ...prev, [field as string]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300 px-4 py-3 text-sm rounded-lg">
        <strong>Note:</strong> This will manually assign a player as an affiliate to an agent. 
        The player cannot already be affiliated with another agent.
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Agent ID */}
        <Input
          label="Agent ID *"
          type="number"
          min="1"
          value={formData.agent_id || ''}
          onChange={(e) => handleChange('agent_id', e.target.value)}
          error={errors.agent_id}
          placeholder="12"
          disabled={isLoading}
        />

        {/* Player ID */}
        <Input
          label="Player ID *"
          type="number"
          min="1"
          value={formData.player_id || ''}
          onChange={(e) => handleChange('player_id', e.target.value)}
          error={errors.player_id}
          placeholder="25"
          disabled={isLoading}
        />
      </div>

      {/* Info Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 text-yellow-800 dark:text-yellow-300 px-4 py-3 text-sm rounded-lg">
        <strong>Important:</strong> Both agent and player must exist in the system. 
        The player will be associated with the agent for commission tracking.
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
          Add Affiliate
        </Button>
      </div>
    </form>
  );
};

