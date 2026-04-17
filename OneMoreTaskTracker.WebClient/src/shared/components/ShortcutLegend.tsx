import { useEffect, useRef } from 'react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import './ShortcutLegend.css';

interface ShortcutLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutLegend({ isOpen, onClose }: ShortcutLegendProps) {
  const legendRef = useRef<HTMLDivElement>(null);

  // Close when Escape is pressed
  useKeyboardShortcut({
    key: 'Escape',
    handler: onClose,
    enabled: isOpen,
  });

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="shortcut-legend" ref={legendRef}>
      <h3 className="shortcut-legend__title">Shortcuts</h3>
      <ul className="shortcut-legend__list">
        <li>
          <kbd>/</kbd>
          <span>Focus new task input</span>
        </li>
        <li>
          <kbd>↑ ↓</kbd>
          <span>Navigate task list</span>
        </li>
        <li>
          <kbd>Enter</kbd>
          <span>Open selected task</span>
        </li>
        <li>
          <kbd>f</kbd>
          <span>Focus filter</span>
        </li>
        <li>
          <kbd>?</kbd>
          <span>Show this panel</span>
        </li>
        <li>
          <kbd>Esc</kbd>
          <span>Close dialogs</span>
        </li>
      </ul>
    </div>
  );
}
