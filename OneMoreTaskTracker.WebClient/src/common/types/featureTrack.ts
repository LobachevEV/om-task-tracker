import type { MiniTeamMember } from './feature';

export type FeatureTrackKind = 'Frontend' | 'Backend';

export type FrontendStageKey = 'SrApproving' | 'Development' | 'StandTesting' | 'EthalonTesting' | 'ReleaseToLive';
export type BackendStageKey = 'CsApproving' | 'Development' | 'StandTesting' | 'EthalonTesting' | 'ReleaseToLive';
export type FeatureTrackStageKey = FrontendStageKey | BackendStageKey;

export const FRONTEND_STAGE_KEYS: readonly FrontendStageKey[] = [
  'SrApproving',
  'Development',
  'StandTesting',
  'EthalonTesting',
  'ReleaseToLive',
] as const;

export const BACKEND_STAGE_KEYS: readonly BackendStageKey[] = [
  'CsApproving',
  'Development',
  'StandTesting',
  'EthalonTesting',
  'ReleaseToLive',
] as const;

export interface FeatureTrackStage {
  stageKey: FeatureTrackStageKey;
  plannedStart: string | null;
  plannedEnd: string | null;
  stageOwnerUserId: number | null;
  stageVersion: number;
  stageOwner?: MiniTeamMember | null;
}

export interface FeatureTrack {
  id: number;
  featureId: number;
  kind: FeatureTrackKind;
  trackOwnerUserId: number;
  version: number;
  stages: FeatureTrackStage[];
  trackOwner?: MiniTeamMember | null;
}

export interface PatchFeatureTrackPayload {
  trackOwnerUserId?: number;
  expectedVersion?: number;
}

export interface PatchFeatureTrackStagePayload {
  stageOwnerUserId?: number | null;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  expectedStageVersion?: number;
}
