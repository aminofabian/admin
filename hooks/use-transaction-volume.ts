import { useEffect, useRef } from 'react';
import { useTransactionVolumeStore } from '@/stores';

export function useTransactionVolume() {
  const { data, isLoading, error, fetchTransactionVolume } = useTransactionVolumeStore();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Only fetch once on mount - no polling
    // Real-time updates should come from websocket, not polling
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchTransactionVolume();
    }
  }, []); // Empty deps - only run once

  return {
    ...data,
    isLoading,
    error,
  };
}
