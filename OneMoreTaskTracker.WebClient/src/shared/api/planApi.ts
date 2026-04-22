import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import {
  featureDetailSchema,
  featureSummaryListSchema,
  featureSummarySchema,
} from './schemas';
import type {
  CreateFeaturePayload,
  FeatureDetail,
  FeatureScope,
  FeatureState,
  FeatureSummary,
  UpdateFeaturePayload,
} from '../types/feature';

export async function listFeatures(
  params: { scope?: FeatureScope; state?: FeatureState } = {},
): Promise<FeatureSummary[]> {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.state) query.set('state', params.state);
  const qs = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features${qs ? `?${qs}` : ''}`,
    { headers: authHeaders() },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummaryListSchema.parse(data);
}

export async function getFeature(id: number): Promise<FeatureDetail> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}`, {
    headers: authHeaders(),
  });
  const data = await handleResponse<unknown>(response);
  return featureDetailSchema.parse(data);
}

export async function createFeature(
  payload: CreateFeaturePayload,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function updateFeature(
  id: number,
  payload: UpdateFeaturePayload,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function attachTask(
  featureId: number,
  jiraId: string,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/tasks/${encodeURIComponent(jiraId)}`,
    { method: 'POST', headers: authHeaders() },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function detachTask(
  featureId: number,
  jiraId: string,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/tasks/${encodeURIComponent(jiraId)}`,
    { method: 'DELETE', headers: authHeaders() },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export type {
  CreateFeaturePayload,
  FeatureDetail,
  FeatureScope,
  FeatureState,
  FeatureSummary,
  UpdateFeaturePayload,
} from '../types/feature';
