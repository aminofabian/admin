import type { ReactNode } from 'react';

export interface PlayerDetailPanelProps {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  noPadding?: boolean;
}

/** Square-edged panel used across player detail. Buttons keep their own radius. */
export function PlayerDetailPanel({
  title,
  actions,
  children,
  className = '',
  bodyClassName = '',
  noPadding = false,
}: PlayerDetailPanelProps) {
  return (
    <section
      className={`border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {title || actions ? (
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-800">
          {title ? (
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
          ) : (
            <span />
          )}
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${noPadding ? '' : 'p-3'} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
