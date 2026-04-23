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
  email: string;
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
 * every response — backend materializes 5 rows per feature (see api-contract.md).
 *
 * `performer` is resolved only on detail reads; list rows carry the bare id.
 */
export interface FeatureStagePlan {
  stage: FeatureState;
  plannedStart: string | null;   // ISO yyyy-MM-dd
  plannedEnd: string | null;     // ISO yyyy-MM-dd
  performerUserId: number | null;
  /** Present only when returned as part of FeatureDetail. */
  performer?: MiniTeamMember | null;
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

export interface UpdateFeaturePayload {
  title?: string;
  description?: string | null;
  leadUserId?: number;
  state?: FeatureState;
  /** Exactly 5 entries when provided (contract rule). Omit to leave plans untouched. */
  stagePlans?: FeatureStagePlan[];
}

export type FeatureScope = 'all' | 'mine';
