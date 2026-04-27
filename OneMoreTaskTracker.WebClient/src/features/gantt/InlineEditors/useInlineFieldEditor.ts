import { useCallback, useEffect, useRef, useState } from 'react';
import type { InlineEditorStatus } from './InlineEditorStatus';
import { toInlineEditorError, type InlineEditorError } from './InlineEditorError';

/**
 * State-machine for a single inline-edit cell (title, description, owner,
 * or a stage date). Keeps optimistic/rollback semantics consistent across
 * every editor.
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
   * error. Return an empty string to skip announcement.
   */
  buildAnnouncement?: (outcome: 'saved' | 'error', committed: T, error: InlineEditorError | null) => string;
  /**
   * Relay an announcement string to a parent `aria-live` region. Called
   * once per outcome (so identical consecutive announcements still fire,
   * unlike a state-keyed effect would).
   */
  onAnnounce?: (message: string) => void;
  /**
   * Project a rejected value to the user-facing label shown next to the
   * Retry button. When omitted, uses `String(value)` for non-null values
   * and `null` for null/undefined.
   */
  formatRejectedLabel?: (value: T) => string | null;
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
  /** True when the most recent commit was rejected and is pending retry. */
  hasRejection: boolean;
  /**
   * The value that was rejected. Meaningful only when `hasRejection` is
   * true; otherwise `null`. Read alongside `hasRejection` rather than
   * treating `null` as "no rejection" — `null` is a legitimate rejected
   * payload (e.g. unassigning an owner).
   */
  lastRejectedValue: T | null;
  /**
   * The user-facing label for the rejected value, projected via
   * `formatRejectedLabel` if supplied. Null when nothing is rejected.
   */
  lastRejectedLabel: string | null;
  /** Current lifecycle status — drives CSS `data-status`. */
  status: InlineEditorStatus;
  /** Last commit error if `status === 'error'`, else null. */
  error: InlineEditorError | null;
  /** Mark the editor "editing" — call on focus. */
  enterEdit: () => void;
  /**
   * True for ~120ms after a successful commit. Drives the accept-flash CSS
   * (`data-flash="true"`). Respects `prefers-reduced-motion: reduce`.
   */
  flashing: boolean;
}

const reducedMotionQuery =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

function prefersReducedMotion(): boolean {
  return reducedMotionQuery?.matches ?? false;
}

function defaultRejectedLabel<T>(value: T): string | null {
  if (value == null) return null;
  return String(value);
}

export function useInlineFieldEditor<T>(
  options: UseInlineFieldEditorOptions<T>,
): UseInlineFieldEditorResult<T> {
  const {
    committed,
    onSave,
    validate,
    isEqual = Object.is,
    buildAnnouncement,
    onAnnounce,
    formatRejectedLabel,
  } = options;
  const [status, setStatus] = useState<InlineEditorStatus>('idle');
  const [error, setError] = useState<InlineEditorError | null>(null);
  const [flashing, setFlashing] = useState<boolean>(false);
  const [lastRejectedDraft, setLastRejectedDraft] = useState<{ value: T } | null>(null);

  // Local draft state, derived during render against `committed` for the
  // idle-resync case. This is the documented React pattern for "adjusting
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

  // Keep callbacks fresh without retriggering `commit`'s identity. The
  // hook calls `onAnnounce` directly so identical consecutive messages
  // still fire (a state-keyed effect would dedupe them).
  const onAnnounceRef = useRef(onAnnounce);
  const buildAnnouncementRef = useRef(buildAnnouncement);
  useEffect(() => {
    onAnnounceRef.current = onAnnounce;
    buildAnnouncementRef.current = buildAnnouncement;
  });

  const flashTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current != null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

  const announce = useCallback(
    (outcome: 'saved' | 'error', value: T, err: InlineEditorError | null) => {
      const build = buildAnnouncementRef.current;
      const relay = onAnnounceRef.current;
      if (!build || !relay) return;
      const text = build(outcome, value, err);
      if (text) relay(text);
    },
    [],
  );

  const setDraft = useCallback((next: T) => {
    setDraftState(next);
    setStatus((s) => (s === 'error' ? 'editing' : s));
    setError((prev) => (prev == null ? prev : null));
    setLastRejectedDraft((prev) => (prev == null ? prev : null));
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
        setLastRejectedDraft((prev) => (prev === null ? prev : null));
        if (flashTimeoutRef.current != null) {
          window.clearTimeout(flashTimeoutRef.current);
          flashTimeoutRef.current = null;
        }
        if (!prefersReducedMotion()) {
          setFlashing(true);
          flashTimeoutRef.current = window.setTimeout(() => {
            setFlashing(false);
            flashTimeoutRef.current = null;
          }, ACCEPT_FLASH_MS);
        }
        announce('saved', next, null);
      } catch (err: unknown) {
        const normalised = toInlineEditorError(err);
        setError(normalised);
        setStatus('error');
        setLastRejectedDraft({ value: next });
        setDraftState(lastCommittedRef.current);
        announce('error', lastCommittedRef.current, normalised);
      }
    },
    [announce, draft, isEqual, onSave, status, validate],
  );

  const retry = useCallback(async () => {
    if (lastRejectedDraft === null) return;
    await commit(lastRejectedDraft.value);
  }, [commit, lastRejectedDraft]);

  const hasRejection = lastRejectedDraft !== null;
  const lastRejectedValue = lastRejectedDraft ? lastRejectedDraft.value : null;
  const lastRejectedLabel = lastRejectedDraft
    ? (formatRejectedLabel ?? defaultRejectedLabel)(lastRejectedDraft.value)
    : null;

  return {
    draft,
    setDraft,
    commit,
    cancel,
    retry,
    hasRejection,
    lastRejectedValue,
    lastRejectedLabel,
    status,
    error,
    enterEdit,
    flashing,
  };
}
