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

export type GateKind = 'spec' | 'cs' | 'sr';
export type GateStatus = 'waiting' | 'approved' | 'rejected';
export type Track = 'backend' | 'frontend';
export type PhaseKind = 'development' | 'stand-testing' | 'ethalon-testing' | 'live-release';

export type GateKey = 'spec' | 'backend.prep-gate' | 'frontend.prep-gate';

export const GATE_KEYS: readonly GateKey[] = [
  'spec',
  'backend.prep-gate',
  'frontend.prep-gate',
] as const;

export const TRACKS: readonly Track[] = ['backend', 'frontend'] as const;

export const PHASE_KINDS: readonly PhaseKind[] = [
  'development',
  'stand-testing',
  'ethalon-testing',
  'live-release',
] as const;

export const MULTI_OWNER_PHASES: ReadonlySet<PhaseKind> = new Set<PhaseKind>([
  'development',
  'stand-testing',
]);

export const SUB_STAGE_HARD_CAP = 6 as const;

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

export interface FeatureGate {
  id: number;
  gateKey: GateKey;
  kind: GateKind;
  track: Track | null;
  status: GateStatus;
  approverUserId: number | null;
  approver?: MiniTeamMember | null;
  approvedAtUtc: string | null;
  requestedAtUtc: string | null;
  rejectionReason: string | null;
  version: number;
}

export interface FeatureSubStage {
  id: number;
  track: Track;
  phase: PhaseKind;
  ordinal: number;
  ownerUserId: number | null;
  owner?: MiniTeamMember | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  version: number;
}

export interface FeaturePhaseTaxonomy {
  phase: PhaseKind;
  multiOwner: boolean;
  cap: number;
  subStages: FeatureSubStage[];
}

export interface FeatureTrackTaxonomy {
  track: Track;
  phases: FeaturePhaseTaxonomy[];
}

export interface FeatureTaxonomy {
  gates: FeatureGate[];
  tracks: FeatureTrackTaxonomy[];
}

export interface FeatureSummary {
  id: number;
  title: string;
  description: string | null;
  state: FeatureState;
  plannedStart: string | null;
  plannedEnd: string | null;
  leadUserId: number;
  managerUserId: number;
  taskCount: number;
  taskIds: number[];
  taxonomy: FeatureTaxonomy;
  version?: number;
}

export interface FeatureDetail {
  feature: FeatureSummary;
  tasks: AttachedTask[];
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
}

export interface CreateFeaturePayload {
  title: string;
  description?: string;
  leadUserId?: number;
}

export interface PatchFeaturePayload {
  title?: string;
  description?: string | null;
  leadUserId?: number;
  expectedVersion?: number;
}

export interface PatchFeatureGatePayload {
  status?: GateStatus;
  rejectionReason?: string | null;
  expectedVersion?: number;
}

export interface PatchFeatureSubStagePayload {
  ownerUserId?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  expectedVersion?: number;
}

export interface AppendFeatureSubStagePayload {
  ownerUserId?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
}

export interface PatchFeatureGateResponse {
  featureId: number;
  featureVersion: number;
  taxonomy: FeatureTaxonomy;
}

export interface SubStageMutationResponse {
  featureId: number;
  featureVersion: number;
  createdSubStageId: number | null;
  taxonomy: FeatureTaxonomy;
}

export type FeatureScope = 'all' | 'mine';
