import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './RowMenu.css';

interface RowMenuProps {
  onRemove: () => void;
}

export function RowMenu({ onRemove }: RowMenuProps) {
  const { t } = useTranslation('team');
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleRemoveClick = () => {
    onRemove();
    setIsOpen(false);
  };

  return (
    <div className="row-menu">
      <button
        ref={triggerRef}
        className="row-menu__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Actions"
        aria-expanded={isOpen}
      >
        ⋯
      </button>

      {isOpen && (
        <div ref={menuRef} className="row-menu__popover">
          <button className="row-menu__item row-menu__item--danger" onClick={handleRemoveClick}>
            {t('remove.menuItem')}
          </button>
        </div>
      )}
    </div>
  );
}
