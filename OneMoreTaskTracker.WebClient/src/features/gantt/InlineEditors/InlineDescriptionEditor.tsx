import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useInlineFieldEditor } from './useInlineFieldEditor';
import type { InlineEditorError } from './InlineEditorError';
import './InlineEditors.css';

export interface InlineDescriptionEditorProps {
  /** Committed description from the server — null means "no description yet". */
  value: string | null;
  /** Commit handler — throw on failure so we roll back. */
  onSave: (next: string | null) => Promise<void>;
  /** Accessible label — must carry field + feature context. */
  ariaLabel: string;
  /** Disable the editor (viewer role / submitting). */
  readOnly?: boolean;
  /** Hook into the test id seam for Evaluator assertions. */
  testId?: string;
}

const MAX_LEN = 4000;

function toDraft(value: string | null): string {
  return value ?? '';
}

function fromDraft(draft: string): string | null {
  const trimmed = draft.trimEnd();
  return trimmed === '' ? null : trimmed;
}

/**
 * Description editor that sits between the summary row and the first stage
 * sub-row. Iter 1 skeleton:
 *
 * - Collapsed: one-line muted preview.
 * - Expanded: `<textarea>` in place. Ctrl+Enter or blur commits; Esc reverts
 *   to the pre-edit snapshot (brief §9.2).
 * - No debounced auto-save yet (Phase B).
 */
export function InlineDescriptionEditor({
  value,
  onSave,
  ariaLabel,
  readOnly,
  testId,
}: InlineDescriptionEditorProps) {
  const { t } = useTranslation('gantt');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [expanded, setExpanded] = useState(false);

  const editor = useInlineFieldEditor<string>({
    committed: toDraft(value),
    onSave: async (next: string) => {
      await onSave(fromDraft(next));
    },
    validate: (next) => {
      if (next.length > MAX_LEN) return `Description too long (max ${MAX_LEN} chars)`;
      return null;
    },
  });

  const expand = useCallback(() => {
    setExpanded(true);
    editor.enterEdit();
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [editor]);

  const collapse = useCallback(() => {
    setExpanded(false);
  }, []);

  const commitAndCollapse = useCallback(async () => {
    await editor.commit();
    // Only collapse on success — the hook snaps status to 'idle' after OK.
    setExpanded((prev) => (editor.status === 'error' ? prev : false));
  }, [editor]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (readOnly) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        editor.cancel();
        collapse();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void commitAndCollapse();
      }
    },
    [commitAndCollapse, collapse, editor, readOnly],
  );

  if (readOnly || !expanded) {
    const preview = value ?? t('inlineEdit.descriptionEmpty', {
      defaultValue: 'Add a description',
    });
    const isEmpty = value == null;
    return (
      <button
        type="button"
        className="inline-description inline-description--collapsed"
        data-empty={isEmpty || undefined}
        data-testid={testId}
        onClick={readOnly ? undefined : expand}
        onFocus={readOnly ? undefined : expand}
        aria-label={ariaLabel}
        disabled={readOnly}
      >
        <span className="inline-description__preview">{preview}</span>
      </button>
    );
  }

  return (
    <div
      className="inline-description inline-description--expanded"
      data-status={editor.status}
      data-testid={testId}
    >
      <textarea
        ref={textareaRef}
        className="inline-description__textarea"
        aria-label={ariaLabel}
        aria-invalid={editor.status === 'error' || undefined}
        value={editor.draft}
        maxLength={MAX_LEN + 1 /* allow over-limit for inline error */}
        rows={4}
        onChange={(e) => editor.setDraft(e.currentTarget.value)}
        onBlur={() => void commitAndCollapse()}
        onKeyDown={handleKeyDown}
        data-testid={testId ? `${testId}-textarea` : undefined}
      />
      <InlineCellMessage error={editor.error} />
    </div>
  );
}

function InlineCellMessage({ error }: { error: InlineEditorError | null }) {
  if (!error) return null;
  return (
    <span
      className="inline-cell__error"
      role="alert"
      data-kind={error.kind}
      data-testid="inline-cell-error"
    >
      {error.message}
    </span>
  );
}
