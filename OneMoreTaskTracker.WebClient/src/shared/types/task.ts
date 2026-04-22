export type TaskState =
  | 'NotStarted'
  | 'InDev'
  | 'MrToRelease'
  | 'InTest'
  | 'MrToMaster'
  | 'Completed';

export interface Task {
  id: number;
  jiraId: string;
  state: TaskState;
  userId: number;
}

export interface Project {
  id: number;
  name: string;
}

export interface MergeRequest {
  id: string;
  title: string;
  sourceBranch: string;
  targetBranch: string;
}

export interface TaskDetail {
  jiraId: string;
  state: TaskState;
  projects: Project[];
  mergeRequests: MergeRequest[];
}

export interface MoveTaskResult {
  state: TaskState;
  projects: Project[];
}

export interface CreateTaskPayload {
  jiraId: string;
  featureId: number;
}
