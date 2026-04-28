import type { TaskState } from './task';

export type FeatureState =
  | 'CsApproving'
  | 'Development'
  | 'Testing'
  | 'EthalonTesting'
  | 'LiveRelease';

export const FEATURE_STATES: readonly FeatureState[] = [
  'CsApproving',
  'Development',
  'Testing',
  'EthalonTesting',
  'LiveRelease',
] as const;

export interface MiniTeamMember {
  userId: number;
  email: string | null;
  displayName: string;
  role: 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';
}

export interface AttachedTask {
  id: number;
  jiraId: string;
  state: TaskState;
  userId: number;
}

/**
 * Per-stage plan row. Always present in canonical `FEATURE_STATES` order on
 * every response — backend materializes 5 rows per feature.
 *
 * `performer` is resolved only on detail reads; list rows carry the bare id.
 *
 * `stageVersion` is the per-stage optimistic-concurrency token consumed by
 * the inline editor's `If-Match` header.
 */
export interface FeatureStagePlan {
  stage: FeatureState;
  plannedStart: string | null;   // ISO yyyy-MM-dd
  plannedEnd: string | null;     // ISO yyyy-MM-dd
  performerUserId: number | null;
  /** Present only when returned as part of FeatureDetail. */
  performer?: MiniTeamMember | null;
  /** Optional on the wire; consumers treat absent as 0 and skip If-Match. */
  stageVersion?: number;
}

export interface FeatureSummary {
  id: number;
  title: string;
  description: string | null;
  state: FeatureState;
  /** Derived server-side as min(stagePlans[].plannedStart). */
  plannedStart: string | null;
  /** Derived server-side as max(stagePlans[].plannedEnd). */
  plannedEnd: string | null;
  leadUserId: number;
  managerUserId: number;
  taskCount: number;
  taskIds: number[];
  /** Always length 5, canonical order. Performer is id-only on list rows. */
  stagePlans: FeatureStagePlan[];
  /**
   * Optimistic-concurrency token sent in `If-Match` for feature-scoped inline
   * edits. Optional on the wire; consumers treat absent as 0 and skip If-Match.
   */
  version?: number;
}

export interface FeatureDetail {
  feature: FeatureSummary;         // stagePlans[].performer is resolved here (detail rows)
  tasks: AttachedTask[];
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];      // includes every performer referenced by any stage
  /**
   * Per-stage plan with resolved performer mini-member. Always length 5, canonical
   * order. Duplicates the shape of `feature.stagePlans` but with `performer` populated.
   */
  stagePlans: FeatureStagePlan[];
}

export interface CreateFeaturePayload {
  title: string;
  description?: string;
  leadUserId?: number;
}

/**
 * Sparse PATCH payload for `PATCH /api/plan/features/{id}` — every field is
 * optional; only the fields the user actually changed should be sent.
 */
export interface PatchFeaturePayload {
  title?: string;
  description?: string | null;
  leadUserId?: number;
  expectedVersion?: number;
}

/**
 * Sparse PATCH payload for `PATCH /api/plan/features/{id}/stages/{stage}` —
 * every field is optional. `stageOwnerUserId === null` clears the owner.
 */
export interface PatchFeatureStagePayload {
  stageOwnerUserId?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  expectedStageVersion?: number;
}

export type FeatureScope = 'all' | 'mine';
