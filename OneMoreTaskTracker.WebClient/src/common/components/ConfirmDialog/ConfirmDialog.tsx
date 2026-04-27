import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

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
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isOpen = true,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const resolvedConfirmLabel = confirmLabel ?? t('confirm');
  const resolvedCancelLabel = cancelLabel ?? t('cancel');
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

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="dialog">
        <h3 className="dialog__title" id="dialog-title">{title}</h3>
        <p className="dialog__message">{message}</p>
        <div className="dialog__actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            {resolvedCancelLabel}
          </button>
          <button className="primary-button" type="button" onClick={onConfirm} ref={confirmButtonRef}>
            {resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
