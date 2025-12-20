'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { USER_ROLES } from '@/lib/constants/roles';
import { useGamesStore } from '@/stores';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Modal, useToast } from '@/components/ui';
import { LoadingState, ErrorState } from '@/components/features';

export default function GameSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToast } = useToast();

  // Staff users should see read-only games view
  // Redirect to games page instead of settings page
  useEffect(() => {
    if (user?.role === USER_ROLES.STAFF) {
      router.push('/dashboard/games');
    }
  }, [user?.role, router]);

  const [isMultiplierModalOpen, setIsMultiplierModalOpen] = useState(false);
  const [multiplierValue, setMultiplierValue] = useState('');
  const [isUpdatingMultiplier, setIsUpdatingMultiplier] = useState(false);
  const [multiplierError, setMultiplierError] = useState<string | null>(null);

  const {
    minimumRedeemMultiplier,
    isLoading,
    error,
    fetchGames,
    updateMinimumRedeemMultiplier,
  } = useGamesStore();

  useEffect(() => {
    // Only fetch if not staff
    if (user?.role !== USER_ROLES.STAFF) {
      fetchGames();
    }
  }, [fetchGames, user?.role]);

  useEffect(() => {
    if (minimumRedeemMultiplier) {
      setMultiplierValue(minimumRedeemMultiplier);
    }
  }, [minimumRedeemMultiplier]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchGames} />;
  }

  return (
    <div className="space-y-6">
      <div className="relative bg-card/95 backdrop-blur-sm p-6 border border-border/50 shadow-lg overflow-hidden hover:shadow-md transition-all duration-200">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.015]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)),transparent_40%)]" />
        </div>
        
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground">
              Game Settings
            </h2>
            <p className="text-muted-foreground mt-1">
              Configure minimum redeem multiplier
            </p>
          </div>
        </div>
      </div>

      {/* Minimum Redeem Multiplier Card */}
      <div className="rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground dark:text-slate-400">Min Redeem Multiplier</div>
            <div className="mt-1 text-2xl font-semibold text-foreground dark:text-white">
              {minimumRedeemMultiplier || 'Not set'}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setMultiplierValue(minimumRedeemMultiplier || '');
              setMultiplierError(null);
              setIsMultiplierModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </Button>
        </div>
      </div>

      <Modal
        isOpen={isMultiplierModalOpen}
        onClose={() => {
          setIsMultiplierModalOpen(false);
          setMultiplierValue(minimumRedeemMultiplier || '');
          setMultiplierError(null);
        }}
        title="Update Minimum Redeem Multiplier"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setIsMultiplierModalOpen(false);
                setMultiplierValue(minimumRedeemMultiplier || '');
                setMultiplierError(null);
              }}
              disabled={isUpdatingMultiplier}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const value = parseFloat(multiplierValue);
                if (isNaN(value) || value < 0) {
                  setMultiplierError('Please enter a valid number greater than or equal to 0');
                  return;
                }

                try {
                  setIsUpdatingMultiplier(true);
                  setMultiplierError(null);
                  await updateMinimumRedeemMultiplier(value);
                  setIsMultiplierModalOpen(false);
                  setMultiplierValue('');
                  addToast({
                    type: 'success',
                    title: 'Success',
                    description: 'Minimum redeem multiplier updated successfully',
                  });
                } catch (err) {
                  const message = err instanceof Error ? err.message : 'Failed to update multiplier';
                  setMultiplierError(message);
                } finally {
                  setIsUpdatingMultiplier(false);
                }
              }}
              disabled={isUpdatingMultiplier}
            >
              {isUpdatingMultiplier ? 'Updating...' : 'Update'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {multiplierError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {multiplierError}
            </div>
          )}
          
          <Input
            label="Minimum Redeem Multiplier"
            type="number"
            step="0.01"
            min="0"
            value={multiplierValue}
            onChange={(e) => setMultiplierValue(e.target.value)}
            placeholder="e.g., 1.00"
            disabled={isUpdatingMultiplier}
          />
        </div>
      </Modal>
    </div>
  );
}
