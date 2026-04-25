import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import { InlineCellChevron } from './InlineCellChevron';
import './InlineEditors.css';

export interface InlineDateCellProps {
  /** Committed ISO yyyy-MM-dd value, or null when the plan is unset. */
  value: string | null;
  /** Commit handler — throw on failure so the cell rolls back. */
  onSave: (next: string | null) => Promise<void>;
  /** Accessible label — must carry field + stage + feature context. */
  ariaLabel: string;
  /** Optional per-field validator. Runs on the parsed `"yyyy-MM-dd" | null`. */
  validate?: (next: string | null) => string | null;
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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDraft(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  if (!ISO_DATE.test(trimmed)) {
    // Iter 1 skeleton: keep it simple — reject anything not ISO. Phase B
    // will add localized-short parsing ("12 May").
    throw new Error('invalid-date');
  }
  return trimmed;
}

function nudgeIso(iso: string | null, direction: 1 | -1): string | null {
  if (iso == null) return iso;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(ms)) return iso;
  const next = new Date(ms + direction * 86_400_000);
  const y = next.getUTCFullYear().toString().padStart(4, '0');
  const m = (next.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = next.getUTCDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toDraft(value: string | null): string {
  return value ?? '';
}

/**
 * Stage planned-start / planned-end inline editor.
 *
 * Iter 1 skeleton:
 * - Accepts ISO yyyy-MM-dd strings (brief §6 primary input path).
 * - `ArrowUp` / `ArrowDown` nudge the date by one day (brief §5 "Nudge a
 *   planned date" flow) when the draft parses as ISO.
 * - Invalid strings roll back with the inline error — no keystroke is
 *   rejected mid-type.
 *
 * Phase B will add:
 * - Chevron-triggered calendar popover (anchored below; flips above near
 *   the viewport bottom).
 * - Localized-short parsing ("12 May").
 * - Stage-overlap validation client-side.
 */
export function InlineDateCell({
  value,
  onSave,
  ariaLabel,
  validate,
  readOnly,
  testId,
  onAnnounce,
  buildAnnouncement,
}: InlineDateCellProps) {
  const { t } = useTranslation('gantt');
  const inputRef = useRef<HTMLInputElement>(null);
  const editor = useInlineFieldEditor<string>({
    committed: toDraft(value),
    onSave: async (next: string) => {
      const parsed = parseDraft(next);
      if (validate) {
        const violation = validate(parsed);
        if (violation != null) throw new Error(violation);
      }
      await onSave(parsed);
    },
    validate: (next) => {
      const trimmed = next.trim();
      if (trimmed === '') return null;
      if (!ISO_DATE.test(trimmed)) return 'Use a real release date';
      return null;
    },
    buildAnnouncement,
  });

  if (onAnnounce && editor.announcement) {
    queueMicrotask(() => onAnnounce(editor.announcement));
  }

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
        const direction = e.key === 'ArrowUp' ? 1 : -1;
        const current = editor.draft.trim();
        if (current === '' || !ISO_DATE.test(current)) return;
        e.preventDefault();
        const nudged = nudgeIso(current, direction);
        if (nudged) editor.setDraft(nudged);
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
      <InlineCellMessage error={editor.error} translate={t} />
    </span>
  );
}

/**
 * Resolve the user-facing message for a date-cell error.
 *
 * The inline-edit BE contract (api-contract.md) emits two structured
 * date-related error envelopes that deserve a friendlier copy than the raw
 * server text:
 *
 * - HTTP 422 `{ error: "Stage order violation",
 *               conflict: { kind: "overlap", with: "Development" } }`
 *   → "Overlaps with Development" (per inlineEdit.errors.stageOverlap).
 *
 * - HTTP 400 `{ error: "Use a real release date" }`  (year outside 2000..2100)
 *   → keep the literal copy via inlineEdit.errors.invalidDate so it stays
 *     localizable.
 *
 * Anything else falls through to the server-supplied `error.message` (which
 * `toInlineEditorError` already strips of the `Request failed (N): ` prefix).
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

function InlineCellMessage({
  error,
  translate,
}: {
  error: InlineEditorError | null;
  translate: (key: string, opts?: Record<string, unknown>) => string;
}) {
  if (!error) return null;
  const message = resolveDateCellMessage(error, translate);
  return (
    <span
      className="inline-cell__error"
      role="alert"
      data-kind={error.kind}
      data-testid="inline-cell-error"
    >
      {message}
    </span>
  );
}
