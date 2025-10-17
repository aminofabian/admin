import { Button } from './button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrevious: boolean;
}

export function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange,
  hasNext,
  hasPrevious 
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden">
        {hasPrevious ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
          >
            Previous
          </Button>
        ) : (
          <div />
        )}
        {hasNext && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
          >
            Next
          </Button>
        )}
      </div>
      <div className="hidden sm:flex sm:items-center sm:justify-between sm:flex-1">
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Page <span className="font-medium">{currentPage}</span>
            {totalPages > 0 && (
              <>
                {' '}of <span className="font-medium">{totalPages}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {hasPrevious && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
          )}
          {hasNext && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

