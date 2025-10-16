import { z } from 'zod';

export const userRoleSchema = z.enum(['Developer', 'Manager']);

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
