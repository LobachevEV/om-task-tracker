import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import { InlineCellChevron } from './InlineCellChevron';
import { InlineCellError } from './InlineCellError';
import { InlineDateCalendar } from './InlineDateCalendar';
import { ISO_DATE_RE, addDays, formatShortDate } from '../../ganttMath';
import './InlineEditors.css';

export interface InlineDateCellProps {
  /** Committed ISO yyyy-MM-dd value, or null when the plan is unset. */
  value: string | null;
  /** Commit handler — throw on failure so the cell rolls back. */
  onSave: (next: string | null) => Promise<void>;
  /** Accessible label — must carry field + stage + feature context. */
  ariaLabel: string;
  /** Disable the editor (viewer role / submitting). */
  readOnly?: boolean;
  /** Hook into the test id seam for Evaluator assertions. */
  testId?: string;
  /**
   * Relay a commit outcome into the parent's aria-live region.
   */
  onAnnounce?: (message: string) => void;
  /** Build the announcement message for screen-reader relay. */
  buildAnnouncement?: (outcome: 'saved' | 'error', value: string, error: InlineEditorError | null) => string;
}

function parseDraft(raw: string): string | null {
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

function toDraft(value: string | null): string {
  return value ?? '';
}

/**
 * Stage planned-start / planned-end inline editor. Accepts ISO yyyy-MM-dd
 * strings; ArrowUp/ArrowDown nudge by ±1 day when the draft parses.
 * Invalid strings roll back via the hook's `validate` slot — no keystroke
 * is rejected mid-type. Clicking or focusing the input opens a calendar
 * popover powered by react-day-picker.
 */
export function InlineDateCell({
  value,
  onSave,
  ariaLabel,
  readOnly,
  testId,
  onAnnounce,
  buildAnnouncement,
}: InlineDateCellProps) {
  const { t, i18n } = useTranslation('gantt');
  const locale = i18n.language || 'en';
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const editor = useInlineFieldEditor<string>({
    committed: toDraft(value),
    onSave: (next: string) => onSave(parseDraft(next)),
    validate: (next) => {
      const trimmed = next.trim();
      if (trimmed === '') return null;
      if (!ISO_DATE_RE.test(trimmed)) return 'Use a real release date';
      return null;
    },
    buildAnnouncement,
    onAnnounce,
  });

  useEffect(() => {
    if (!calendarOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [calendarOpen]);

  const openCalendar = useCallback(() => {
    if (readOnly) return;
    editor.enterEdit();
    setCalendarOpen(true);
  }, [editor, readOnly]);

  const closeCalendar = useCallback(() => {
    setCalendarOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleCalendarSelect = useCallback(
    (iso: string) => {
      editor.setDraft(iso);
      setCalendarOpen(false);
      triggerRef.current?.focus();
      void editor.commit(iso);
    },
    [editor],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (readOnly) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void editor.commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (calendarOpen) {
          setCalendarOpen(false);
        } else {
          editor.cancel();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const current = editor.draft.trim();
        if (current === '' || !ISO_DATE_RE.test(current)) return;
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        editor.setDraft(addDays(current, direction));
      }
    },
    [calendarOpen, editor, readOnly],
  );

  if (readOnly) {
    return (
      <span className="inline-cell inline-cell--read" data-testid={testId}>
        {formatShortDate(value, locale)}
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      className="inline-cell inline-cell--date"
      data-status={editor.status}
      data-flash={editor.flashing ? 'true' : undefined}
      data-testid={testId}
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className="inline-cell__input inline-cell__input--date"
        aria-label={ariaLabel}
        aria-invalid={editor.status === 'error' || undefined}
        value={editor.status === 'idle' ? formatShortDate(value, locale) : editor.draft}
        placeholder="—"
        onFocus={editor.enterEdit}
        onChange={(e) => editor.setDraft(e.currentTarget.value)}
        onBlur={() => void editor.commit()}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <button
        ref={triggerRef}
        type="button"
        className="inline-cell__calendar-trigger"
        aria-label={t('inlineEdit.datePicker.openAria', { defaultValue: 'Open calendar' })}
        aria-haspopup="dialog"
        aria-expanded={calendarOpen}
        tabIndex={-1}
        onClick={openCalendar}
        data-testid={testId ? `${testId}-calendar-btn` : undefined}
      >
        <InlineCellChevron />
      </button>
      {calendarOpen ? (
        <InlineDateCalendar
          selected={ISO_DATE_RE.test(editor.draft.trim()) ? editor.draft.trim() : value}
          onSelect={handleCalendarSelect}
          onClose={closeCalendar}
          ariaLabel={t('inlineEdit.datePicker.calendarAria', { defaultValue: 'Pick a date' })}
        />
      ) : null}
      <InlineCellError
        error={editor.error}
        onRetry={() => void editor.retry()}
        onRevert={editor.cancel}
        rejectedValueLabel={editor.lastRejectedLabel}
        resolveMessage={(err) => resolveDateCellMessage(err, t)}
      />
    </span>
  );
}

/**
 * Resolve the user-facing message for a date-cell error. Translates the
 * two structured BE envelopes (422 stage-overlap, 400 "real release date")
 * into localised copy; anything else falls through to `error.message`.
 */
function resolveDateCellMessage(
  error: InlineEditorError,
  translate: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (error.kind === 'conflict' && error.conflict?.kind === 'overlap' && error.conflict.with) {
    return translate('inlineEdit.errors.stageOverlap', {
      defaultValue: 'Overlaps with {{neighbour}}',
      neighbour: error.conflict.with,
    });
  }
  if (error.kind === 'validation' && /real release date/i.test(error.message)) {
    return translate('inlineEdit.errors.invalidDate', {
      defaultValue: 'Use a real release date',
    });
  }
  return error.message;
}
