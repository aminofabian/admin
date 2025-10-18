'use client';

import { useState, useEffect } from 'react';
import type { AddManualAffiliateRequest } from '@/types';
import { Button, Input } from '@/components/ui';
import { useAgentsStore } from '@/stores/use-agents-store';

interface ManualAffiliateFormProps {
  onSubmit: (data: AddManualAffiliateRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ManualAffiliateForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: ManualAffiliateFormProps) {
  const { agents } = useAgentsStore();
  const [formData, setFormData] = useState<AddManualAffiliateRequest>({
    agent_id: 0,
    player_id: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.agent_id || formData.agent_id <= 0) {
      newErrors.agent_id = 'Please select an agent';
    }

    if (!formData.player_id || formData.player_id <= 0) {
      newErrors.player_id = 'Player ID is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error adding manual affiliate:', error);
    }
  };

  const handleInputChange = (field: keyof AddManualAffiliateRequest) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = field === 'agent_id' ? parseInt(e.target.value) || 0 : parseInt(e.target.value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Manual Affiliate Assignment
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              This will manually assign a player to an agent as their affiliate. The player will be associated with the agent's commission structure.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="agent_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Agent
          </label>
          <select
            id="agent_id"
            value={formData.agent_id}
            onChange={handleInputChange('agent_id')}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 ${
              errors.agent_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
            }`}
          >
            <option value={0}>Select an agent...</option>
            {agents?.results?.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.username} ({agent.email})
              </option>
            ))}
          </select>
          {errors.agent_id && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.agent_id}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Choose the agent who will receive commissions from this player
          </p>
        </div>

        <div>
          <label htmlFor="player_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Player ID
          </label>
          <Input
            id="player_id"
            type="number"
            min="1"
            value={formData.player_id}
            onChange={handleInputChange('player_id')}
            error={errors.player_id}
            placeholder="Enter player ID"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            The unique ID of the player to assign as an affiliate
          </p>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
        >
          {isLoading ? 'Adding...' : 'Add Affiliate'}
        </Button>
      </div>
    </form>
  );
}
