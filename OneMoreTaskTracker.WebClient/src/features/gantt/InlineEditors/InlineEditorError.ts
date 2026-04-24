import { ApiError, type InlineEditConflict } from '../../../shared/api/ApiError';

/**
 * Normalised per-cell error surfaced to the inline editor.
 *
 * `kind`:
 * - `validation` — a client-side or server-side field rule was violated.
 *   Message is safe for the inline `--danger` micro-text ("End must be on or
 *   after 12 May"). Retries are pointless without changing the value.
 * - `conflict`   — server returned 409 / 422 with a `conflict.*` hint. The
 *   caller must render the bespoke conflict state (roll back to server's
 *   value + "Updated by … Refresh" link).
 * - `network`    — transport blew up (502, offline, etc.). Surface as
 *   "Couldn't save. Retry?" with an inline Retry link.
 */
export interface InlineEditorError {
  kind: 'validation' | 'conflict' | 'network';
  message: string;
  conflict: InlineEditConflict | null;
}

export function toInlineEditorError(err: unknown): InlineEditorError {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 422) {
      return {
        kind: 'conflict',
        message: err.message,
        conflict: err.conflict,
      };
    }
    if (err.status === 400) {
      return { kind: 'validation', message: err.message, conflict: err.conflict };
    }
    return { kind: 'network', message: err.message, conflict: err.conflict };
  }
  const message = err instanceof Error ? err.message : String(err);
  return { kind: 'network', message, conflict: null };
}
