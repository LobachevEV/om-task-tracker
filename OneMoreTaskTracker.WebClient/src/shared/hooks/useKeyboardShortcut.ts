import { useEffect, useRef } from 'react';

export interface Shortcut {
  key: string;              // e.g. 'k', '/', 'Escape', 'ArrowDown'
  ctrl?: boolean;           // requires Ctrl (or Cmd on Mac)
  shift?: boolean;
  alt?: boolean;
  handler: (event: KeyboardEvent) => void;
  enabled?: boolean;        // default true
  preventDefault?: boolean; // default true
}

export function useKeyboardShortcut(shortcut: Shortcut | Shortcut[]): void {
  const shortcutRef = useRef<Shortcut | Shortcut[]>(shortcut);

  useEffect(() => {
    shortcutRef.current = shortcut;
  }, [shortcut]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // Skip if typing in input/textarea unless the shortcut explicitly targets it (Escape always, Ctrl combos always)
      const target = event.target as HTMLElement;
      const isEditable = target instanceof HTMLInputElement ||
                         target instanceof HTMLTextAreaElement ||
                         target instanceof HTMLSelectElement ||
                         target.isContentEditable;

      const list = Array.isArray(shortcutRef.current) ? shortcutRef.current : [shortcutRef.current];

      for (const s of list) {
        if (s.enabled === false) continue;
        if (s.key !== event.key) continue;
        if ((s.ctrl ?? false) !== (event.ctrlKey || event.metaKey)) continue;
        if ((s.shift ?? false) !== event.shiftKey) continue;
        if ((s.alt ?? false) !== event.altKey) continue;
        if (isEditable && !s.ctrl && s.key !== 'Escape' && s.key !== 'Enter') continue;
        if (s.preventDefault !== false) event.preventDefault();
        s.handler(event);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
