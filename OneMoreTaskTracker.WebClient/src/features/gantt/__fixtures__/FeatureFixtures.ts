import type {
  AttachedTask,
  FeatureDetail,
  FeatureStagePlan,
  FeatureSummary,
  MiniTeamMember,
} from '../../../common/types/feature';
import { FEATURE_STATES } from '../../../common/types/feature';

export const FIXTURE_TODAY = '2026-04-21';

const qa: MiniTeamMember = { userId: 10, email: 'qa@example.com', displayName: 'Qa Smith',  role: 'Qa' };
const fe: MiniTeamMember = { userId: 11, email: 'fe@example.com', displayName: 'Fe Wong',   role: 'FrontendDeveloper' };
const be: MiniTeamMember = { userId: 12, email: 'be@example.com', displayName: 'Be Ivanov', role: 'BackendDeveloper' };
const mg: MiniTeamMember = { userId:  1, email: 'pm@example.com', displayName: 'Mel PM',    role: 'Manager' };

export const MINI_TEAM_MEMBERS = { qa, fe, be, mg } as const;

/** Produce a 5-row empty stage plan in canonical order. */
export function emptyStagePlans(): FeatureStagePlan[] {
  return FEATURE_STATES.map((stage) => ({
    stage,
    plannedStart: null,
    plannedEnd: null,
    performerUserId: null,
    stageVersion: 0,
  }));
}

/**
 * Produce a fully-planned 5-row stage plan with contiguous dates and the
 * given performers. Missing entries fall back to unassigned / null dates.
 */
export function buildStagePlans(
  entries: Partial<Record<string, Partial<FeatureStagePlan>>>,
): FeatureStagePlan[] {
  return FEATURE_STATES.map<FeatureStagePlan>((stage) => {
    const override = entries[stage] ?? {};
    return {
      stage,
      plannedStart: override.plannedStart ?? null,
      plannedEnd: override.plannedEnd ?? null,
      performerUserId: override.performerUserId ?? null,
      performer: override.performer ?? null,
      stageVersion: override.stageVersion ?? 0,
    };
  });
}

const soloStagePlans = buildStagePlans({
  CsApproving:    { plannedStart: '2026-04-15', plannedEnd: '2026-04-17', performerUserId: mg.userId },
  Development:    { plannedStart: '2026-04-17', plannedEnd: '2026-04-24', performerUserId: fe.userId },
  Testing:        { plannedStart: '2026-04-24', plannedEnd: '2026-04-26', performerUserId: qa.userId },
  EthalonTesting: { plannedStart: '2026-04-26', plannedEnd: '2026-04-27', performerUserId: qa.userId },
  LiveRelease:    { plannedStart: '2026-04-28', plannedEnd: '2026-04-28', performerUserId: mg.userId },
});

const miniTeamStagePlans = buildStagePlans({
  CsApproving:    { plannedStart: '2026-04-10', plannedEnd: '2026-04-12', performerUserId: mg.userId },
  Development:    { plannedStart: '2026-04-12', plannedEnd: '2026-04-25', performerUserId: be.userId },
  Testing:        { plannedStart: '2026-04-25', plannedEnd: '2026-05-01', performerUserId: qa.userId },
  EthalonTesting: { plannedStart: '2026-05-01', plannedEnd: '2026-05-04', performerUserId: qa.userId },
  LiveRelease:    { plannedStart: '2026-05-05', plannedEnd: '2026-05-05', performerUserId: mg.userId },
});

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
  stagePlans: soloStagePlans,
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
  stagePlans: miniTeamStagePlans,
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
  stagePlans: emptyStagePlans(),
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
  stagePlans: buildStagePlans({
    CsApproving: { plannedStart: '2026-03-01', plannedEnd: '2026-03-05', performerUserId: mg.userId },
    Development: { plannedStart: '2026-03-05', plannedEnd: '2026-04-10', performerUserId: be.userId },
  }),
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
  stagePlans: buildStagePlans({
    CsApproving:    { plannedStart: '2026-04-02', plannedEnd: '2026-04-04', performerUserId: mg.userId },
    Development:    { plannedStart: '2026-04-04', plannedEnd: '2026-04-12', performerUserId: fe.userId },
    Testing:        { plannedStart: '2026-04-12', plannedEnd: '2026-04-15', performerUserId: qa.userId },
    EthalonTesting: { plannedStart: '2026-04-15', plannedEnd: '2026-04-17', performerUserId: qa.userId },
    LiveRelease:    { plannedStart: '2026-04-18', plannedEnd: '2026-04-18', performerUserId: mg.userId },
  }),
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

// Resolved stage plans (with performer mini-members) for detail view.
const miniTeamDetailStagePlans: FeatureStagePlan[] = miniTeamStagePlans.map((plan) => ({
  ...plan,
  performer:
    plan.performerUserId === mg.userId ? mg :
    plan.performerUserId === be.userId ? be :
    plan.performerUserId === fe.userId ? fe :
    plan.performerUserId === qa.userId ? qa :
    null,
}));

export const MINI_TEAM_FEATURE_DETAIL: FeatureDetail = {
  feature: { ...MINI_TEAM_FEATURE, stagePlans: miniTeamDetailStagePlans },
  tasks: tasksForMiniTeam,
  lead: be,
  miniTeam: [be, fe, qa, mg],
  stagePlans: miniTeamDetailStagePlans,
};

export const EMPTY_FEATURE_DETAIL: FeatureDetail = {
  feature: UNSCHEDULED_FEATURE,
  tasks: [],
  lead: fe,
  miniTeam: [fe],
  stagePlans: UNSCHEDULED_FEATURE.stagePlans.map((p) => ({ ...p, performer: null })),
};

export const SHIPPED_FEATURE_DETAIL: FeatureDetail = {
  feature: SHIPPED_FEATURE,
  tasks: [],
  lead: fe,
  miniTeam: [fe, mg, qa],
  stagePlans: SHIPPED_FEATURE.stagePlans.map<FeatureStagePlan>((plan) => ({
    ...plan,
    performer:
      plan.performerUserId === mg.userId ? mg :
      plan.performerUserId === fe.userId ? fe :
      plan.performerUserId === qa.userId ? qa :
      null,
  })),
};

/** Stale performer: userId referenced by the plan is NOT on the mini-team. */
const stalePerformerPlans = buildStagePlans({
  CsApproving:    { plannedStart: '2026-04-10', plannedEnd: '2026-04-12', performerUserId: mg.userId },
  Development:    { plannedStart: '2026-04-12', plannedEnd: '2026-04-25', performerUserId: 9999 },
  Testing:        { plannedStart: '2026-04-25', plannedEnd: '2026-05-01', performerUserId: qa.userId },
  EthalonTesting: { plannedStart: '2026-05-01', plannedEnd: '2026-05-04', performerUserId: qa.userId },
  LiveRelease:    { plannedStart: '2026-05-05', plannedEnd: '2026-05-05', performerUserId: mg.userId },
});

export const STALE_PERFORMER_DETAIL: FeatureDetail = {
  feature: { ...MINI_TEAM_FEATURE, stagePlans: stalePerformerPlans },
  tasks: [],
  lead: be,
  miniTeam: [be, qa, mg],
  stagePlans: stalePerformerPlans.map<FeatureStagePlan>((plan) => ({
    ...plan,
    // Unknown ids come back with performer=null; the FE covers the "stale" copy.
    performer:
      plan.performerUserId === mg.userId ? mg :
      plan.performerUserId === qa.userId ? qa :
      plan.performerUserId === be.userId ? be :
      null,
  })),
};
