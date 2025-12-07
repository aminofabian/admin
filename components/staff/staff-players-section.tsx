'use client';

import { useCallback, useState } from 'react';
import { Button, Drawer, useToast } from '@/components/ui';
import { PlayerForm } from '@/components/features';
import { playersApi } from '@/lib/api';
import PlayersDashboard from '@/components/dashboard/players/players-dashboard';
import type { CreatePlayerRequest, UpdateUserRequest } from '@/types';

/**
 * Staff Players Section
 * - Allows access to players page
 * - Disables agent assignment functionality
 * - Allows adding new players
 */
export function StaffPlayersSection() {
  const { addToast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenCreateModal = useCallback(() => {
    setIsCreateOpen(true);
    setSubmitError('');
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateOpen(false);
    setSubmitError('');
  }, []);

  const handleSubmit = useCallback(
    async (formData: CreatePlayerRequest | UpdateUserRequest) => {
      try {
        setIsSubmitting(true);
        setSubmitError('');

        await playersApi.create(formData as CreatePlayerRequest);

        addToast({
          type: 'success',
          title: 'Player created successfully!',
          description: 'The player account has been created.',
        });

        handleCloseCreateModal();
        // Force PlayersDashboard to remount and refetch by changing key
        setRefreshKey((prev) => prev + 1);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create player';
        setSubmitError(message);
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [addToast, handleCloseCreateModal],
  );

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="primary"
          size="sm"
          onClick={handleOpenCreateModal}
          className="shadow-md transition-all hover:shadow-lg touch-manipulation px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden md:inline ml-1.5">Add Player</span>
        </Button>
      </div>
      <PlayersDashboard key={refreshKey} />
      <CreatePlayerDrawer
        isOpen={isCreateOpen}
        isSubmitting={isSubmitting}
        onClose={handleCloseCreateModal}
        onSubmit={handleSubmit}
        submitError={submitError}
      />
    </>
  );
}

type CreatePlayerDrawerProps = {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePlayerRequest | UpdateUserRequest) => Promise<void>;
  submitError: string;
};

function CreatePlayerDrawer({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
  submitError,
}: CreatePlayerDrawerProps) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Player"
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-player-form"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Player
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Error Alert */}
        {submitError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 dark:border-red-800/50 dark:bg-red-950/30 dark:text-red-300 flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-medium">Error creating player</p>
              <p className="text-sm mt-0.5">{submitError}</p>
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Player Account Information
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                All fields marked with * are required. The player will be able to log in immediately after creation.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <PlayerForm
          onSubmit={onSubmit}
          onCancel={onClose}
          isLoading={isSubmitting}
        />
      </div>
    </Drawer>
  );
}

