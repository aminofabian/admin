'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { gameApiSettingsApi } from '@/lib/api';
import {
  GAME_API_VERSIONS,
  toGameApiVersion,
  type GameApiVersion,
} from '@/lib/constants/game-api-version';

const LOAD_ERROR = 'Failed to load game API settings';
const UPDATE_ERROR = 'Failed to update the category 2 game API';

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err !== 'object' || !err || !('message' in err)) return fallback;
  const message = (err as { message: unknown }).message;
  return typeof message === 'string' && message ? message : fallback;
}

export function useCategory2GameApi() {
  const { addToast } = useToast();
  const [activeVersion, setActiveVersion] = useState<GameApiVersion | null>(null);
  const [pendingVersion, setPendingVersion] = useState<GameApiVersion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await gameApiSettingsApi.get();
      setActiveVersion(toGameApiVersion(data.category2_v2_api));
    } catch (err) {
      setError(errorMessage(err, LOAD_ERROR));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const requestVersion = (version: GameApiVersion) => {
    if (isLoading || isSaving || version === activeVersion) return;
    setPendingVersion(version);
  };

  const cancelRequest = () => {
    if (!isSaving) setPendingVersion(null);
  };

  const confirmRequest = async () => {
    if (!pendingVersion) return;
    setIsSaving(true);
    try {
      const data = await gameApiSettingsApi.update({
        category2_v2_api: pendingVersion === GAME_API_VERSIONS.V2,
      });
      const savedVersion = toGameApiVersion(data.category2_v2_api);
      setActiveVersion(savedVersion);
      addToast({
        type: 'success',
        title: `Category 2 is now on API ${savedVersion}`,
        description: `Category 2 games on every company launch through game API ${savedVersion}.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Update failed', description: errorMessage(err, UPDATE_ERROR) });
    } finally {
      setIsSaving(false);
      setPendingVersion(null);
    }
  };

  return {
    activeVersion,
    pendingVersion,
    isLoading,
    isSaving,
    error,
    reload,
    requestVersion,
    cancelRequest,
    confirmRequest,
  };
}
