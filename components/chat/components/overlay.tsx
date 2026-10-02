'use client';

import { useRef, type ReactNode } from 'react';
import { useOverlayBehaviour } from '../hooks/use-overlay-behaviour';

interface OverlayProps {
  children: ReactNode;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  /** Also close on a backdrop click. Defaults to true. */
  closeOnBackdrop?: boolean;
  className?: string;
  /** Extra classes for the panel that holds `children`. */
  panelClassName?: string;
}

/**
 * Dialog shell for the chat's overlays.
 *
 * Escape, focus handling and the scroll lock come from
 * `useOverlayBehaviour`, which the drawers also use directly so that every
 * overlay in the chat behaves the same way. See that hook for what this
 * replaced — in particular, Escape no longer tears down the whole console when a
 * drawer is open on top of it.
 */
export function Overlay({
  children,
  onClose,
  label,
  closeOnBackdrop = true,
  className = '',
  panelClassName = '',
}: OverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayBehaviour({ isOpen: true, onClose, panelRef });

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} tabIndex={-1} className={panelClassName}>
        {children}
      </div>
    </div>
  );
}
