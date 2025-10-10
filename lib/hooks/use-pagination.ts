import { useState, useCallback } from 'react';

const DEFAULT_PAGE_SIZE = 10;

interface UsePaginationReturn {
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

export function usePagination(initialPageSize = DEFAULT_PAGE_SIZE): UsePaginationReturn {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const nextPage = useCallback(() => {
    setPage((prev) => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(1, prev - 1));
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    pageSize,
    setPage,
    nextPage,
    prevPage,
    setPageSize,
    reset,
  };
}

