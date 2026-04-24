/**
 * Structured error for inline-edit endpoints (`api-contract.md` v1).
 *
 * The gateway's public envelope is `{ "error": string }`. Extended variants
 * for overlap / version conflict ship a nested `conflict` object:
 *
 *   { "error": "Updated by someone else",
 *     "conflict": { "kind": "version", "currentVersion": 7 } }
 *
 *   { "error": "Stage order violation",
 *     "conflict": { "kind": "overlap", "with": "Development" } }
 *
 * Inline editors pattern-match on `status` + `conflict.kind` to decide
 * whether to show a version-conflict affordance ("Updated by … Refresh"),
 * an overlap microcopy, or a generic "Couldn't save. Retry?" hairline.
 */
export type InlineEditConflictKind = 'version' | 'overlap' | 'order' | 'rangeInvalid';

export interface InlineEditConflict {
  kind: InlineEditConflictKind;
  with?: string;
  currentVersion?: number;
}

export class ApiError extends Error {
  readonly status: number;
  readonly conflict: InlineEditConflict | null;

  constructor(status: number, message: string, conflict: InlineEditConflict | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.conflict = conflict;
  }
}
