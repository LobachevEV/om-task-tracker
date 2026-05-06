# API Contract — feature-tracks-gantt

Protocol: REST (gateway, JSON) + gRPC (`OneMoreTaskTracker.Api` → `OneMoreTaskTracker.Features`)
Frozen: true
Version: v1

## Authentication
- All endpoints sit behind the existing JWT bearer scheme (`Authorization: Bearer <token>`).
- Reads (`GET`) require `[Authorize]` only — any authenticated user.
- Writes (`POST`, `PATCH`, `DELETE`) require `[Authorize(Roles = Roles.Manager)]` — same gate as the existing feature/stage PATCH endpoints.
- Caller user-id is extracted server-side via `User.GetUserId()`; clients never put a user id in the body.

## Vocabulary (microservices-contracts.md)

The Features service owns this surface. Names are in its domain vocabulary; cross-service identities are role-prefixed:

- `FeatureTrack` (aggregate) — owned by Features service.
- `FeatureTrackStage` (aggregate part) — track-scoped row, one per `(track_id, stage_key)` tuple.
- `track_kind` — closed enum `{Frontend, Backend}` (the brief leaves QA as a future column-only slot per §10 default; not emitted in v1).
- `stage_key` — closed string enum, track-scoped:
  - Frontend: `SrApproving`, `Development`, `StandTesting`, `EthalonTesting`, `ReleaseToLive`
  - Backend:  `CsApproving`, `Development`, `StandTesting`, `EthalonTesting`, `ReleaseToLive`
- `track_owner_user_id` — soft FK into Users service; same shape as `lead_user_id`. The existing `Feature.lead_user_id` stays as the **feature-level** owner; the per-track owner is **separate** (decision §10.2 default: new field on the track aggregate).
- `stage_owner_user_id` — per-stage soft FK; `null` ⇒ inherit from `track_owner_user_id` (decision §10.5: clearing the explicit value reverts to inheritance).

## Endpoints / Operations

### `GET /api/plan/features`
**Unchanged shape — additive only.** The existing endpoint continues to return `FeatureSummary[]`. Each summary now carries an additional optional field `tracks: FeatureTrackSummary[]`. Clients that ignore `tracks` keep working — falls back to `stagePlans[]` rendering (existing behavior; brief §5.5 "Empty / sparse-feature handling").

```jsonc
// FeatureSummary (additive fields shown; existing fields unchanged)
{
  "id": 14,
  "title": "Checkout redesign",
  // ... all existing fields ...
  "stagePlans": [ /* existing 5-row array, kept for legacy fallback */ ],
  "version": 7,

  // NEW (optional on the wire; absent = legacy feature with no tracks configured)
  "tracks": [
    {
      "id": 42,                       // FeatureTrack id (server-assigned)
      "featureId": 14,
      "kind": "Frontend",            // "Frontend" | "Backend"
      "trackOwnerUserId": 2,         // soft FK → Users
      "version": 3,                   // optimistic concurrency on the track row
      "stages": [
        {
          "stageKey": "SrApproving",
          "plannedStart": "2026-04-01",   // ISO yyyy-MM-dd | null
          "plannedEnd":   "2026-04-07",
          "stageOwnerUserId": null,        // null = inherit from trackOwnerUserId
          "stageVersion": 0
        },
        // exactly 5 entries, canonical track-scoped order
      ]
    }
  ]
}
```

Responses:
- `200 OK` → `FeatureSummary[]`
- `400 Bad Request` (windowStart/windowEnd parse failure) — existing behavior
- `401 Unauthorized`

### `GET /api/plan/features/{id}`
**Unchanged shape — additive only.** `FeatureDetail` adds `tracks: FeatureTrackDetail[]` alongside the existing `stagePlans`. `FeatureTrackDetail` extends `FeatureTrackSummary` with a resolved `trackOwner: MiniTeamMember | null` and `stages[].stageOwner: MiniTeamMember | null` (id-resolution happens at the gateway, mirrors the existing `stagePlans[].performer` pattern).

Responses:
- `200 OK` → `FeatureDetail`
- `404 Not Found`

### `PATCH /api/plan/features/{featureId}/tracks/{kind}`
Sparse PATCH for the track aggregate. `{kind}` is one of `frontend` | `backend` (case-insensitive on the path; canonical on the wire is `Frontend` / `Backend`).

Auth: `[Authorize(Roles = Roles.Manager)]`.
Idempotency: PATCH is idempotent by design; resending the same body on the same `expectedVersion` returns the same row. No idempotency key.
Rate limit: inherits the gateway's existing default (none today; keep consistent).

Request body (JSON, all fields optional — sparse):
```json
{
  "trackOwnerUserId": 2,
  "expectedVersion": 3
}
```

Behavior:
- If the track row does not yet exist for the given `(featureId, kind)`, this endpoint **creates it** (upsert semantics — matches the brief §1 reality where tracks are added incrementally to features).
- `trackOwnerUserId` MUST be a positive integer on the manager's roster; absent ⇒ unchanged (or seeded to `feature.leadUserId` on first create).
- `expectedVersion` is the optimistic-concurrency token. When supplied via `If-Match` header (preferred) AND in the body, body wins (mirrors existing PATCH conventions in `PlanRequestHelpers`).

Responses:
- `200 OK` → refreshed `FeatureSummary` (with `tracks` populated; matches existing single-row-refresh pattern from `PatchFeatureStageController`)
- `400 Bad Request` → `{ "error": "InvalidRequest" }` or `{ "error": "Pick a teammate from the list" }`
- `401`, `403`, `404` (feature missing), `409 Conflict` (stale `expectedVersion`), `502` (upstream gRPC unavailable)

### `PATCH /api/plan/features/{featureId}/tracks/{kind}/stages/{stageKey}`
Sparse PATCH for a track-scoped stage row. `{stageKey}` is the canonical string enum value (case-insensitive on the path).

Auth: `[Authorize(Roles = Roles.Manager)]`.

Request body (JSON, all fields optional):
```json
{
  "stageOwnerUserId": 5,           // positive int = explicit owner; null = clear (revert to inheritance)
  "plannedStart": "2026-04-08",
  "plannedEnd":   "2026-05-15",
  "expectedStageVersion": 0
}
```

Behavior:
- If the stage row does not yet exist (track was just created and stages have not been touched), the endpoint **creates the row** as part of the upsert (mirrors the existing `PatchFeatureStageHandler` upsert semantics).
- Cross-stage chronological order within the same track is enforced (mirrors existing `EnsureStageOrder`); violation returns `422` with `{ "conflict": { "kind": "overlap", "neighbour": "<stageKey>" } }`.
- Cross-track ordering is **NOT** enforced — FE and BE tracks run on independent timelines per the brief §1.
- `stageOwnerUserId === null` clears the explicit owner; `stageOwnerUserId` omitted leaves it unchanged. This is the §10.5 inheritance gesture.
- `stageOwnerUserId` (when not null) MUST be a positive integer on the manager's roster.

Responses:
- `200 OK` → refreshed `FeatureSummary`
- `400 Bad Request`, `401`, `403`, `404`, `409 Conflict`, `422 Unprocessable Entity` (stage-order overlap), `502`

### `DELETE /api/plan/features/{featureId}/tracks/{kind}` (deferred)
Out of scope for v1. The brief §1 explicitly says "tracks may be one or two"; removing a track is not a documented gesture. If needed later, gated by RFC bump.

## gRPC operations (Features service)

The Features service grows three new RPCs in a new namespace `OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand` (and a sibling for the stage). Existing protos (`PatchFeatureCommand`, `PatchFeatureStageCommand`) are NOT modified.

```proto
// Protos/feature_track_kind.proto (NEW, shared)
syntax = "proto3";
option csharp_namespace = "OneMoreTaskTracker.Proto.Features";
package mr_helper.features;

enum FeatureTrackKind {
  FRONTEND = 0;
  BACKEND  = 1;
}
```

```proto
// Protos/feature_track_stage_key.proto (NEW, shared)
syntax = "proto3";
option csharp_namespace = "OneMoreTaskTracker.Proto.Features";
package mr_helper.features;

// String enum — wire form is the literal stage_key string. Per-track-kind
// validation happens in the C# handler; proto3 cannot model track-scoped
// enums without union types.
//
// Frontend kind admits: SR_APPROVING, DEVELOPMENT, STAND_TESTING,
//                       ETHALON_TESTING, RELEASE_TO_LIVE
// Backend kind admits:  CS_APPROVING, DEVELOPMENT, STAND_TESTING,
//                       ETHALON_TESTING, RELEASE_TO_LIVE
enum FeatureTrackStageKey {
  TRACK_STAGE_KEY_UNSPECIFIED = 0;
  SR_APPROVING        = 1;
  CS_APPROVING        = 2;
  DEVELOPMENT         = 3;
  STAND_TESTING       = 4;
  ETHALON_TESTING     = 5;
  RELEASE_TO_LIVE     = 6;
}
```

```proto
// Protos/feature_track.proto (NEW, shared message carrier)
syntax = "proto3";
import "feature_track_kind.proto";
import "feature_track_stage_key.proto";
option csharp_namespace = "OneMoreTaskTracker.Proto.Features";
package mr_helper.features;

message FeatureTrackStage {
  FeatureTrackStageKey stage_key            = 1;
  string               planned_start        = 2;   // "" = null
  string               planned_end          = 3;   // "" = null
  int32                stage_owner_user_id  = 4;   // 0 = inherit
  int32                stage_version        = 5;
}

message FeatureTrack {
  int32                       id                    = 1;
  int32                       feature_id            = 2;
  FeatureTrackKind            kind                  = 3;
  int32                       track_owner_user_id   = 4;
  int32                       version               = 5;
  repeated FeatureTrackStage  stages                = 6;
}
```

```proto
// Protos/PatchFeatureTrackCommand/patch_feature_track_command_handler.proto (NEW)
syntax = "proto3";
import "feature_track_kind.proto";
import "feature_track.proto";
option csharp_namespace = "OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand";
package mr_helper.features;

service FeatureTrackPatcher {
  rpc Patch (PatchFeatureTrackRequest) returns (FeatureTrack);
}

message PatchFeatureTrackRequest {
  int32             feature_id              = 1;
  FeatureTrackKind  kind                    = 2;
  int32             caller_user_id          = 3;
  optional int32    expected_version        = 4;
  optional int32    track_owner_user_id     = 5;
}
```

```proto
// Protos/PatchFeatureTrackStageCommand/patch_feature_track_stage_command_handler.proto (NEW)
syntax = "proto3";
import "feature_track_kind.proto";
import "feature_track_stage_key.proto";
import "feature_track.proto";
option csharp_namespace = "OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand";
package mr_helper.features;

service FeatureTrackStagePatcher {
  rpc Patch (PatchFeatureTrackStageRequest) returns (FeatureTrack);
}

message PatchFeatureTrackStageRequest {
  int32                  feature_id              = 1;
  FeatureTrackKind       kind                    = 2;
  FeatureTrackStageKey   stage_key               = 3;
  int32                  caller_user_id          = 4;
  optional int32         expected_stage_version  = 5;
  // sentinel: -1 = clear (revert to inheritance), 0 = unchanged, >0 = explicit user id
  optional int32         stage_owner_user_id     = 6;
  optional string        planned_start           = 7;
  optional string        planned_end             = 8;
}
```

The existing `ListFeaturesQuery` and `GetFeatureQuery` protos are extended **additively** — `FeatureDto` gets a `repeated FeatureTrack tracks = 13;`. Empty when the feature has no tracks (legacy features).

## Shared Types (Frontend mirror)

```typescript
// OneMoreTaskTracker.WebClient/src/common/types/featureTrack.ts (NEW)
export type FeatureTrackKind = 'Frontend' | 'Backend';

export type FrontendStageKey =
  | 'SrApproving'
  | 'Development'
  | 'StandTesting'
  | 'EthalonTesting'
  | 'ReleaseToLive';

export type BackendStageKey =
  | 'CsApproving'
  | 'Development'
  | 'StandTesting'
  | 'EthalonTesting'
  | 'ReleaseToLive';

export type FeatureTrackStageKey = FrontendStageKey | BackendStageKey;

export const FRONTEND_STAGE_KEYS: readonly FrontendStageKey[] = [
  'SrApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive',
] as const;

export const BACKEND_STAGE_KEYS: readonly BackendStageKey[] = [
  'CsApproving', 'Development', 'StandTesting', 'EthalonTesting', 'ReleaseToLive',
] as const;

export interface FeatureTrackStage {
  stageKey: FeatureTrackStageKey;
  plannedStart: string | null;       // ISO yyyy-MM-dd
  plannedEnd: string | null;
  stageOwnerUserId: number | null;   // null = inherit from track owner
  stageVersion: number;
  /** Resolved on FeatureDetail only. */
  stageOwner?: MiniTeamMember | null;
}

export interface FeatureTrack {
  id: number;
  featureId: number;
  kind: FeatureTrackKind;
  trackOwnerUserId: number;
  version: number;
  stages: FeatureTrackStage[];        // exactly 5, canonical track-scoped order
  /** Resolved on FeatureDetail only. */
  trackOwner?: MiniTeamMember | null;
}
```

`FeatureSummary` and `FeatureDetail` (in `common/types/feature.ts`) gain an optional `tracks?: FeatureTrack[]`. The Zod schema in `common/api/schemas.ts` extends with `featureTrackSchema` / `featureTrackDetailSchema`, both `.optional()` on the parent so legacy responses keep parsing.

Location: types live in `OneMoreTaskTracker.WebClient/src/common/types/featureTrack.ts`; the existing `feature.ts` only adds the optional `tracks?` field.

## Pagination Model
Inherited from `GET /api/plan/features` — date-window-based via `windowStart` / `windowEnd` query params (existing chunk pagination via `useGanttTimelineScroll`). Tracks travel with their parent feature; no separate paging.

## Error Envelope
Inherited verbatim from the existing gateway — never restate; the FE's `httpClient.handleResponse` already understands these:
- `400` → `{ "error": "<short string>" }` (existing convention) or `{ "errors": { ... } }` for ModelState validation failures.
- `409` → `{ "error": "Conflict", "conflict": { "kind": "version" } }` for stale `expectedVersion` / `expectedStageVersion`.
- `422` → `{ "error": "Conflict", "conflict": { "kind": "overlap", "neighbour": "<stageKey>" } }` for chronological violations.
- `502` → upstream gRPC unavailable (translated by `GrpcExceptionMiddleware`).

## Persistence (per microservices-data.md)

New tables in the existing `features` schema (additive migration only):

```sql
-- features.feature_tracks
CREATE TABLE features.feature_tracks (
  Id                   serial      PRIMARY KEY,
  FeatureId            integer     NOT NULL REFERENCES features.Features(Id) ON DELETE CASCADE,
  Kind                 integer     NOT NULL,                   -- 0 Frontend, 1 Backend
  TrackOwnerUserId     integer     NOT NULL,                   -- soft FK → users service
  Version              integer     NOT NULL DEFAULT 0,
  CreatedAt            timestamptz NOT NULL,
  UpdatedAt            timestamptz NOT NULL,
  CONSTRAINT ux_feature_tracks_feature_kind UNIQUE (FeatureId, Kind)
);

-- features.feature_track_stages
CREATE TABLE features.feature_track_stages (
  Id                   serial      PRIMARY KEY,
  FeatureTrackId       integer     NOT NULL REFERENCES features.feature_tracks(Id) ON DELETE CASCADE,
  StageKey             integer     NOT NULL,                   -- FeatureTrackStageKey ordinal
  PlannedStart         date        NULL,
  PlannedEnd           date        NULL,
  StageOwnerUserId     integer     NULL,                       -- NULL ⇒ inherit
  Version              integer     NOT NULL DEFAULT 0,
  CreatedAt            timestamptz NOT NULL,
  UpdatedAt            timestamptz NOT NULL,
  CONSTRAINT ux_feature_track_stages_track_stage UNIQUE (FeatureTrackId, StageKey)
);
```

- All new FKs are within the `features` schema only (per microservices-data.md "schema per service").
- Cascade delete of a feature removes its tracks; cascade delete of a track removes its 5 stage rows. No event published — feature deletion is already self-contained on the Features service.
- `Version` columns are EF Core concurrency tokens.

## Events / Side Effects
None. Track CRUD does not publish events; sibling services do not depend on track shape.

## Optimistic Concurrency
- Track aggregate: `feature_tracks.Version` (header `If-Match` or body `expectedVersion`).
- Stage row: `feature_track_stages.Version` (header `If-Match` or body `expectedStageVersion`).
- Patches that touch only stage rows do NOT bump the parent track's version (mirrors existing `Feature.Version` vs `FeatureStagePlan.Version` split — the FE inline editor targets stage rows independently).

## Authorization summary
- `[Authorize]` on reads.
- `[Authorize(Roles = Roles.Manager)]` on PATCH endpoints.
- `FeatureOwnershipGuard.EnsureManager(feature, callerUserId)` (existing helper) is reused inside the gRPC handlers — non-owning managers get `PermissionDenied` (mapped to HTTP 403).
- No privilege-granting fields in the request bodies (per microservices-security.md — `caller_user_id` is server-stamped, never trusted from the client).

## Contract Change Log
- v1 (iteration 1): initial — adds `FeatureTrack` aggregate, two PATCH endpoints, additive `tracks` field on `FeatureSummary` / `FeatureDetail`. Existing endpoints unchanged.

## Contract Bump RFCs
<!-- Empty in v1. Add entries here after iteration 1's BE commit flips Frozen: true. -->

## Machine-Readable Contract
- Source of truth path (emitted by BE generator): `OneMoreTaskTracker.Api/openapi.json` — extend the existing hand-rolled OpenAPI document additively (new schemas: `FeatureTrack`, `FeatureTrackSummary`, `FeatureTrackDetail`, `FeatureTrackStage`, `PatchFeatureTrackPayload`, `PatchFeatureTrackStagePayload`, `FeatureTrackKind`, `FeatureTrackStageKey`; new paths `/api/plan/features/{id}/tracks/{kind}` and `/api/plan/features/{id}/tracks/{kind}/stages/{stageKey}`; extend `FeatureSummary` + `FeatureDetail` with optional `tracks` array). Per-project memory `project_openapi_hand_rolled` confirms hand-maintenance is the existing convention; do NOT introduce Swashbuckle/NSwag in this iteration.
- FE client location: `OneMoreTaskTracker.WebClient/src/common/types/featureTrack.ts` (TypeScript types) + `OneMoreTaskTracker.WebClient/src/common/api/schemas.ts` (Zod schemas, `featureTrackSchema` / `featureTrackDetailSchema`) + `OneMoreTaskTracker.WebClient/src/common/api/planApi.ts` (new exported functions `patchFeatureTrack` and `patchFeatureTrackStage`). The Evaluator's `contract-diff.mjs` compares `openapi.json` ↔ Zod schemas + TS types; field-name drift is auto-fail.
