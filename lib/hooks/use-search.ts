import { useState, useCallback, useEffect } from 'react';

const DEBOUNCE_DELAY = 300;

interface UseSearchReturn {
  search: string;
  debouncedSearch: string;
  setSearch: (value: string) => void;
  clearSearch: () => void;
}

export function useSearch(initialValue = ''): UseSearchReturn {
  const [search, setSearch] = useState(initialValue);
  const [debouncedSearch, setDebouncedSearch] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [search]);

  const clearSearch = useCallback(() => {
    setSearch('');
    setDebouncedSearch('');
  }, []);

  return {
    search,
    debouncedSearch,
    setSearch,
    clearSearch,
  };
}

