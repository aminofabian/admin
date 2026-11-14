'use client';

import { useCallback, useEffect, useState } from 'react';
import { ConfirmModal, Switch, useToast } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { gameApiSettingsApi } from '@/lib/api';

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err && 'message' in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

export function Category2GameApiToggle() {
  const { addToast } = useToast();
  const [useV2, setUseV2] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gameApiSettingsApi.get();
      setUseV2(data.category2_v2_api);
    } catch (err) {
      setError(errorMessage(err, 'Failed to load game API settings'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const applyChange = async (enabled: boolean) => {
    const previous = useV2;
    setUseV2(enabled);
    setIsSaving(true);
    try {
      const data = await gameApiSettingsApi.update({ category2_v2_api: enabled });
      setUseV2(data.category2_v2_api);
      addToast({
        type: 'success',
        title: enabled ? 'Category 2 is using API v2' : 'Category 2 is using API v1',
        description: enabled
          ? 'Category 2 games will launch through game API v2.'
          : 'Category 2 games will launch through game API v1 until you switch back.',
      });
    } catch (err) {
      setUseV2(previous);
      addToast({
        type: 'error',
        title: 'Update failed',
        description: errorMessage(err, 'Failed to update the category 2 game API'),
      });
    } finally {
      setIsSaving(false);
      setPendingValue(null);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Category 2 game API
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            This applies to category 2 games on every company. Turn v2 off while that API is
            unavailable, then turn it back on once it is working again.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isLoading ? 'Loading…' : useV2 ? 'API v2' : 'API v1'}
          </span>
          <Switch
            checked={useV2}
            onChange={(next) => setPendingValue(next)}
            disabled={isLoading || isSaving || Boolean(error)}
            tone="emerald"
            aria-label="Use game API v2 for category 2 games"
          />
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/40">
        {error ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button type="button" variant="secondary" onClick={loadSettings} disabled={isLoading}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isLoading
                ? 'Checking which API category 2 games are using.'
                : useV2
                  ? 'Category 2 games are launching through game API v2.'
                  : 'Category 2 games are launching through game API v1.'}
            </p>
            <Button type="button" variant="secondary" onClick={loadSettings} disabled={isLoading || isSaving}>
              Refresh
            </Button>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={pendingValue !== null}
        onClose={() => {
          if (!isSaving) setPendingValue(null);
        }}
        onConfirm={() => {
          if (pendingValue !== null) {
            void applyChange(pendingValue);
          }
        }}
        title={pendingValue ? 'Switch category 2 games to API v2?' : 'Switch category 2 games to API v1?'}
        description={
          pendingValue
            ? 'Category 2 games will start using game API v2. Use this once the v2 outage is resolved.'
            : 'Category 2 games will start using game API v1. Use this while v2 is under maintenance.'
        }
        confirmText={pendingValue ? 'Use API v2' : 'Use API v1'}
        variant="warning"
        isLoading={isSaving}
      />
    </div>
  );
}
