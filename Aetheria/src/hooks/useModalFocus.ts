'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * useModalFocus — dialog focus contract for the glass modals.
 *
 * When `isActive` flips true:
 * - the first focusable control inside the modal (ideally the close button,
 *   which is first in DOM order) receives focus;
 * - Tab is trapped inside the modal (Shift+Tab wraps back to the last element);
 * - on close, focus is restored to the element that opened the modal.
 *
 * Screen-reader semantics (role="dialog" / aria-modal) stay in the JSX; this
 * hook only owns focus behavior, mirroring the WCAG 2.2 dialog pattern.
 */
export function useModalFocus<T extends HTMLElement>(
  isActive: boolean,
  onClose: () => void
): React.RefObject<T | null> {
  const panelRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return undefined;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Focus the first focusable control once the panel is mounted.
    const panel = panelRef.current;
    if (panel) {
      const first = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? panel).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const current = panelRef.current;
      if (!current) return;
      const focusables = Array.from(
        current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey && (active === first || !current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Hand focus back to the trigger so keyboard users don't land on <body>.
      previouslyFocusedRef.current?.focus?.();
    };
    // onClose is only read for the activation flag; consumers re-render on
    // every store change anyway, so the deps stay minimal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return panelRef;
}
