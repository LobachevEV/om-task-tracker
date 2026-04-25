import { useCallback, useEffect, useRef, useState } from 'react';
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
  /**
   * Produce the screen-reader announcement after a successful commit or an
   * error. Called AFTER the mutation resolves. Return an empty string to
   * skip announcement. When omitted the hook emits no announcements.
   */
  buildAnnouncement?: (outcome: 'saved' | 'error', committed: T, error: InlineEditorError | null) => string;
}

/** Duration of the accept-flash background pulse (ms). */
const ACCEPT_FLASH_MS = 120;

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
  /**
   * Re-attempt the most recent rejected commit. No-op when nothing was
   * rejected. Lets the user recover from a transient network/conflict
   * failure without retyping the value.
   */
  retry: () => Promise<void>;
  /**
   * The value that was last rejected by the server (or null when none).
   * Preserved so the cell can offer a Retry affordance and surface the
   * value alongside the server's current one.
   */
  lastRejectedDraft: T | null;
  /** Current lifecycle status — drives CSS `data-status`. */
  status: InlineEditorStatus;
  /** Last commit error if `status === 'error'`, else null. */
  error: InlineEditorError | null;
  /** Mark the editor "editing" — call on focus. */
  enterEdit: () => void;
  /**
   * True for ~120ms after a successful commit. Drives the accept-flash CSS
   * (`data-flash="true"`). Respects `prefers-reduced-motion: reduce` —
   * caller can guard with `matchMedia` if needed.
   */
  flashing: boolean;
  /**
   * Human-readable announcement after a transition. Drives the
   * per-row `aria-live="polite"` region. Empty string when nothing to
   * announce. Callers provide the text via `onCommitAnnouncement`.
   */
  announcement: string;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function useInlineFieldEditor<T>(
  options: UseInlineFieldEditorOptions<T>,
): UseInlineFieldEditorResult<T> {
  const { committed, onSave, validate, isEqual = Object.is, buildAnnouncement } = options;
  const [status, setStatus] = useState<InlineEditorStatus>('idle');
  const [error, setError] = useState<InlineEditorError | null>(null);
  const [flashing, setFlashing] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>('');
  const [lastRejectedDraft, setLastRejectedDraft] = useState<T | null>(null);

  // Local draft state, keyed by the render-time `committed` value for the
  // idle-resync case. Using `useState` as a "controlled/uncontrolled mix"
  // here would require a dangerous setState-in-effect; instead we derive
  // the draft during render when the parent's source-of-truth changes while
  // the editor is idle. This is the documented React pattern for "adjusting
  // state while rendering" (see React docs: You Might Not Need An Effect).
  const [trackedCommitted, setTrackedCommitted] = useState<T>(committed);
  const [draft, setDraftState] = useState<T>(committed);

  if (!isEqual(trackedCommitted, committed) && status === 'idle') {
    setTrackedCommitted(committed);
    setDraftState(committed);
  }

  const lastCommittedRef = useRef<T>(committed);
  useEffect(() => {
    lastCommittedRef.current = committed;
  }, [committed]);

  const setDraft = useCallback((next: T) => {
    setDraftState(next);
    setStatus((s) => (s === 'error' ? 'editing' : s));
    setError((prev) => (prev == null ? prev : null));
    setLastRejectedDraft((prev) => (prev === null ? prev : null));
  }, []);

  const enterEdit = useCallback(() => {
    setStatus((s) => (s === 'idle' ? 'editing' : s));
  }, []);

  const cancel = useCallback(() => {
    setDraftState(lastCommittedRef.current);
    setStatus('idle');
    setError(null);
    setLastRejectedDraft(null);
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
        setStatus('idle');
        setLastRejectedDraft(null);
        if (!prefersReducedMotion()) {
          setFlashing(true);
          window.setTimeout(() => setFlashing(false), ACCEPT_FLASH_MS);
        }
        if (buildAnnouncement) {
          const text = buildAnnouncement('saved', next, null);
          if (text) setAnnouncement(text);
        }
      } catch (err: unknown) {
        const normalised = toInlineEditorError(err);
        setError(normalised);
        setStatus('error');
        setLastRejectedDraft(next);
        setDraftState(lastCommittedRef.current);
        if (buildAnnouncement) {
          const text = buildAnnouncement('error', lastCommittedRef.current, normalised);
          if (text) setAnnouncement(text);
        }
      }
    },
    [draft, isEqual, onSave, status, validate, buildAnnouncement],
  );

  const retry = useCallback(async () => {
    if (lastRejectedDraft === null) return;
    await commit(lastRejectedDraft);
  }, [commit, lastRejectedDraft]);

  return {
    draft,
    setDraft,
    commit,
    cancel,
    retry,
    lastRejectedDraft,
    status,
    error,
    enterEdit,
    flashing,
    announcement,
  };
}
