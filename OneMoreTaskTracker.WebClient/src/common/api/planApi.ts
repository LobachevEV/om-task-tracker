import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import {
  featureDetailSchema,
  featureSummaryListSchema,
  featureSummarySchema,
  patchFeatureGateResponseSchema,
  subStageMutationResponseSchema,
} from './schemas';
import type {
  AppendFeatureSubStagePayload,
  CreateFeaturePayload,
  FeatureDetail,
  FeatureScope,
  FeatureState,
  FeatureSummary,
  GateKey,
  PatchFeatureGatePayload,
  PatchFeatureGateResponse,
  PatchFeaturePayload,
  PatchFeatureSubStagePayload,
  PhaseKind,
  SubStageMutationResponse,
  Track,
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
  windowStart?: string;
  windowEnd?: string;
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

export async function patchFeatureGate(
  featureId: number,
  gateKey: GateKey,
  body: PatchFeatureGatePayload,
): Promise<PatchFeatureGateResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/gates/${gateKey}`,
    {
      method: 'PATCH',
      headers: jsonHeaders(body.expectedVersion),
      body: JSON.stringify(body),
    },
  );
  const data = await handleResponse<unknown>(response);
  return patchFeatureGateResponseSchema.parse(data);
}

export async function patchFeatureSubStage(
  featureId: number,
  subStageId: number,
  body: PatchFeatureSubStagePayload,
): Promise<SubStageMutationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/sub-stages/${subStageId}`,
    {
      method: 'PATCH',
      headers: jsonHeaders(body.expectedVersion),
      body: JSON.stringify(body),
    },
  );
  const data = await handleResponse<unknown>(response);
  return subStageMutationResponseSchema.parse(data);
}

export async function appendFeatureSubStage(
  featureId: number,
  track: Track,
  phase: PhaseKind,
  body: AppendFeatureSubStagePayload,
): Promise<SubStageMutationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/phases/${track}/${phase}/sub-stages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(body),
    },
  );
  const data = await handleResponse<unknown>(response);
  return subStageMutationResponseSchema.parse(data);
}

export async function deleteFeatureSubStage(
  featureId: number,
  subStageId: number,
  expectedVersion?: number,
): Promise<SubStageMutationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${featureId}/sub-stages/${subStageId}`,
    { method: 'DELETE', headers: jsonHeaders(expectedVersion) },
  );
  const data = await handleResponse<unknown>(response);
  return subStageMutationResponseSchema.parse(data);
}

export type {
  AppendFeatureSubStagePayload,
  CreateFeaturePayload,
  FeatureDetail,
  FeatureScope,
  FeatureState,
  FeatureSummary,
  GateKey,
  PatchFeatureGatePayload,
  PatchFeatureGateResponse,
  PatchFeaturePayload,
  PatchFeatureSubStagePayload,
  PhaseKind,
  SubStageMutationResponse,
  Track,
} from '../types/feature';
