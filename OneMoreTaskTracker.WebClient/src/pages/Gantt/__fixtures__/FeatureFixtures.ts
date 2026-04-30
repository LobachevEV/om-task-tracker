import type {
  AttachedTask,
  FeatureDetail,
  FeatureGate,
  FeaturePhaseTaxonomy,
  FeatureSubStage,
  FeatureSummary,
  FeatureTaxonomy,
  FeatureTrackTaxonomy,
  GateKey,
  GateStatus,
  MiniTeamMember,
  PhaseKind,
  Track,
} from '../../../common/types/feature';
import {
  GATE_KEYS,
  MULTI_OWNER_PHASES,
  PHASE_KINDS,
  SUB_STAGE_HARD_CAP,
  TRACKS,
} from '../../../common/types/feature';

export const FIXTURE_TODAY = '2026-04-21';

const qa: MiniTeamMember = { userId: 10, email: 'qa@example.com', displayName: 'Qa Smith',  role: 'Qa' };
const fe: MiniTeamMember = { userId: 11, email: 'fe@example.com', displayName: 'Fe Wong',   role: 'FrontendDeveloper' };
const be: MiniTeamMember = { userId: 12, email: 'be@example.com', displayName: 'Be Ivanov', role: 'BackendDeveloper' };
const mg: MiniTeamMember = {  userId: 1, email: 'pm@example.com', displayName: 'Mel PM',    role: 'Manager' };

export const MINI_TEAM_MEMBERS = { qa, fe, be, mg } as const;

let nextSubStageId = 1000;

function nextId(): number {
  nextSubStageId += 1;
  return nextSubStageId;
}

function buildSubStage(input: Partial<FeatureSubStage> & {
  track: Track;
  phase: PhaseKind;
  ordinal: number;
}): FeatureSubStage {
  return {
    id: input.id ?? nextId(),
    track: input.track,
    phase: input.phase,
    ordinal: input.ordinal,
    ownerUserId: input.ownerUserId ?? null,
    owner: input.owner ?? null,
    plannedStart: input.plannedStart ?? null,
    plannedEnd: input.plannedEnd ?? null,
    version: input.version ?? 0,
  };
}

function phaseCap(phase: PhaseKind): number {
  return MULTI_OWNER_PHASES.has(phase) ? SUB_STAGE_HARD_CAP : 1;
}

function buildPhase(
  track: Track,
  phase: PhaseKind,
  subStages: ReadonlyArray<Partial<FeatureSubStage>>,
): FeaturePhaseTaxonomy {
  const multiOwner = MULTI_OWNER_PHASES.has(phase);
  return {
    phase,
    multiOwner,
    cap: phaseCap(phase),
    subStages: subStages.map((ss, idx) =>
      buildSubStage({ ...ss, track, phase, ordinal: idx }),
    ),
  };
}

function buildEmptyPhase(track: Track, phase: PhaseKind): FeaturePhaseTaxonomy {
  return buildPhase(track, phase, [{ ownerUserId: null }]);
}

function buildTrack(
  track: Track,
  phaseSubStages: Partial<Record<PhaseKind, ReadonlyArray<Partial<FeatureSubStage>>>>,
): FeatureTrackTaxonomy {
  return {
    track,
    phases: PHASE_KINDS.map((phase) =>
      buildPhase(track, phase, phaseSubStages[phase] ?? [{ ownerUserId: null }]),
    ),
  };
}

function buildGate(
  gateKey: GateKey,
  status: GateStatus,
  approverUserId: number,
  approver: MiniTeamMember | null = null,
  approvedAtUtc: string | null = null,
  rejectionReason: string | null = null,
): FeatureGate {
  return {
    id: nextId(),
    gateKey,
    kind: gateKey === 'spec' ? 'spec' : gateKey.startsWith('backend') ? 'cs' : 'sr',
    track: gateKey === 'spec' ? null : gateKey.startsWith('backend') ? 'backend' : 'frontend',
    status,
    approverUserId,
    approver,
    approvedAtUtc,
    requestedAtUtc: null,
    rejectionReason,
    version: 0,
  };
}

function buildTaxonomy(args: {
  gates: ReadonlyArray<FeatureGate>;
  backendPhases: Partial<Record<PhaseKind, ReadonlyArray<Partial<FeatureSubStage>>>>;
  frontendPhases: Partial<Record<PhaseKind, ReadonlyArray<Partial<FeatureSubStage>>>>;
}): FeatureTaxonomy {
  const gateByKey = new Map<GateKey, FeatureGate>(
    args.gates.map((g) => [g.gateKey, g] as const),
  );
  const orderedGates = GATE_KEYS.map((k) => gateByKey.get(k)).filter(
    (g): g is FeatureGate => g != null,
  );
  return {
    gates: orderedGates.length === GATE_KEYS.length
      ? orderedGates
      : GATE_KEYS.map(
          (k) =>
            gateByKey.get(k) ??
            buildGate(k, 'waiting', mg.userId),
        ),
    tracks: TRACKS.map((track) =>
      track === 'backend'
        ? buildTrack('backend', args.backendPhases)
        : buildTrack('frontend', args.frontendPhases),
    ),
  };
}

const SOLO_TAXONOMY: FeatureTaxonomy = buildTaxonomy({
  gates: [
    buildGate('spec', 'approved', mg.userId, mg, '2026-04-15T10:00:00Z'),
    buildGate('backend.prep-gate', 'approved', mg.userId, mg, '2026-04-15T11:00:00Z'),
    buildGate('frontend.prep-gate', 'approved', mg.userId, mg, '2026-04-15T11:00:00Z'),
  ],
  backendPhases: {
    development: [{ ownerUserId: be.userId, plannedStart: '2026-04-17', plannedEnd: '2026-04-22' }],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-22', plannedEnd: '2026-04-24' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-24', plannedEnd: '2026-04-26' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-04-28', plannedEnd: '2026-04-28' }],
  },
  frontendPhases: {
    development: [{ ownerUserId: fe.userId, plannedStart: '2026-04-17', plannedEnd: '2026-04-24' }],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-24', plannedEnd: '2026-04-26' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-26', plannedEnd: '2026-04-27' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-04-28', plannedEnd: '2026-04-28' }],
  },
});

const MINI_TEAM_TAXONOMY: FeatureTaxonomy = buildTaxonomy({
  gates: [
    buildGate('spec', 'approved', mg.userId, mg, '2026-04-09T10:00:00Z'),
    buildGate('backend.prep-gate', 'approved', mg.userId, mg, '2026-04-10T11:00:00Z'),
    buildGate('frontend.prep-gate', 'waiting', mg.userId),
  ],
  backendPhases: {
    development: [
      { ownerUserId: be.userId, plannedStart: '2026-04-12', plannedEnd: '2026-04-19' },
      { ownerUserId: fe.userId, plannedStart: '2026-04-19', plannedEnd: '2026-04-25' },
    ],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-25', plannedEnd: '2026-05-01' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-05-01', plannedEnd: '2026-05-04' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-05-05', plannedEnd: '2026-05-05' }],
  },
  frontendPhases: {
    development: [{ ownerUserId: fe.userId, plannedStart: '2026-04-12', plannedEnd: '2026-04-25' }],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-25', plannedEnd: '2026-05-01' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-05-01', plannedEnd: '2026-05-04' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-05-05', plannedEnd: '2026-05-05' }],
  },
});

const EMPTY_TAXONOMY: FeatureTaxonomy = {
  gates: GATE_KEYS.map((k) => buildGate(k, 'waiting', mg.userId)),
  tracks: TRACKS.map<FeatureTrackTaxonomy>((track) => ({
    track,
    phases: PHASE_KINDS.map((p) => buildEmptyPhase(track, p)),
  })),
};

const OVERDUE_TAXONOMY: FeatureTaxonomy = buildTaxonomy({
  gates: [
    buildGate('spec', 'approved', mg.userId, mg, '2026-02-28T10:00:00Z'),
    buildGate('backend.prep-gate', 'rejected', mg.userId, null, null, 'Scope unclear'),
    buildGate('frontend.prep-gate', 'rejected', mg.userId, null, null, 'Scope unclear'),
  ],
  backendPhases: {
    development: [{ ownerUserId: be.userId, plannedStart: '2026-03-05', plannedEnd: '2026-04-10' }],
  },
  frontendPhases: {
    development: [{ ownerUserId: fe.userId, plannedStart: '2026-03-05', plannedEnd: '2026-04-10' }],
  },
});

const SHIPPED_TAXONOMY: FeatureTaxonomy = buildTaxonomy({
  gates: [
    buildGate('spec', 'approved', mg.userId, mg, '2026-04-01T10:00:00Z'),
    buildGate('backend.prep-gate', 'approved', mg.userId, mg, '2026-04-02T11:00:00Z'),
    buildGate('frontend.prep-gate', 'approved', mg.userId, mg, '2026-04-02T11:00:00Z'),
  ],
  backendPhases: {
    development: [{ ownerUserId: be.userId, plannedStart: '2026-04-04', plannedEnd: '2026-04-12' }],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-12', plannedEnd: '2026-04-15' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-15', plannedEnd: '2026-04-17' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-04-18', plannedEnd: '2026-04-18' }],
  },
  frontendPhases: {
    development: [{ ownerUserId: fe.userId, plannedStart: '2026-04-04', plannedEnd: '2026-04-12' }],
    'stand-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-12', plannedEnd: '2026-04-15' }],
    'ethalon-testing': [{ ownerUserId: qa.userId, plannedStart: '2026-04-15', plannedEnd: '2026-04-17' }],
    'live-release': [{ ownerUserId: mg.userId, plannedStart: '2026-04-18', plannedEnd: '2026-04-18' }],
  },
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
  taxonomy: SOLO_TAXONOMY,
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
  taxonomy: MINI_TEAM_TAXONOMY,
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
  taxonomy: EMPTY_TAXONOMY,
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
  taxonomy: OVERDUE_TAXONOMY,
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
  taxonomy: SHIPPED_TAXONOMY,
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
  feature: MINI_TEAM_FEATURE,
  tasks: [],
  lead: be,
  miniTeam: [be, qa, mg],
};
