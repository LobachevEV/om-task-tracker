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
  PatchFeaturePayload,
  PatchFeatureStagePayload,
  UpdateFeaturePayload,
  UpdateFeatureDescriptionPayload,
  UpdateFeatureLeadPayload,
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

export interface ListFeaturesParams {
  scope?: FeatureScope;
  state?: FeatureState;
  /** Inclusive ISO yyyy-MM-dd; pairs with `windowEnd`. */
  windowStart?: string;
  /** Inclusive ISO yyyy-MM-dd; pairs with `windowStart`. */
  windowEnd?: string;
  /** Optional AbortSignal — caller cancels stale chunk fetches on fast pan. */
  signal?: AbortSignal;
}

export async function listFeatures(
  params: ListFeaturesParams = {},
): Promise<FeatureSummary[]> {
  const query = new URLSearchParams();
  if (params.scope) query.set('scope', params.scope);
  if (params.state) query.set('state', params.state);
  if (params.windowStart) query.set('windowStart', params.windowStart);
  if (params.windowEnd) query.set('windowEnd', params.windowEnd);
  const qs = query.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features${qs ? `?${qs}` : ''}`,
    { headers: authHeaders(), signal: params.signal },
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
 * Sparse PATCH for `/api/plan/features/{id}`. Pass only the fields the user
 * actually changed; the version token is forwarded as `If-Match` (and also
 * as `expectedVersion` in the body for client-explicit concurrency).
 */
export async function patchFeature(
  id: number,
  body: PatchFeaturePayload,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}`, {
    method: 'PATCH',
    headers: jsonHeaders(body.expectedVersion),
    body: JSON.stringify(body),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

/**
 * Sparse PATCH for `/api/plan/features/{id}/stages/{stage}`. Pass only the
 * fields the user actually changed; the stage-version token is forwarded as
 * `If-Match` and as `expectedStageVersion` in the body.
 */
export async function patchFeatureStage(
  featureId: number,
  stage: FeatureState,
  body: PatchFeatureStagePayload,
): Promise<FeatureSummary> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/stages/${stage}`,
    {
      method: 'PATCH',
      headers: jsonHeaders(body.expectedStageVersion),
      body: JSON.stringify(body),
    },
  );
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

/**
 * @deprecated Use {@link patchFeature} with `{ title, expectedVersion }`. The
 * per-field PATCH endpoints are scheduled for deletion in slice (f).
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

/**
 * @deprecated Use {@link patchFeature} with `{ description, expectedVersion }`.
 */
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

/**
 * @deprecated Use {@link patchFeature} with `{ leadUserId, expectedVersion }`.
 */
export async function updateFeatureLead(
  id: number,
  payload: UpdateFeatureLeadPayload,
  ifMatchVersion?: number,
): Promise<FeatureSummary> {
  const response = await fetch(`${API_BASE_URL}/api/plan/features/${id}/lead`, {
    method: 'PATCH',
    headers: jsonHeaders(ifMatchVersion),
    body: JSON.stringify(payload),
  });
  const data = await handleResponse<unknown>(response);
  return featureSummarySchema.parse(data);
}

/**
 * @deprecated Use {@link patchFeatureStage} with
 * `{ stageOwnerUserId, expectedStageVersion }`.
 */
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

/**
 * @deprecated Use {@link patchFeatureStage} with
 * `{ plannedStart, expectedStageVersion }`.
 */
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

/**
 * @deprecated Use {@link patchFeatureStage} with
 * `{ plannedEnd, expectedStageVersion }`.
 */
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
  PatchFeaturePayload,
  PatchFeatureStagePayload,
  UpdateFeaturePayload,
  UpdateFeatureDescriptionPayload,
  UpdateFeatureLeadPayload,
  UpdateFeatureTitlePayload,
  UpdateStageOwnerPayload,
  UpdateStagePlannedEndPayload,
  UpdateStagePlannedStartPayload,
} from '../types/feature';
