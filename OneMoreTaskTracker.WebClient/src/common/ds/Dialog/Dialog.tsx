import { useEffect, useId, useRef, type ReactNode } from 'react';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { cx } from '../cx';

export interface DialogProps {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  /** Action row — typically a pair of DS `Button`s. */
  actions?: ReactNode;
  onClose: () => void;
  className?: string;
}

/**
 * Generic modal shell. Handles Escape-to-close (via the shared shortcut hook,
 * which also guards against double-firing from inputs) and focuses the dialog
 * container exactly once per open transition.
 *
 * Not a full focus trap — for complex forms inside a dialog, either adopt a
 * headless dialog library (Radix / react-aria) or layer focus-trap on top.
 */
export function Dialog({ open, title, children, actions, onClose, className }: DialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useKeyboardShortcut({ key: 'Escape', handler: onClose, enabled: open });

  useEffect(() => {
    if (open) containerRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={containerRef} tabIndex={-1} className={cx('dialog', className)}>
        <h3 className="dialog__title" id={titleId}>
          {title}
        </h3>
        <div className="dialog__message">{children}</div>
        {actions ? <div className="dialog__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
