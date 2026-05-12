import type {
  AttachedTask,
  FeatureDetail,
  FeatureSummary,
  MiniTeamMember,
} from '../../../common/types/feature';
import type { FeatureTrack } from '../../../common/types/featureTrack';

export const FIXTURE_TODAY = '2026-04-21';

const qa: MiniTeamMember = { userId: 10, email: 'qa@example.com', displayName: 'Qa Smith',  role: 'Qa' };
const fe: MiniTeamMember = { userId: 11, email: 'fe@example.com', displayName: 'Fe Wong',   role: 'FrontendDeveloper' };
const be: MiniTeamMember = { userId: 12, email: 'be@example.com', displayName: 'Be Ivanov', role: 'BackendDeveloper' };
const mg: MiniTeamMember = { userId:  1, email: 'pm@example.com', displayName: 'Mel PM',    role: 'Manager' };

export const MINI_TEAM_MEMBERS = { qa, fe, be, mg } as const;

/**
 * Frontend track covering all 5 lifecycle stages for SOLO_FEATURE.
 * Stage windows: CsApproving 04-15..04-17, Development 04-17..04-24,
 * Testing 04-24..04-26, EthalonTesting 04-26..04-27, LiveRelease 04-28..04-28.
 */
const SOLO_FEATURE_FRONTEND_TRACK: FeatureTrack = {
  id: 201,
  featureId: 101,
  kind: 'Frontend',
  trackOwnerUserId: fe.userId,
  version: 0,
  stages: [
    { stageKey: 'SrApproving',    plannedStart: '2026-04-15', plannedEnd: '2026-04-17', stageOwnerUserId: mg.userId, stageVersion: 0 },
    { stageKey: 'Development',    plannedStart: '2026-04-17', plannedEnd: '2026-04-24', stageOwnerUserId: fe.userId, stageVersion: 0 },
    { stageKey: 'StandTesting',   plannedStart: '2026-04-24', plannedEnd: '2026-04-26', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'EthalonTesting', plannedStart: '2026-04-26', plannedEnd: '2026-04-27', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'ReleaseToLive',  plannedStart: '2026-04-28', plannedEnd: '2026-04-28', stageOwnerUserId: mg.userId, stageVersion: 0 },
  ],
};

export const SOLO_FEATURE: FeatureSummary = {
  id: 101,
  title: 'Export to PDF',
  description: 'One-click export for the Plan view.',
  state: 'Development',
  plannedStart: '2026-04-15',
  plannedEnd:   '2026-04-28',
  leadUserId: fe.userId,
  managerUserId: mg.userId,
  taskCount: 2,
  taskIds: [501, 502],
  version: 0,
  tracks: [SOLO_FEATURE_FRONTEND_TRACK],
};

const MINI_TEAM_FEATURE_BACKEND_TRACK: FeatureTrack = {
  id: 202,
  featureId: 102,
  kind: 'Backend',
  trackOwnerUserId: be.userId,
  version: 0,
  stages: [
    { stageKey: 'CsApproving',    plannedStart: '2026-04-10', plannedEnd: '2026-04-12', stageOwnerUserId: mg.userId, stageVersion: 0 },
    { stageKey: 'Development',    plannedStart: '2026-04-12', plannedEnd: '2026-04-25', stageOwnerUserId: be.userId, stageVersion: 0 },
    { stageKey: 'StandTesting',   plannedStart: '2026-04-25', plannedEnd: '2026-05-01', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'EthalonTesting', plannedStart: '2026-05-01', plannedEnd: '2026-05-04', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'ReleaseToLive',  plannedStart: '2026-05-05', plannedEnd: '2026-05-05', stageOwnerUserId: mg.userId, stageVersion: 0 },
  ],
};

export const MINI_TEAM_FEATURE: FeatureSummary = {
  id: 102,
  title: 'Real-time MR status',
  description: 'Stream MR state changes from GitLab through gRPC.',
  state: 'Testing',
  plannedStart: '2026-04-10',
  plannedEnd:   '2026-05-05',
  leadUserId: be.userId,
  managerUserId: mg.userId,
  taskCount: 5,
  taskIds: [503, 504, 505, 506, 507],
  version: 0,
  tracks: [MINI_TEAM_FEATURE_BACKEND_TRACK],
};

export const UNSCHEDULED_FEATURE: FeatureSummary = {
  id: 103,
  title: 'Telemetry dashboards',
  description: null,
  state: 'CsApproving',
  plannedStart: null,
  plannedEnd:   null,
  leadUserId: fe.userId,
  managerUserId: mg.userId,
  taskCount: 0,
  taskIds: [],
  version: 0,
};

const OVERDUE_FEATURE_BACKEND_TRACK: FeatureTrack = {
  id: 203,
  featureId: 104,
  kind: 'Backend',
  trackOwnerUserId: be.userId,
  version: 0,
  stages: [
    { stageKey: 'CsApproving',    plannedStart: '2026-03-01', plannedEnd: '2026-03-05', stageOwnerUserId: mg.userId, stageVersion: 0 },
    { stageKey: 'Development',    plannedStart: '2026-03-05', plannedEnd: '2026-04-10', stageOwnerUserId: be.userId, stageVersion: 0 },
    { stageKey: 'StandTesting',   plannedStart: null,         plannedEnd: null,         stageOwnerUserId: null,      stageVersion: 0 },
    { stageKey: 'EthalonTesting', plannedStart: null,         plannedEnd: null,         stageOwnerUserId: null,      stageVersion: 0 },
    { stageKey: 'ReleaseToLive',  plannedStart: null,         plannedEnd: null,         stageOwnerUserId: null,      stageVersion: 0 },
  ],
};

export const OVERDUE_FEATURE: FeatureSummary = {
  id: 104,
  title: 'Feature-flag rollout',
  description: 'Originally scheduled for Q1.',
  state: 'Development',
  plannedStart: '2026-03-01',
  plannedEnd:   '2026-04-10',
  leadUserId: be.userId,
  managerUserId: mg.userId,
  taskCount: 3,
  taskIds: [508, 509, 510],
  version: 0,
  tracks: [OVERDUE_FEATURE_BACKEND_TRACK],
};

const SHIPPED_FEATURE_FRONTEND_TRACK: FeatureTrack = {
  id: 204,
  featureId: 105,
  kind: 'Frontend',
  trackOwnerUserId: fe.userId,
  version: 0,
  stages: [
    { stageKey: 'SrApproving',    plannedStart: '2026-04-02', plannedEnd: '2026-04-04', stageOwnerUserId: mg.userId, stageVersion: 0 },
    { stageKey: 'Development',    plannedStart: '2026-04-04', plannedEnd: '2026-04-12', stageOwnerUserId: fe.userId, stageVersion: 0 },
    { stageKey: 'StandTesting',   plannedStart: '2026-04-12', plannedEnd: '2026-04-15', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'EthalonTesting', plannedStart: '2026-04-15', plannedEnd: '2026-04-17', stageOwnerUserId: qa.userId, stageVersion: 0 },
    { stageKey: 'ReleaseToLive',  plannedStart: '2026-04-18', plannedEnd: '2026-04-18', stageOwnerUserId: mg.userId, stageVersion: 0 },
  ],
};

export const SHIPPED_FEATURE: FeatureSummary = {
  id: 105,
  title: 'Gantt page',
  description: 'This very feature, back in 2026.',
  state: 'LiveRelease',
  plannedStart: '2026-04-02',
  plannedEnd:   '2026-04-18',
  leadUserId: fe.userId,
  managerUserId: mg.userId,
  taskCount: 4,
  taskIds: [511, 512, 513, 514],
  version: 0,
  tracks: [SHIPPED_FEATURE_FRONTEND_TRACK],
};

export const ALL_FEATURES: FeatureSummary[] = [
  OVERDUE_FEATURE,
  SHIPPED_FEATURE,
  SOLO_FEATURE,
  MINI_TEAM_FEATURE,
  UNSCHEDULED_FEATURE,
];

const tasksForMiniTeam: AttachedTask[] = [
  { id: 503, jiraId: 'REAL-101', state: 'Completed',  userId: be.userId },
  { id: 504, jiraId: 'REAL-102', state: 'MrToMaster', userId: be.userId },
  { id: 505, jiraId: 'REAL-103', state: 'InTest',     userId: qa.userId },
  { id: 506, jiraId: 'REAL-104', state: 'InDev',      userId: fe.userId },
  { id: 507, jiraId: 'REAL-105', state: 'NotStarted', userId: fe.userId },
];

export const MINI_TEAM_FEATURE_DETAIL: FeatureDetail = {
  feature: MINI_TEAM_FEATURE,
  tasks: tasksForMiniTeam,
  lead: be,
  miniTeam: [be, fe, qa, mg],
};

export const EMPTY_FEATURE_DETAIL: FeatureDetail = {
  feature: UNSCHEDULED_FEATURE,
  tasks: [],
  lead: fe,
  miniTeam: [fe],
};

export const SHIPPED_FEATURE_DETAIL: FeatureDetail = {
  feature: SHIPPED_FEATURE,
  tasks: [],
  lead: fe,
  miniTeam: [fe, mg, qa],
};

export const STALE_PERFORMER_DETAIL: FeatureDetail = {
  feature: MINI_TEAM_FEATURE,
  tasks: [],
  lead: be,
  miniTeam: [be, qa, mg],
};
