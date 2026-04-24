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
  UpdateFeatureDescriptionPayload,
  UpdateFeatureTitlePayload,
  UpdateStageOwnerPayload,
  UpdateStagePlannedEndPayload,
  UpdateStagePlannedStartPayload,
} from '../types/feature';

function jsonHeaders(ifMatch?: number): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(),
  };
  if (typeof ifMatch === 'number') {
    headers['If-Match'] = String(ifMatch);
  }
  return headers;
}

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

/**
 * Inline-edit per-field PATCH callers (api-contract.md v1).
 *
 * Each call mirrors exactly one endpoint under `/api/plan/features/{id}/…`.
 * The response is always a refreshed `FeatureSummary` so the Gantt can
 * reconcile derived fields (plannedStart/plannedEnd/state) in one hop.
 *
 * The optional `ifMatchVersion` parameter is forwarded as an `If-Match`
 * header — required once the FE ships the concurrency UX (phase B of
 * feature-plan.md); tolerated as missing in iter 1 per the contract.
 */
export async function updateFeatureTitle(
  id: number,
  payload: UpdateFeatureTitlePayload,
  ifMatchVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}/title`, {
    method: 'PATCH',
    headers: jsonHeaders(ifMatchVersion),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function updateFeatureDescription(
  id: number,
  payload: UpdateFeatureDescriptionPayload,
  ifMatchVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}/description`, {
    method: 'PATCH',
    headers: jsonHeaders(ifMatchVersion),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function updateStageOwner(
  featureId: number,
  stage: FeatureState,
  payload: UpdateStageOwnerPayload,
  ifMatchStageVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/stages/${stage}/owner`,
    {
      method: 'PATCH',
      headers: jsonHeaders(ifMatchStageVersion),
      body: JSON.stringify(payload),
    },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function updateStagePlannedStart(
  featureId: number,
  stage: FeatureState,
  payload: UpdateStagePlannedStartPayload,
  ifMatchStageVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/stages/${stage}/planned-start`,
    {
      method: 'PATCH',
      headers: jsonHeaders(ifMatchStageVersion),
      body: JSON.stringify(payload),
    },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

export async function updateStagePlannedEnd(
  featureId: number,
  stage: FeatureState,
  payload: UpdateStagePlannedEndPayload,
  ifMatchStageVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/stages/${stage}/planned-end`,
    {
      method: 'PATCH',
      headers: jsonHeaders(ifMatchStageVersion),
      body: JSON.stringify(payload),
    },
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
  UpdateFeatureDescriptionPayload,
  UpdateFeatureTitlePayload,
  UpdateStageOwnerPayload,
  UpdateStagePlannedEndPayload,
  UpdateStagePlannedStartPayload,
} from '../types/feature';
