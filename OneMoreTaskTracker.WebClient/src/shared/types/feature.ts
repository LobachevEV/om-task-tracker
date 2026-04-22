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
  plannedStart?: string | null;
  plannedEnd?: string | null;
}

export interface UpdateFeaturePayload {
  title?: string;
  description?: string | null;
  leadUserId?: number;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  state?: FeatureState;
}

export type FeatureScope = 'all' | 'mine';
