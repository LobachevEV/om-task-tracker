import { useCallback, useState } from 'react';
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
  // Track which open-cycle we're rendering. When the parent flips `open`
  // false → true we reset value/error during render via the
  // "adjusting state during render" pattern, then auto-focus the input
  // once it mounts. No setState-in-effect.
  const [openCycle, setOpenCycle] = useState(open);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (open !== openCycle) {
    setOpenCycle(open);
    setValue('');
    setError(null);
  }

  // Auto-focus when opened — callback ref runs synchronously when the
  // input element mounts, avoiding a setState-in-effect race.
  const focusOnMount = useCallback(
    (el: HTMLInputElement | null) => {
      if (el && open) {
        el.focus();
        el.select();
      }
    },
    [open],
  );

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
          ref={focusOnMount}
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
