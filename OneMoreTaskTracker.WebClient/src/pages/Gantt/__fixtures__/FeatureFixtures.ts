import type {
  AttachedTask,
  FeatureDetail,
  FeatureSummary,
  MiniTeamMember,
} from '../../../common/types/feature';

export const FIXTURE_TODAY = '2026-04-21';

const qa: MiniTeamMember = { userId: 10, email: 'qa@example.com', displayName: 'Qa Smith',  role: 'Qa' };
const fe: MiniTeamMember = { userId: 11, email: 'fe@example.com', displayName: 'Fe Wong',   role: 'FrontendDeveloper' };
const be: MiniTeamMember = { userId: 12, email: 'be@example.com', displayName: 'Be Ivanov', role: 'BackendDeveloper' };
const mg: MiniTeamMember = { userId:  1, email: 'pm@example.com', displayName: 'Mel PM',    role: 'Manager' };

export const MINI_TEAM_MEMBERS = { qa, fe, be, mg } as const;

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
  csApprovingPlannedStart:    '2026-04-15',
  csApprovingPlannedEnd:      '2026-04-17',
  csApprovingOwnerUserId:     mg.userId,
  developmentPlannedStart:    '2026-04-17',
  developmentPlannedEnd:      '2026-04-24',
  developmentOwnerUserId:     fe.userId,
  testingPlannedStart:        '2026-04-24',
  testingPlannedEnd:          '2026-04-26',
  testingOwnerUserId:         qa.userId,
  ethalonTestingPlannedStart: '2026-04-26',
  ethalonTestingPlannedEnd:   '2026-04-27',
  ethalonTestingOwnerUserId:  qa.userId,
  liveReleasePlannedStart:    '2026-04-28',
  liveReleasePlannedEnd:      '2026-04-28',
  liveReleaseOwnerUserId:     mg.userId,
  version: 0,
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
  csApprovingPlannedStart:    '2026-04-10',
  csApprovingPlannedEnd:      '2026-04-12',
  csApprovingOwnerUserId:     mg.userId,
  developmentPlannedStart:    '2026-04-12',
  developmentPlannedEnd:      '2026-04-25',
  developmentOwnerUserId:     be.userId,
  testingPlannedStart:        '2026-04-25',
  testingPlannedEnd:          '2026-05-01',
  testingOwnerUserId:         qa.userId,
  ethalonTestingPlannedStart: '2026-05-01',
  ethalonTestingPlannedEnd:   '2026-05-04',
  ethalonTestingOwnerUserId:  qa.userId,
  liveReleasePlannedStart:    '2026-05-05',
  liveReleasePlannedEnd:      '2026-05-05',
  liveReleaseOwnerUserId:     mg.userId,
  version: 0,
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
  csApprovingPlannedStart:    null,
  csApprovingPlannedEnd:      null,
  csApprovingOwnerUserId:     null,
  developmentPlannedStart:    null,
  developmentPlannedEnd:      null,
  developmentOwnerUserId:     null,
  testingPlannedStart:        null,
  testingPlannedEnd:          null,
  testingOwnerUserId:         null,
  ethalonTestingPlannedStart: null,
  ethalonTestingPlannedEnd:   null,
  ethalonTestingOwnerUserId:  null,
  liveReleasePlannedStart:    null,
  liveReleasePlannedEnd:      null,
  liveReleaseOwnerUserId:     null,
  version: 0,
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
  csApprovingPlannedStart:    '2026-03-01',
  csApprovingPlannedEnd:      '2026-03-05',
  csApprovingOwnerUserId:     mg.userId,
  developmentPlannedStart:    '2026-03-05',
  developmentPlannedEnd:      '2026-04-10',
  developmentOwnerUserId:     be.userId,
  testingPlannedStart:        null,
  testingPlannedEnd:          null,
  testingOwnerUserId:         null,
  ethalonTestingPlannedStart: null,
  ethalonTestingPlannedEnd:   null,
  ethalonTestingOwnerUserId:  null,
  liveReleasePlannedStart:    null,
  liveReleasePlannedEnd:      null,
  liveReleaseOwnerUserId:     null,
  version: 0,
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
  csApprovingPlannedStart:    '2026-04-02',
  csApprovingPlannedEnd:      '2026-04-04',
  csApprovingOwnerUserId:     mg.userId,
  developmentPlannedStart:    '2026-04-04',
  developmentPlannedEnd:      '2026-04-12',
  developmentOwnerUserId:     fe.userId,
  testingPlannedStart:        '2026-04-12',
  testingPlannedEnd:          '2026-04-15',
  testingOwnerUserId:         qa.userId,
  ethalonTestingPlannedStart: '2026-04-15',
  ethalonTestingPlannedEnd:   '2026-04-17',
  ethalonTestingOwnerUserId:  qa.userId,
  liveReleasePlannedStart:    '2026-04-18',
  liveReleasePlannedEnd:      '2026-04-18',
  liveReleaseOwnerUserId:     mg.userId,
  version: 0,
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
  feature: {
    ...MINI_TEAM_FEATURE,
    developmentOwnerUserId: 9999,
  },
  tasks: [],
  lead: be,
  miniTeam: [be, qa, mg],
};
