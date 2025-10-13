import { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';

export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table 
        className={`min-w-full divide-y divide-gray-200 dark:divide-gray-700 ${className}`}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead 
      className={`bg-gray-50 dark:bg-gray-800/50 ${className}`}
      {...props}
    />
  );
}

export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody 
      className={`bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800 ${className}`}
      {...props}
    />
  );
}

export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr 
      className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${className}`}
      {...props}
    />
  );
}

export function TableHead({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td 
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 ${className}`}
      {...props}
    />
  );
}

