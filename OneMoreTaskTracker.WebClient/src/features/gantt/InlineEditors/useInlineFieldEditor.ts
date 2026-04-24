import { useCallback, useRef, useState } from 'react';
import type { InlineEditorStatus } from './InlineEditorStatus';
import { toInlineEditorError, type InlineEditorError } from './InlineEditorError';

/**
 * State-machine for a single inline-edit cell (title, description, owner,
 * or a stage date). Keeps optimistic/rollback semantics consistent across
 * every editor so the Evaluator sees identical behaviour at every cell.
 *
 * Usage:
 *
 *   const editor = useInlineFieldEditor({
 *     committed: feature.title,
 *     onSave: async (next) => {
 *       const updated = await planApi.updateFeatureTitle(id, { title: next });
 *       onFeatureUpdated(updated);  // page-level reconciliation
 *     },
 *     validate: (next) => next.trim() === '' ? "Title can't be empty" : null,
 *   });
 *
 *   <input
 *     value={editor.draft}
 *     onChange={(e) => editor.setDraft(e.currentTarget.value)}
 *     onBlur={editor.commit}
 *     onKeyDown={editor.handleKeyDown}
 *   />
 *
 * Invariants:
 * - `draft` mirrors the committed value whenever the input is NOT being
 *   edited. On Esc / reject, `draft` snaps back to `committed`.
 * - Only one commit is in flight per editor. A second commit while
 *   `status === 'pending'` is a no-op; callers MUST not queue writes.
 */
export interface UseInlineFieldEditorOptions<T> {
  /** The last server-acknowledged value for this cell. */
  committed: T;
  /** Issue the PATCH. Throw on any error so the hook can roll back. */
  onSave: (next: T) => Promise<void>;
  /**
   * Optional client-side validation. Return null if the value is OK, or a
   * message that will be shown inline in `--danger` micro-text on reject.
   */
  validate?: (next: T) => string | null;
  /** Equality check — defaults to `Object.is`. */
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseInlineFieldEditorResult<T> {
  /** Local draft value, either being typed or mirroring `committed`. */
  draft: T;
  /** Update the in-flight draft (no network call). */
  setDraft: (next: T) => void;
  /**
   * Commit the draft — optimistic write, rolls back on error. No-op if
   * unchanged. When `override` is passed, that value is committed instead
   * of the current draft (useful for picker-style editors where selection
   * short-circuits the draft state).
   */
  commit: (override?: T) => Promise<void>;
  /** Restore `draft` to `committed` (Esc semantics). */
  cancel: () => void;
  /** Current lifecycle status — drives CSS `data-status`. */
  status: InlineEditorStatus;
  /** Last commit error if `status === 'error'`, else null. */
  error: InlineEditorError | null;
  /** Mark the editor "editing" — call on focus. */
  enterEdit: () => void;
}

export function useInlineFieldEditor<T>(
  options: UseInlineFieldEditorOptions<T>,
): UseInlineFieldEditorResult<T> {
  const { committed, onSave, validate, isEqual = Object.is } = options;
  const [draft, setDraftState] = useState<T>(committed);
  const [status, setStatus] = useState<InlineEditorStatus>('idle');
  const [error, setError] = useState<InlineEditorError | null>(null);

  // Keep the draft in sync with `committed` if the parent replaces the
  // source of truth (e.g. server push, refresh, conflict roll-back) while
  // the editor is idle. We never steal focus — while editing, the user's
  // draft wins.
  const lastCommittedRef = useRef<T>(committed);
  if (!isEqual(lastCommittedRef.current, committed) && status === 'idle') {
    lastCommittedRef.current = committed;
    setDraftState(committed);
  } else {
    lastCommittedRef.current = committed;
  }

  const setDraft = useCallback((next: T) => {
    setDraftState(next);
    setStatus((s) => (s === 'error' ? 'editing' : s));
    setError((prev) => (prev == null ? prev : null));
  }, []);

  const enterEdit = useCallback(() => {
    setStatus((s) => (s === 'idle' ? 'editing' : s));
  }, []);

  const cancel = useCallback(() => {
    setDraftState(lastCommittedRef.current);
    setStatus('idle');
    setError(null);
  }, []);

  const commit = useCallback(
    async (override?: T) => {
      if (status === 'pending') return;
      const next = override === undefined ? draft : override;
      // Reflect the override in local draft so callers / tests can read it.
      if (override !== undefined) setDraftState(override);
      if (isEqual(next, lastCommittedRef.current)) {
        setStatus('idle');
        setError(null);
        return;
      }
      if (validate) {
        const violation = validate(next);
        if (violation != null) {
          setStatus('error');
          setError({ kind: 'validation', message: violation, conflict: null });
          setDraftState(lastCommittedRef.current);
          return;
        }
      }

      setStatus('pending');
      setError(null);
      try {
        await onSave(next);
        // `committed` will update via parent; we defensively snap idle here.
        setStatus('idle');
      } catch (err: unknown) {
        const normalised = toInlineEditorError(err);
        setError(normalised);
        setStatus('error');
        setDraftState(lastCommittedRef.current);
      }
    },
    [draft, isEqual, onSave, status, validate],
  );

  return { draft, setDraft, commit, cancel, status, error, enterEdit };
}
