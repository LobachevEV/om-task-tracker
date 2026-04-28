import { ZodError } from 'zod';
import { ApiError, type InlineEditConflict } from '../../../../common/api/ApiError';

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

/**
 * Human-readable fallback messages for 409 / 422 responses. The server may
 * already send a useful string, but when it doesn't we want the micro-text
 * to read as a crisp sentence instead of "Request failed (409)".
 */
const CONFLICT_FALLBACK = 'Updated by someone else — refresh row to see latest.';
const VALIDATION_FALLBACK = 'This value was rejected.';
const NETWORK_FALLBACK = "Couldn't save. Retry?";
const PARSE_FALLBACK = "Couldn't read server response. Retry?";

function pickMessage(raw: string | undefined, fallback: string): string {
  const trimmed = raw?.trim();
  if (!trimmed) return fallback;
  // Strip the httpClient's "Request failed (N): " noise — the envelope's
  // body is more user-friendly and we already know the status code.
  return trimmed.replace(/^Request failed \(\d+\):?\s*/i, '') || fallback;
}

export function toInlineEditorError(err: unknown): InlineEditorError {
  if (err instanceof ApiError) {
    if (err.status === 409 || err.status === 422) {
      return {
        kind: 'conflict',
        message: pickMessage(err.message, CONFLICT_FALLBACK),
        conflict: err.conflict,
      };
    }
    if (err.status === 400) {
      return {
        kind: 'validation',
        message: pickMessage(err.message, VALIDATION_FALLBACK),
        conflict: err.conflict,
      };
    }
    return {
      kind: 'network',
      message: pickMessage(err.message, NETWORK_FALLBACK),
      conflict: err.conflict,
    };
  }
  if (err instanceof ZodError) {
    return { kind: 'network', message: PARSE_FALLBACK, conflict: null };
  }
  const rawMessage = err instanceof Error ? err.message : String(err);
  return { kind: 'network', message: pickMessage(rawMessage, NETWORK_FALLBACK), conflict: null };
}
