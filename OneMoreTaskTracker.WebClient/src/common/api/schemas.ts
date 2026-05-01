import { z } from 'zod';

export const userRoleSchema = z.enum(['Manager', 'FrontendDeveloper', 'BackendDeveloper', 'Qa']);

export const authResponseSchema = z.object({
  token: z.string().min(1),
  userId: z.number().int().positive(),
  email: z.string().email(),
  role: userRoleSchema,
});

export const taskStateSchema = z.enum([
  'NotStarted',
  'InDev',
  'MrToRelease',
  'InTest',
  'MrToMaster',
  'Completed',
]);

export const taskSchema = z.object({
  id: z.number().int().positive(),
  jiraId: z.string().min(1),
  state: taskStateSchema,
  userId: z.number().int().positive(),
});

export const taskListSchema = z.array(taskSchema);

export const projectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
});

export const mergeRequestSchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceBranch: z.string(),
  targetBranch: z.string(),
});

export const taskDetailSchema = z.object({
  jiraId: z.string().min(1),
  state: taskStateSchema,
  projects: z.array(projectSchema),
  mergeRequests: z.array(mergeRequestSchema),
});

export const moveTaskResultSchema = z.object({
  state: taskStateSchema,
  projects: z.array(projectSchema),
});

export const featureStateSchema = z.enum([
  'CsApproving',
  'Development',
  'Testing',
  'EthalonTesting',
  'LiveRelease',
]);

export const gateKindSchema = z.enum(['spec', 'cs', 'sr']);
export const gateStatusSchema = z.enum(['waiting', 'approved', 'rejected']);
export const trackSchema = z.enum(['backend', 'frontend']);
export const phaseKindSchema = z.enum([
  'development',
  'stand-testing',
  'ethalon-testing',
  'live-release',
]);
export const gateKeySchema = z.enum(['spec', 'backend.prep-gate', 'frontend.prep-gate']);

const isoDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable();

const isoDateTimeOrNull = z.string().min(1).nullable();

const miniTeamMemberSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email().nullable(),
  displayName: z.string().min(1),
  role: userRoleSchema,
});

export const featureGateSchema = z.object({
  id: z.number().int().nonnegative(),
  gateKey: gateKeySchema,
  kind: gateKindSchema,
  track: trackSchema.nullable().default(null),
  status: gateStatusSchema,
  approverUserId: z.number().int().nullable().default(null),
  approver: miniTeamMemberSchema.nullable().optional(),
  approvedAtUtc: isoDateTimeOrNull.default(null),
  requestedAtUtc: isoDateTimeOrNull.default(null),
  rejectionReason: z.string().max(500).nullable().default(null),
  version: z.number().int().nonnegative(),
});

export const featureSubStageSchema = z.object({
  id: z.number().int().nonnegative(),
  track: trackSchema,
  phase: phaseKindSchema,
  ordinal: z.number().int().nonnegative(),
  ownerUserId: z.number().int().nullable().default(null),
  owner: miniTeamMemberSchema.nullable().optional(),
  plannedStart: isoDateOrNull.default(null),
  plannedEnd: isoDateOrNull.default(null),
  version: z.number().int().nonnegative(),
});

export const featurePhaseTaxonomySchema = z.object({
  phase: phaseKindSchema,
  multiOwner: z.boolean(),
  cap: z.number().int().min(1),
  subStages: z.array(featureSubStageSchema),
});

export const featureTrackTaxonomySchema = z.object({
  track: trackSchema,
  phases: z.array(featurePhaseTaxonomySchema).length(4),
});

export const featureTaxonomySchema = z.object({
  gates: z.array(featureGateSchema).length(3),
  tracks: z.array(featureTrackTaxonomySchema).length(2),
});

export const featureSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z
    .string()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  state: featureStateSchema,
  plannedStart: isoDateOrNull,
  plannedEnd: isoDateOrNull,
  leadUserId: z.number().int().positive(),
  managerUserId: z.number().int().positive(),
  taskCount: z.number().int().nonnegative(),
  taskIds: z.array(z.number().int().positive()),
  taxonomy: featureTaxonomySchema,
  version: z.number().int().nonnegative().optional(),
});

export const patchFeatureRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  leadUserId: z.number().int().positive().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const patchFeatureGateRequestSchema = z.object({
  status: gateStatusSchema.optional(),
  rejectionReason: z.string().max(500).nullable().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const patchFeatureSubStageRequestSchema = z.object({
  ownerUserId: z.number().int().nullable().optional(),
  plannedStart: isoDateOrNull.optional(),
  plannedEnd: isoDateOrNull.optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const appendFeatureSubStageRequestSchema = z.object({
  ownerUserId: z.number().int().nullable().optional(),
  plannedStart: isoDateOrNull.optional(),
  plannedEnd: isoDateOrNull.optional(),
});

export const featureSummaryListSchema = z.array(featureSummarySchema);

const attachedTaskSchema = z.object({
  id: z.number().int().positive(),
  jiraId: z.string().min(1),
  state: taskStateSchema,
  userId: z.number().int().positive(),
});

export const featureDetailSchema = z.object({
  feature: featureSummarySchema,
  tasks: z.array(attachedTaskSchema),
  lead: miniTeamMemberSchema,
  miniTeam: z.array(miniTeamMemberSchema),
});

export const patchFeatureGateResponseSchema = z.object({
  featureId: z.number().int().positive(),
  featureVersion: z.number().int().nonnegative(),
  taxonomy: featureTaxonomySchema,
});

export const subStageMutationResponseSchema = z.object({
  featureId: z.number().int().positive(),
  featureVersion: z.number().int().nonnegative(),
  createdSubStageId: z.number().int().nullable().default(null),
  taxonomy: featureTaxonomySchema,
});
