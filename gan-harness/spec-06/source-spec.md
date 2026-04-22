# Frontend feature types and Plan API client

Adds TypeScript types, Zod schemas, and the HTTP client (`planApi.ts`) for the Plan feature. This spec targets the REST contract that will be finalised in [`07-plan-gateway-rest.md`](07-plan-gateway-rest.md); writing the client against the agreed contract in parallel with the gateway is the explicit intent.

## Dependencies

- [`02-features-grpc-contract.md`](02-features-grpc-contract.md) — the wire DTOs the gateway forwards are derived from this proto; the REST surface in spec 07 is a 1:1 mapping plus cross-service composition.
- The frontend **does not** import anything from the generated proto. The REST contract below is the canonical surface for the web client.

## Current behavior

`OneMoreTaskTracker.WebClient/src/shared/api/` contains `httpClient.ts` (base URL + auth headers + `handleResponse`), `schemas.ts` (Zod schemas), `tasksApi.ts`, `teamApi.ts`, `authApi.ts`. There is no `planApi.ts` and no feature types.

## Target behavior

A new `planApi.ts` exposes six functions mirroring the REST surface agreed in spec 07. Every response is parsed through Zod. Types live in `src/shared/types/feature.ts` and are re-exported from `planApi.ts` where convenient for call sites.

## REST contract (authoritative for this client)

All routes are hosted by the gateway at `API_BASE_URL`. All require `Authorization: Bearer <jwt>`. The handler spec 07 owns server-side shapes; the shapes below are this client's **binding target**.

| Verb   | Path                                       | Body                            | Response                   | AuthZ          |
| ------ | ------------------------------------------ | ------------------------------- | -------------------------- | -------------- |
| `GET`  | `/api/plan/features`                       | query: `scope`, `state`         | `FeatureSummary[]`         | any logged-in  |
| `GET`  | `/api/plan/features/{id}`                  | —                               | `FeatureDetail`            | any logged-in  |
| `POST` | `/api/plan/features`                       | `CreateFeaturePayload`          | `FeatureSummary`           | Manager        |
| `PATCH`| `/api/plan/features/{id}`                  | `UpdateFeaturePayload` (sparse) | `FeatureSummary`           | Manager        |
| `POST` | `/api/plan/features/{id}/tasks/{jiraId}`   | —                               | `FeatureSummary`           | Manager        |
| `DELETE`| `/api/plan/features/{id}/tasks/{jiraId}`  | —                               | `FeatureSummary`           | Manager        |

Query parameters on `GET /api/plan/features`:

- `scope`: `all` | `mine` (default `all`). `mine` filters to features where the current user is the lead.
- `state`: one of the five `FeatureState` identifiers; omitted = all states.

## Types — `src/shared/types/feature.ts`

```ts
export type FeatureState =
  | 'CsApproving'
  | 'Development'
  | 'Testing'
  | 'EthalonTesting'
  | 'LiveRelease';

export const FEATURE_STATES: readonly FeatureState[] = [
  'CsApproving',
  'Development',
  'Testing',
  'EthalonTesting',
  'LiveRelease',
] as const;

export interface MiniTeamMember {
  userId: number;
  email: string;
  displayName: string;
  role: 'Manager' | 'FrontendDeveloper' | 'BackendDeveloper' | 'Qa';
}

export interface AttachedTask {
  id: number;
  jiraId: string;
  state:
    | 'NotStarted'
    | 'InDev'
    | 'MrToRelease'
    | 'InTest'
    | 'MrToMaster'
    | 'Completed';
  userId: number;
}

export interface FeatureSummary {
  id: number;
  title: string;
  description: string | null;
  state: FeatureState;
  plannedStart: string | null; // ISO-8601 date "YYYY-MM-DD"
  plannedEnd:   string | null;
  leadUserId: number;
  managerUserId: number;
  taskCount: number;
  taskIds: number[];
}

export interface FeatureDetail {
  feature: FeatureSummary;
  tasks: AttachedTask[];
  lead: MiniTeamMember;
  miniTeam: MiniTeamMember[];
}

export interface CreateFeaturePayload {
  title: string;
  description?: string;
  leadUserId?: number;          // omit / 0 → defaults to the current user
  plannedStart?: string | null; // "YYYY-MM-DD" or null
  plannedEnd?: string | null;
  // Note: `initialState` intentionally omitted. All new features start
  // in `CsApproving` — owned by the gateway in spec 07. If product ever
  // asks for "import a feature already in Development", add the field then.
}

export interface UpdateFeaturePayload {
  title?: string;
  description?: string | null;  // null = clear
  leadUserId?: number;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  state?: FeatureState;
}

export type FeatureScope = 'all' | 'mine';
```

### Rules

- `description: string | null` — the backend returns `null`, not empty string. The Zod schema normalizes the empty-string wire form to `null` so the rest of the client sees the same shape (see schemas below).
- Dates are **strings** (`"YYYY-MM-DD"`). No `Date` objects flow through the API boundary; conversions happen at the rendering layer ([`09-gantt-primitives-layout-and-timeline.md`](09-gantt-primitives-layout-and-timeline.md) § "Date math").
- `AttachedTask.state` reuses the existing task-state vocabulary from `src/shared/types/task.ts`. The new types file re-imports that type union rather than duplicating it:

  ```ts
  import type { TaskState } from './task';
  export interface AttachedTask {
    id: number;
    jiraId: string;
    state: TaskState;
    userId: number;
  }
  ```

  (The union above in the spec is expanded only for clarity — the code uses the import.)

## Zod schemas — additions to `src/shared/api/schemas.ts`

Append to the existing file:

```ts
import { z } from 'zod';
import { taskStateSchema } from './schemas'; // or existing local export

export const featureStateSchema = z.enum([
  'CsApproving',
  'Development',
  'Testing',
  'EthalonTesting',
  'LiveRelease',
]);

const isoDateOrNull = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
  .nullable();

const emptyToNull = z.string().transform((v) => (v === '' ? null : v));

export const featureSummarySchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().nullable().transform((v) => (v === '' ? null : v)),
  state: featureStateSchema,
  plannedStart: isoDateOrNull,
  plannedEnd:   isoDateOrNull,
  leadUserId: z.number().int().positive(),
  managerUserId: z.number().int().positive(),
  taskCount: z.number().int().nonnegative(),
  taskIds: z.array(z.number().int().positive()),
});

export const featureSummaryListSchema = z.array(featureSummarySchema);

const roleSchema = z.enum(['Manager', 'FrontendDeveloper', 'BackendDeveloper', 'Qa']);

const miniTeamMemberSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: roleSchema,
});

const attachedTaskSchema = z.object({
  id: z.number().int().positive(),
  jiraId: z.string().min(1),
  state: taskStateSchema, // reuse existing
  userId: z.number().int().positive(),
});

export const featureDetailSchema = z.object({
  feature: featureSummarySchema,
  tasks: z.array(attachedTaskSchema),
  lead: miniTeamMemberSchema,
  miniTeam: z.array(miniTeamMemberSchema),
});
```

If the existing file has no `taskStateSchema` export, add one in the same commit from the canonical list in `src/shared/types/task.ts`.

## Client — `src/shared/api/planApi.ts`

```ts
import { API_BASE_URL, authHeaders, handleResponse } from './httpClient';
import {
  featureDetailSchema,
  featureSummarySchema,
  featureSummaryListSchema,
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
  const response = await fetch(
    `${API_BASE_URL}/api/plan/features/${id}`,
    { headers: authHeaders() },
  );
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
```

## Knock-on change: `tasksApi.createTask` gains `featureId`

Spec [`01b`](01b-task-featureid-column.md) makes `featureId` required on `POST /api/tasks`. This spec must also update the TS payload so call sites fail to typecheck until they pass one:

- In `src/shared/api/tasksApi.ts`, extend the existing `createTask` payload type with:

  ```ts
  export interface CreateTaskPayload {
    jiraTaskId: string;
    startDate: string;   // ISO-8601 date
    featureId: number;   // NEW, required
  }
  ```

- Every existing call site (notably `TaskPage`'s "Add task" flow) must pass a `featureId`. Until the UI for choosing a feature ships in [`11-feature-drawer.md`](11-feature-drawer.md) and [`12-gantt-page-assembly.md`](12-gantt-page-assembly.md), the simplest temporary wiring is:
  1. If the current user has at least one feature where they are the lead (via `listFeatures({ scope: 'mine' })`), pick the most recently created one.
  2. Otherwise, the "Add task" button is disabled with a tooltip: `"Create a feature first"` (i18n key `tasks:addTask.disabledNoFeature`; the en/ru strings live in [`14-i18n-gantt-and-header-namespaces.md`](14-i18n-gantt-and-header-namespaces.md)).

- `tasksApi.test.ts` gains two assertions:
  - `createTask({ jiraTaskId: 'X', startDate: '2026-04-21', featureId: 7 })` sends `featureId` in the JSON body.
  - The old call shape (no `featureId`) fails to typecheck (enforced by TS, no runtime test needed — a `@ts-expect-error` smoke line is acceptable).

## Tests — `src/shared/api/__tests__/planApi.test.ts`

Mirrors the style of `tasksApi.test.ts`:

- `listFeatures({})` calls `GET /api/plan/features` with no query string.
- `listFeatures({ scope: 'mine' })` calls `GET /api/plan/features?scope=mine`.
- `listFeatures({ scope: 'mine', state: 'Development' })` calls `GET /api/plan/features?scope=mine&state=Development`.
- `getFeature(42)` calls `GET /api/plan/features/42`.
- `createFeature({ title: 'X' })` calls `POST /api/plan/features` with JSON body `{"title":"X"}` and `Content-Type: application/json`.
- `updateFeature(42, { state: 'Development' })` sends `PATCH /api/plan/features/42`.
- `attachTask(42, 'PROJ-1')` calls `POST /api/plan/features/42/tasks/PROJ-1`.
- `attachTask(42, 'PROJ/1 2')` URL-encodes the `jiraId` segment.
- `detachTask(42, 'PROJ-1')` calls `DELETE /api/plan/features/42/tasks/PROJ-1`.
- Zod rejection case: given a response missing `taskIds`, the schema throws and the function rejects. The exact error message is not asserted (brittle); only the rejection is.

Also cover the schema-level normalization:

- `featureSummarySchema.parse({ ..., description: '' })` returns `{ description: null, ... }`.
- `featureSummarySchema.parse({ ..., plannedStart: '2026-04-30' })` passes.
- `featureSummarySchema.parse({ ..., plannedStart: '2026/04/30' })` throws.

## Acceptance criteria

- `src/shared/types/feature.ts` exists with the `FeatureState`, `FeatureSummary`, `FeatureDetail`, `MiniTeamMember`, `AttachedTask`, `CreateFeaturePayload`, `UpdateFeaturePayload`, and `FeatureScope` exports listed above.
- `src/shared/api/schemas.ts` exports `featureStateSchema`, `featureSummarySchema`, `featureSummaryListSchema`, and `featureDetailSchema`. Each performs the normalizations described (empty string → `null` on `description`, ISO date regex on date fields).
- `src/shared/api/planApi.ts` exports `listFeatures`, `getFeature`, `createFeature`, `updateFeature`, `attachTask`, `detachTask`, each parsed through Zod, each using `authHeaders()` and `handleResponse`.
- `src/shared/api/__tests__/planApi.test.ts` passes with the URL-assembly, body, and schema-rejection cases above.
- No hard dependency on `fetch` mocking beyond what `tasksApi.test.ts` already uses (keep the test harness consistent).
- `npm run build` succeeds with these additions — no unused exports (the consumers live in specs 11 / 12 and will import these symbols in subsequent PRs).
