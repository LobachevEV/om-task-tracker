import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

export type Placement = 'bottom-start' | 'top-start';

export interface PopoverProps {
  /**
   * The trigger element to anchor to.
   *
   * @example
   * ```tsx
   * const triggerRef = useRef<HTMLButtonElement>(null);
   * return (
   *   <>
   *     <button ref={triggerRef} onClick={() => setOpen(true)}>Open</button>
   *     <Popover anchorRef={triggerRef} open={open} onClose={() => setOpen(false)}>
   *       <ul role="listbox">...</ul>
   *     </Popover>
   *   </>
   * );
   * ```
   */
  anchorRef: RefObject<HTMLElement | null>;
  /** Controlled open state. */
  open: boolean;
  /** Called when the user dismisses (escape, click-outside). Consumer flips `open`. */
  onClose: () => void;
  /** Default 'bottom-start'; auto-flips to 'top-start' if bottom would overflow viewport. */
  placement?: Placement;
  /** Pixel gap between the trigger's edge and the popover's edge. Default 2. */
  offset?: number;
  /** Forwarded to the portal root for spec targetability + a11y. */
  testId?: string;
  /** ARIA role on the portal root. Default 'dialog'. Pass 'listbox' for owner picker. */
  role?: 'dialog' | 'listbox';
  /** ARIA label on the portal root. */
  ariaLabel?: string;
  /** Optional aria-modal — only for role='dialog' calendars. */
  ariaModal?: boolean;
  /** Min-width in pixels applied to the portal root (anchors to trigger width). */
  minWidth?: number;
  /** Children: the popover content. */
  children: ReactNode;
}

interface Coords {
  left: number;
  top: number;
}

export function Popover({
  anchorRef,
  open,
  onClose,
  placement = 'bottom-start',
  offset = 2,
  testId,
  role,
  ariaLabel,
  ariaModal,
  minWidth,
  children,
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<Coords | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const r = anchor.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.getBoundingClientRect().height ?? 0;

      let top: number;
      const effectivePlacement =
        placement === 'bottom-start' && r.bottom + popoverHeight + offset > window.innerHeight
          ? 'top-start'
          : placement;

      if (effectivePlacement === 'top-start') {
        top = r.top - popoverHeight - offset;
      } else {
        top = r.bottom + offset;
      }

      const popoverWidth = popoverRef.current?.getBoundingClientRect().width ?? 0;
      const left =
        r.left + popoverWidth > window.innerWidth
          ? window.innerWidth - popoverWidth - 4
          : r.left;

      setCoords({ left, top });
    };

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, anchorRef, placement, offset]);

  useLayoutEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      const insideAnchor = anchorRef.current?.contains(target) ?? false;
      const insidePopover = popoverRef.current?.contains(target) ?? false;
      if (!insideAnchor && !insidePopover) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, anchorRef, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role={role}
      aria-label={ariaLabel}
      aria-modal={ariaModal}
      data-testid={testId}
      style={{
        position: 'fixed',
        left: coords?.left ?? -9999,
        top: coords?.top ?? -9999,
        zIndex: 'var(--z-popover)',
        minWidth,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
