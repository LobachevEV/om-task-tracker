import { useEffect, useState } from 'react';

export interface UseGoToDateShortcutResult {
  open: boolean;
  setOpen: (next: boolean) => void;
  close: () => void;
}

export function useGoToDateShortcut(): UseGoToDateShortcutResult {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'g' || e.key === 'G')) {
        const target = e.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
        ) {
          return;
        }
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return { open, setOpen, close: () => setOpen(false) };
}
