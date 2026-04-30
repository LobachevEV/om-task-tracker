/**
 * Structured error envelope for inline-edit and taxonomy-mutating endpoints.
 *
 * The gateway's public envelope is `{ "error": string }`. Extended variants
 * surface a typed `conflict` object so inline editors can pattern-match on
 * `status` + `conflict.kind` and render the right CTA without re-parsing
 * a message.
 */
export type InlineEditConflictKind =
  | 'version'
  | 'overlap'
  | 'order'
  | 'rangeInvalid'
  | 'subStageCap'
  | 'subStageOverlap';

export interface InlineEditConflict {
  kind: InlineEditConflictKind;
  with?: string;
  currentVersion?: number;
  cap?: number;
  track?: string;
  phase?: string;
  neighborOrdinal?: number;
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
