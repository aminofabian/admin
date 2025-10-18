import { useEffect } from 'react';
import { useGameActivitiesStore } from '@/stores';

export function useGameActivities() {
  const { data, isLoading, error, fetchGameActivities } = useGameActivitiesStore();

  useEffect(() => {
    fetchGameActivities();
  }, [fetchGameActivities]);

  return {
    ...data,
    isLoading,
    error,
  };
}
