import { useEffect } from 'react';
import { useTransactionVolumeStore } from '@/stores';

export function useTransactionVolume() {
  const { data, isLoading, error, fetchTransactionVolume } = useTransactionVolumeStore();

  useEffect(() => {
    fetchTransactionVolume();
  }, [fetchTransactionVolume]);

  return {
    ...data,
    isLoading,
    error,
  };
}
