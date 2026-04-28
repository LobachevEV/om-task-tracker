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

const isoDateOrNull = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable();

const miniTeamMemberSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: userRoleSchema,
});

/**
 * `stageVersion` is optional on the wire; absent values are treated as 0
 * so older payloads that predate optimistic concurrency keep parsing.
 */
export const stagePlanSchema = z.object({
  stage: featureStateSchema,
  plannedStart: isoDateOrNull,
  plannedEnd: isoDateOrNull,
  performerUserId: z.number().int().positive().nullable(),
  stageVersion: z.number().int().nonnegative().optional(),
});

/**
 * Detail stage plan. Same as `stagePlanSchema` but carries a resolved
 * `performer` mini-member. The field is required on the wire but may be
 * null either because `performerUserId` is null OR because the referenced
 * user is no longer on the manager's roster ("stale performer").
 */
export const detailStagePlanSchema = stagePlanSchema.extend({
  performer: miniTeamMemberSchema.nullable(),
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
  /** Always length 5 — see api-contract.md. */
  stagePlans: z.array(stagePlanSchema).length(5),
  /**
   * Feature-level optimistic-concurrency token. Optional on the wire so
   * older payloads keep parsing; absent values are treated as 0.
   */
  version: z.number().int().nonnegative().optional(),
});

/**
 * Per-field inline-edit request-body schemas. These are not used for the
 * response (all five endpoints return a full `FeatureSummary`) — they exist
 * so the inline editors can validate their outgoing payload shape ahead of
 * the network call, mirroring the gateway's own validation.
 */
export const updateFeatureTitlePayloadSchema = z.object({
  title: z.string().min(1).max(200),
});

export const updateFeatureDescriptionPayloadSchema = z.object({
  description: z.string().max(4000).nullable(),
});

export const updateStageOwnerPayloadSchema = z.object({
  stageOwnerUserId: z.number().int().positive().nullable(),
});

export const updateStagePlannedStartPayloadSchema = z.object({
  plannedStart: isoDateOrNull,
});

export const updateStagePlannedEndPayloadSchema = z.object({
  plannedEnd: isoDateOrNull,
});

/**
 * Sparse PATCH request schemas for the consolidated endpoints. Every field is
 * optional; callers send only the fields the user actually changed plus the
 * version token. The gateway returns a refreshed `FeatureSummary` validated
 * via `featureSummarySchema`.
 */
export const patchFeatureRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  leadUserId: z.number().int().positive().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const patchFeatureStageRequestSchema = z.object({
  stageOwnerUserId: z.number().int().positive().nullable().optional(),
  plannedStart: isoDateOrNull.optional(),
  plannedEnd: isoDateOrNull.optional(),
  expectedStageVersion: z.number().int().nonnegative().optional(),
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
  /** Always length 5 — see api-contract.md. */
  stagePlans: z.array(detailStagePlanSchema).length(5),
});
