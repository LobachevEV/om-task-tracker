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

export const featureTrackKindSchema = z.enum(['Frontend', 'Backend']);

export const featureTrackStageKeySchema = z.enum([
  'SrApproving',
  'CsApproving',
  'Development',
  'StandTesting',
  'EthalonTesting',
  'ReleaseToLive',
]);

export const featureTrackStageSchema = z.object({
  stageKey: featureTrackStageKeySchema,
  plannedStart: isoDateOrNull,
  plannedEnd: isoDateOrNull,
  stageOwnerUserId: z.number().int().positive().nullable(),
  stageVersion: z.number().int().nonnegative(),
  stageOwner: miniTeamMemberSchema.nullable().optional(),
});

export const featureTrackSchema = z.object({
  id: z.number().int().positive(),
  featureId: z.number().int().positive(),
  kind: featureTrackKindSchema,
  trackOwnerUserId: z.number().int().positive(),
  version: z.number().int().nonnegative(),
  stages: z.array(featureTrackStageSchema).max(5),
  trackOwner: miniTeamMemberSchema.nullable().optional(),
});

export const patchFeatureTrackRequestSchema = z.object({
  trackOwnerUserId: z.number().int().positive().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
});

export const patchFeatureTrackStageRequestSchema = z.object({
  stageOwnerUserId: z.number().int().positive().nullable().optional(),
  plannedStart: isoDateOrNull.optional(),
  plannedEnd: isoDateOrNull.optional(),
  expectedStageVersion: z.number().int().nonnegative().optional(),
});

const ownerUserIdOrNull = z.number().int().positive().nullable();

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
  csApprovingPlannedStart: isoDateOrNull,
  csApprovingPlannedEnd: isoDateOrNull,
  csApprovingOwnerUserId: ownerUserIdOrNull,
  developmentPlannedStart: isoDateOrNull,
  developmentPlannedEnd: isoDateOrNull,
  developmentOwnerUserId: ownerUserIdOrNull,
  testingPlannedStart: isoDateOrNull,
  testingPlannedEnd: isoDateOrNull,
  testingOwnerUserId: ownerUserIdOrNull,
  ethalonTestingPlannedStart: isoDateOrNull,
  ethalonTestingPlannedEnd: isoDateOrNull,
  ethalonTestingOwnerUserId: ownerUserIdOrNull,
  liveReleasePlannedStart: isoDateOrNull,
  liveReleasePlannedEnd: isoDateOrNull,
  liveReleaseOwnerUserId: ownerUserIdOrNull,
  version: z.number().int().nonnegative().optional(),
  tracks: z.array(featureTrackSchema).optional(),
});

export const patchFeatureRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(4000).nullable().optional(),
  leadUserId: z.number().int().positive().optional(),
  expectedVersion: z.number().int().nonnegative().optional(),
  csApprovingPlannedStart: isoDateOrNull.optional(),
  csApprovingPlannedEnd: isoDateOrNull.optional(),
  csApprovingOwnerUserId: ownerUserIdOrNull.optional(),
  developmentPlannedStart: isoDateOrNull.optional(),
  developmentPlannedEnd: isoDateOrNull.optional(),
  developmentOwnerUserId: ownerUserIdOrNull.optional(),
  testingPlannedStart: isoDateOrNull.optional(),
  testingPlannedEnd: isoDateOrNull.optional(),
  testingOwnerUserId: ownerUserIdOrNull.optional(),
  ethalonTestingPlannedStart: isoDateOrNull.optional(),
  ethalonTestingPlannedEnd: isoDateOrNull.optional(),
  ethalonTestingOwnerUserId: ownerUserIdOrNull.optional(),
  liveReleasePlannedStart: isoDateOrNull.optional(),
  liveReleasePlannedEnd: isoDateOrNull.optional(),
  liveReleaseOwnerUserId: ownerUserIdOrNull.optional(),
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
  tracks: z.array(featureTrackSchema).optional(),
});
