import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import { moveTaskResultSchema, taskDetailSchema, taskListSchema, taskSchema } from './schemas';
import type { CreateTaskPayload, MoveTaskResult, Task, TaskDetail } from '../types/task';

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<unknown>(response);
  return taskListSchema.parse(data);
}

export async function fetchTaskDetail(jiraId: string): Promise<TaskDetail> {
  const response = await fetch(`${API_BASE_URL}/api/tasks/${encodeURIComponent(jiraId)}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<unknown>(response);
  return taskDetailSchema.parse(data);
}

export async function moveTask(jiraId: string): Promise<MoveTaskResult> {
  const response = await fetch(
    `${API_BASE_URL}/api/tasks/${encodeURIComponent(jiraId)}/move`,
    {
      method: 'POST',
      headers: authHeaders(),
    },
  );
  const data = await handleResponse<unknown>(response);
  return moveTaskResultSchema.parse(data);
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return taskSchema.parse(data);
}
