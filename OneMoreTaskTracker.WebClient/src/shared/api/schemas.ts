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
});

export const featureSummaryListSchema = z.array(featureSummarySchema);

const miniTeamMemberSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: userRoleSchema,
});

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
