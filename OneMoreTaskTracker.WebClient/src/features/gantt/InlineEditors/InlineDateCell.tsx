import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import { InlineCellChevron } from './InlineCellChevron';
import { InlineCellError } from './InlineCellError';
import { ISO_DATE_RE, addDays } from '../ganttMath';
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
 * is rejected mid-type.
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
  const { t } = useTranslation('gantt');
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (readOnly) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void editor.commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        editor.cancel();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const current = editor.draft.trim();
        if (current === '' || !ISO_DATE_RE.test(current)) return;
        e.preventDefault();
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        editor.setDraft(addDays(current, direction));
      }
    },
    [editor, readOnly],
  );

  if (readOnly) {
    return (
      <span className="inline-cell inline-cell--read" data-testid={testId}>
        {value ?? '—'}
      </span>
    );
  }

  return (
    <span
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
        value={editor.draft}
        placeholder="YYYY-MM-DD"
        onFocus={editor.enterEdit}
        onChange={(e) => editor.setDraft(e.currentTarget.value)}
        onBlur={() => void editor.commit()}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <InlineCellChevron />
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

