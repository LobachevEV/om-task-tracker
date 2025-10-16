import type { TaskState } from '../types/task';

export const STATE_STEPS: TaskState[] = [
  'NotStarted',
  'InDev',
  'MrToRelease',
  'InTest',
  'MrToMaster',
  'Completed',
];

export const STATE_LABEL: Record<TaskState, string> = {
  NotStarted: 'Not Started',
  InDev: 'In Dev',
  MrToRelease: 'MR to Release',
  InTest: 'In Test',
  MrToMaster: 'MR to Master',
  Completed: 'Completed',
};

export const STATE_CLASS: Record<TaskState, string> = {
  NotStarted: 'not-started',
  InDev: 'in-dev',
  MrToRelease: 'mr-to-release',
  InTest: 'in-test',
  MrToMaster: 'mr-to-master',
  Completed: 'completed',
};
