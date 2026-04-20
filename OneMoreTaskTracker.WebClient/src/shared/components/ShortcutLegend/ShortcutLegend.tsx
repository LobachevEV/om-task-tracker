import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import './ShortcutLegend.css';

interface ShortcutLegendProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutLegend({ isOpen, onClose }: ShortcutLegendProps) {
  const { t } = useTranslation('tasks');
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
      <h3 className="shortcut-legend__title">{t('shortcuts.title')}</h3>
      <ul className="shortcut-legend__list">
        <li>
          <kbd>/</kbd>
          <span>{t('shortcuts.focusNew')}</span>
        </li>
        <li>
          <kbd>↑ ↓</kbd>
          <span>{t('shortcuts.navigate')}</span>
        </li>
        <li>
          <kbd>Enter</kbd>
          <span>{t('shortcuts.open')}</span>
        </li>
        <li>
          <kbd>f</kbd>
          <span>{t('shortcuts.focusFilter')}</span>
        </li>
        <li>
          <kbd>?</kbd>
          <span>{t('shortcuts.showPanel')}</span>
        </li>
        <li>
          <kbd>Esc</kbd>
          <span>{t('shortcuts.closeDialogs')}</span>
        </li>
      </ul>
    </div>
  );
}
