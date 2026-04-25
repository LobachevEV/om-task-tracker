import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import { InlineCellError } from './InlineCellError';
import './InlineEditors.css';

export interface InlineTextCellProps {
  /** The last server-acknowledged value (source of truth). */
  value: string;
  /** Commit handler — throw on failure so the cell can roll back. */
  onSave: (next: string) => Promise<void>;
  /** Accessible label; must carry field + feature/stage context per brief §7. */
  ariaLabel: string;
  /** Optional per-field validator. Return null when OK, else the inline message. */
  validate?: (next: string) => string | null;
  /** Disable the editor (viewer role / submitting). */
  readOnly?: boolean;
  /** Optional placeholder when draft is empty. */
  placeholder?: string;
  /** Apply extra className (e.g. to inherit parent typography). */
  className?: string;
  /** Hook into the test id seam for Evaluator assertions. */
  testId?: string;
  /**
   * Called when a commit outcome should be spoken by a screen reader.
   * Parent (e.g. GanttFeatureRow) owns the `aria-live` region and relays
   * the string verbatim. No-op when omitted.
   */
  onAnnounce?: (message: string) => void;
  /** Build the announcement message. Receives committed value + outcome. */
  buildAnnouncement?: (outcome: 'saved' | 'error', value: string, error: InlineEditorError | null) => string;
}

/**
 * Single-line inline text editor — feature title cell in the summary row.
 *
 * Keyboard contract (design brief §6):
 *  - `Enter` commits and stays on the cell.
 *  - `Tab` / `Shift+Tab` commits and moves to the next focusable element
 *    (browser-native; we just rely on `blur` to fire `commit`).
 *  - `Esc` reverts to the committed value; focus stays on the cell.
 *
 * Visual contract (iter 1 skeleton): a plain `<input>` takes the cell width,
 * shows a bottom hairline, and flashes `--accent-dim` on success. Design
 * polish (dotted hover underline, chevrons, viewport-flipping pickers) is
 * Phase B.
 */
export function InlineTextCell({
  value,
  onSave,
  ariaLabel,
  validate,
  readOnly,
  placeholder,
  className,
  testId,
  onAnnounce,
  buildAnnouncement,
}: InlineTextCellProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const editor = useInlineFieldEditor<string>({
    committed: value,
    onSave,
    validate,
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
      }
    },
    [editor, readOnly],
  );

  if (readOnly) {
    return (
      <span className={`inline-cell inline-cell--read ${className ?? ''}`.trim()}>{value}</span>
    );
  }

  return (
    <span
      className={`inline-cell inline-cell--text ${className ?? ''}`.trim()}
      data-status={editor.status}
      data-flash={editor.flashing ? 'true' : undefined}
      data-testid={testId}
    >
      <input
        ref={inputRef}
        type="text"
        className="inline-cell__input"
        aria-label={ariaLabel}
        aria-invalid={editor.status === 'error' || undefined}
        value={editor.draft}
        placeholder={placeholder}
        onFocus={editor.enterEdit}
        onChange={(e) => editor.setDraft(e.currentTarget.value)}
        onBlur={() => void editor.commit()}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-input` : undefined}
      />
      <InlineCellError
        error={editor.error}
        onRetry={() => void editor.retry()}
        onRevert={editor.cancel}
        rejectedValueLabel={editor.lastRejectedLabel}
      />
    </span>
  );
}
