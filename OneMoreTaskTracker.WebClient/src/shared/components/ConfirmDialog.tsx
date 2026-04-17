import { useEffect, useRef } from 'react';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';
import './ConfirmDialog.css';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen?: boolean;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  onConfirm,
  onCancel,
  isOpen = true,
}: ConfirmDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus confirm button when dialog opens
  useEffect(() => {
    if (isOpen && confirmButtonRef.current) {
      confirmButtonRef.current.focus();
    }
  }, [isOpen]);

  // Handle Escape and Enter keys
  useKeyboardShortcut([
    {
      key: 'Escape',
      handler: onCancel,
      enabled: isOpen,
    },
    {
      key: 'Enter',
      handler: onConfirm,
      enabled: isOpen,
    },
  ]);

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog">
        <h3 className="dialog__title" id="dialog-title">{title}</h3>
        <p className="dialog__message">{message}</p>
        <div className="dialog__actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} ref={confirmButtonRef}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
