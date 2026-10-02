'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared overlay behaviour: Escape, focus handling and a reference-counted
 * body scroll lock.
 *
 * Three problems this replaces:
 *
 * 1. **Escape tore down the whole console.** `ChatDrawer` registered a
 *    document-level Escape handler, so pressing Escape with the balance drawer
 *    open closed the *chat* and discarded the agent's in-flight `balanceValue` /
 *    `balanceRemarks`. Only 2 of the 6 overlays handled Escape at all, so losing
 *    the drawer was the default outcome.
 * 2. **Focus was never moved or trapped**, so with a full-screen overlay open,
 *    Tab walked through the hidden transcript behind it.
 * 3. **Body scroll locks did not compose.** Two owners each set
 *    `document.body.style.overflow`, and one reset it to `'unset'`, stomping the
 *    other's lock.
 *
 * Only the top-most overlay responds to Escape, focus is moved in and restored on
 * close, and the scroll lock is counted rather than assigned.
 */

/** Open overlays, oldest first. Only the last entry responds to Escape. */
const overlayStack: symbol[] = [];
let scrollLockCount = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function acquireScrollLock() {
  if (typeof document === 'undefined') return;
  scrollLockCount += 1;
  if (scrollLockCount === 1) document.body.style.overflow = 'hidden';
}

function releaseScrollLock() {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  // Restore, never 'unset' — that stomps whatever locked before us.
  if (scrollLockCount === 0) document.body.style.overflow = '';
}

/** Test-only: verify the stack unwinds cleanly between cases. */
export function __resetOverlayStack() {
  overlayStack.length = 0;
  scrollLockCount = 0;
  if (typeof document !== 'undefined') document.body.style.overflow = '';
}

export function useOverlayBehaviour(
  { isOpen, onClose, panelRef }: { isOpen: boolean; onClose: () => void; panelRef?: React.RefObject<HTMLElement | null> },
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const idRef = useRef<symbol>(Symbol('overlay'));
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Capture the id for the cleanup: `idRef.current` is not guaranteed to hold
    // the same symbol by the time the effect tears down.
    const overlayId = idRef.current;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    overlayStack.push(overlayId);
    acquireScrollLock();

    const focusTarget =
      (panelRef?.current?.querySelector<HTMLElement>(FOCUSABLE) as HTMLElement | null) ??
      panelRef?.current ??
      null;
    focusTarget?.focus();

    return () => {
      const index = overlayStack.lastIndexOf(overlayId);
      if (index !== -1) overlayStack.splice(index, 1);
      releaseScrollLock();
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, panelRef]);

  useEffect(() => {
    if (!isOpen) return;

    const isTop = () =>
      overlayStack.length > 0 && overlayStack[overlayStack.length - 1] === idRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTop()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const scope = panelRef?.current;
      if (!scope) return;

      // Trap focus: wrap from the last focusable element to the first and back.
      const focusables = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen, panelRef]);
}
