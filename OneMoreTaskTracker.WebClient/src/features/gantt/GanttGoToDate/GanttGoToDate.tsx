import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GanttGoToDate.css';

export interface GanttGoToDateProps {
  /** True when the input should be visible. The page owns visibility (toggled by Cmd/Ctrl+G). */
  open: boolean;
  /** Called when the user submits a valid ISO date. */
  onSubmit: (iso: string) => void;
  /** Called when the user dismisses (Esc or blur with empty value). */
  onClose: () => void;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function GanttGoToDate({ open, onSubmit, onClose }: GanttGoToDateProps) {
  const { t } = useTranslation('gantt');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Auto-focus when opened.
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setValue('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!ISO_RE.test(trimmed)) {
        setError(
          t('goTo.invalid', { defaultValue: 'Use YYYY-MM-DD' }),
        );
        return;
      }
      setError(null);
      onSubmit(trimmed);
    },
    [value, onSubmit, t],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <form
      className="gantt-go-to-date"
      role="search"
      aria-label={t('goTo.legend', { defaultValue: 'Go to date' })}
      onSubmit={handleSubmit}
    >
      <label className="gantt-go-to-date__label">
        <span className="gantt-go-to-date__legend">
          {t('goTo.legend', { defaultValue: 'Go to date' })}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="\d{4}-\d{2}-\d{2}"
          placeholder={t('goTo.placeholder', { defaultValue: 'YYYY-MM-DD' })}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (value.trim() === '') onClose();
          }}
          className="gantt-go-to-date__input"
          aria-invalid={error != null}
        />
      </label>
      {error ? (
        <span className="gantt-go-to-date__error" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}
