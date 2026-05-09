import type { TaskState } from './task';
import type { FeatureTrack } from './featureTrack';

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
  // CsApproving stage
  csApprovingPlannedStart: string | null;
  csApprovingPlannedEnd: string | null;
  csApprovingOwnerUserId: number | null;
  // Development stage
  developmentPlannedStart: string | null;
  developmentPlannedEnd: string | null;
  developmentOwnerUserId: number | null;
  // Testing stage
  testingPlannedStart: string | null;
  testingPlannedEnd: string | null;
  testingOwnerUserId: number | null;
  // EthalonTesting stage
  ethalonTestingPlannedStart: string | null;
  ethalonTestingPlannedEnd: string | null;
  ethalonTestingOwnerUserId: number | null;
  // LiveRelease stage
  liveReleasePlannedStart: string | null;
  liveReleasePlannedEnd: string | null;
  liveReleaseOwnerUserId: number | null;
  version?: number;
  tracks?: FeatureTrack[];
}

export interface FeatureDetail {
  feature: FeatureSummary;
  tasks: AttachedTask[];
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
  tracks?: FeatureTrack[];
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
  // CsApproving stage
  csApprovingPlannedStart?: string | null;
  csApprovingPlannedEnd?: string | null;
  csApprovingOwnerUserId?: number | null;
  // Development stage
  developmentPlannedStart?: string | null;
  developmentPlannedEnd?: string | null;
  developmentOwnerUserId?: number | null;
  // Testing stage
  testingPlannedStart?: string | null;
  testingPlannedEnd?: string | null;
  testingOwnerUserId?: number | null;
  // EthalonTesting stage
  ethalonTestingPlannedStart?: string | null;
  ethalonTestingPlannedEnd?: string | null;
  ethalonTestingOwnerUserId?: number | null;
  // LiveRelease stage
  liveReleasePlannedStart?: string | null;
  liveReleasePlannedEnd?: string | null;
  liveReleaseOwnerUserId?: number | null;
}

export type FeatureScope = 'all' | 'mine';
