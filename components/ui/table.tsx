import { HTMLAttributes } from 'react';

export function Table({ className = '', ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="overflow-x-auto">
      <table 
        className={`min-w-full divide-y divide-gray-200 ${className}`}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead 
      className={`bg-gray-50 ${className}`}
      {...props}
    />
  );
}

export function TableBody({ className = '', ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody 
      className={`bg-white divide-y divide-gray-200 ${className}`}
      {...props}
    />
  );
}

export function TableRow({ className = '', ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr 
      className={`hover:bg-gray-50 ${className}`}
      {...props}
    />
  );
}

export function TableHead({ className = '', ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <th 
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
      {...props}
    />
  );
}

export function TableCell({ className = '', ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return (
    <td 
      className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${className}`}
      {...props}
    />
  );
}

