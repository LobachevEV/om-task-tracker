# GAN feedback — spec 06 (frontend feature types + planApi)

Eval mode: **code-only**
Verdict: **PASS** (weighted total 9.63 ≥ 7.0)

## Dimension scores

| Dimension | Score | Weight | Weighted |
|---|---:|---:|---:|
| Design        |  9.5 | 0.15 | 1.425 |
| Originality   | 10.0 | 0.15 | 1.500 |
| Craft         |  8.5 | 0.20 | 1.700 |
| Functionality | 10.0 | 0.50 | 5.000 |
| **Total**     |      |      | **9.625** |

## Design — 9.5 / 10

All required exports live in `src/shared/types/feature.ts`: `FeatureState`, `FEATURE_STATES`, `MiniTeamMember`, `AttachedTask`, `FeatureSummary`, `FeatureDetail`, `CreateFeaturePayload`, `UpdateFeaturePayload`, `FeatureScope`. Shapes match spec §§39–115 line-by-line, including optional/nullable markers.

- `AttachedTask.state: TaskState` is imported via `import type { TaskState } from './task'` — no duplicated union. ✓
- `featureStateSchema`, `featureSummarySchema`, `featureSummaryListSchema`, `featureDetailSchema` all exported from `schemas.ts`. ✓
- `featureSummarySchema.description` uses `z.string().nullable().transform(v => v === '' ? null : v)` — empty string normalized to `null`. ✓
- `plannedStart`/`plannedEnd` use a shared `isoDateOrNull` = `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()` — accepts `'2026-04-30'` and `null`, rejects `'2026/04/30'`. ✓
- `MiniTeamMember.role` is an inline literal union in the TS type (spec §58 shows it inline); the Zod side uses the shared `userRoleSchema`. Minor: a shared `UserRole` TS alias would be nicer, but this matches the spec literally.

Minus 0.5: the spec's prose in §310 calls the old-payload rejection test "a `@ts-expect-error` smoke line is acceptable" — present and correct. No design deduction from F rule caps.

## Originality — 10 / 10

- `planApi.ts` imports `API_BASE_URL`, `authHeaders`, `handleResponse` from `./httpClient` — same pattern as `tasksApi.ts`. ✓
- `attachedTaskSchema` reuses the existing `taskStateSchema`. ✓
- `miniTeamMemberSchema.role` reuses the existing `userRoleSchema` instead of introducing a duplicate `roleSchema` (the spec §172 snippet had a local `roleSchema`; the implementation correctly chose the DRY path per the Originality rubric). ✓
- Tests live in `src/shared/api/__tests__/planApi.test.ts`, use `vi.stubGlobal('fetch', ...)` and `makeResponse` — identical harness to `tasksApi.test.ts`. No new mocking infra. ✓

## Craft — 8.5 / 10

Good:
- `attachTask` / `detachTask` both wrap `jiraId` in `encodeURIComponent`. ✓
- `updateFeature` uses `PATCH`. ✓
- Query string uses `URLSearchParams` with `${qs ? '?' + qs : ''}` — no trailing `?` when params are empty (verified by the "no query string when params empty" test). ✓
- `Content-Type: application/json` appears on `createFeature` (POST) and `updateFeature` (PATCH); NOT on `listFeatures`, `getFeature`, `attachTask`, `detachTask`. ✓
- `planApi.ts` re-exports types via `export type { ... }` — type-only, no runtime side effect. ✓

Minus 1.5 (Craft, not a cap trigger):
- Spec §§297–302 specifies `CreateTaskPayload` as `{ jiraTaskId: string; startDate: string; featureId: number }`, but the implementation in `src/shared/types/task.ts` reads:
  ```40:43:OneMoreTaskTracker.WebClient/src/shared/types/task.ts
  export interface CreateTaskPayload {
    jiraId: string;
    featureId: number;
  }
  ```
  The field is `jiraId` (not `jiraTaskId`) and `startDate` is missing entirely. The `jiraId` rename matches the rest of the codebase's vocabulary (every other task API uses `jiraId`), so that deviation is defensible. Dropping `startDate` is a harder call — spec 01b only mandates `featureId` server-side, and the pre-existing `tasksApi.ts` never sent `startDate` either, so adding it would have been inventing a field. Still, the implementation diverged from the spec's literal text without a comment explaining why. Small craft hit.

## Functionality — 10 / 10 (caps: none triggered)

### F1. `npm run build` — clean
```
> tsc -b && vite build
vite v7.3.1 building client environment for production...
✓ 231 modules transformed.
dist/index.html                   0.79 kB │ gzip:   0.43 kB
dist/assets/index-DpFbk36U.css   34.00 kB │ gzip:   7.32 kB
dist/assets/index-DesTFu3c.js   397.89 kB │ gzip: 124.03 kB
✓ built in 673ms
```

### F2. `npx tsc -b --noEmit` — clean
Exit code 0, no output (all projects up-to-date / type-check clean).

### F3. `npm test -- --run` — clean
```
Test Files  27 passed (27)
     Tests  215 passed (215)
  Duration  3.00s
```

### F4. `rg` spot-checks

- `featureSummarySchema|featureDetailSchema|featureSummaryListSchema|featureStateSchema` in `schemas.ts`: lines 54, 67, 83, 99 — **4 exports present** ✓
- `export (async )?function (listFeatures|getFeature|createFeature|updateFeature|attachTask|detachTask)` in `planApi.ts`: lines 16, 31, 39, 51, 64, 76 — **6 matches** ✓
- `featureId: number` in `types/task.ts`: line 42 — **1 match** (on `CreateTaskPayload`) ✓
- `@ts-expect-error` in `tasksApi.test.ts`: line 200 — **1 match** ✓

### F5. URL-encoded attach test (spec §323)

Present in `planApi.test.ts` lines 151–158:
```151:158:OneMoreTaskTracker.WebClient/src/shared/api/__tests__/planApi.test.ts
  it('URL-encodes the jiraId segment', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, sampleSummary));

    await attachTask(42, 'PROJ/1 2');

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('PROJ%2F1%202');
  });
```
`/` → `%2F`, space → `%20` — both encoded and asserted. ✓

## Top issues (all advisory, none block PASS)

1. **`CreateTaskPayload` shape diverges from spec §297–302**: field is `jiraId` (not `jiraTaskId`) and `startDate` is missing. The `jiraId` rename is defensible (matches rest of codebase); the missing `startDate` warrants a one-line comment or a spec-alignment note explaining why it was dropped.
2. **`MiniTeamMember.role` inlines the role union** in `feature.ts` instead of importing a shared `Role`/`UserRole` TS alias. Matches the spec literally, but creates two sources of truth (this inline union plus `userRoleSchema` in `schemas.ts`). A `type UserRole = z.infer<typeof userRoleSchema>` would tighten this.
3. **`planApi.ts` re-exports types that are already exported from `feature.ts`** (`CreateFeaturePayload`, `FeatureDetail`, `FeatureScope`, `FeatureState`, `FeatureSummary`, `UpdateFeaturePayload`). Fine for ergonomic call sites, but worth a comment — the spec mentions this as "where convenient" (§16), so intentional; leaving as advisory.

## Commands run

```bash
cd OneMoreTaskTracker.WebClient && npm run build 2>&1 | tail -25       # F1 → exit 0
cd OneMoreTaskTracker.WebClient && npx tsc -b --noEmit 2>&1 | tail -20 # F2 → exit 0, silent
cd OneMoreTaskTracker.WebClient && npm test -- --run 2>&1 | tail -50   # F3 → 215/215 pass
rg -n 'featureSummarySchema|featureDetailSchema|featureSummaryListSchema|featureStateSchema' \
   OneMoreTaskTracker.WebClient/src/shared/api/schemas.ts              # 4 ✓
rg -n 'export (async )?function (listFeatures|getFeature|createFeature|updateFeature|attachTask|detachTask)' \
   OneMoreTaskTracker.WebClient/src/shared/api/planApi.ts              # 6 ✓
rg -n 'featureId: number' OneMoreTaskTracker.WebClient/src/shared/types/task.ts  # 1 ✓
rg -n '@ts-expect-error' OneMoreTaskTracker.WebClient/src/shared/api/__tests__/tasksApi.test.ts  # 1 ✓
```

## Cap audit

- F1 clean → Functionality not capped.
- F3 clean → Functionality not capped.
- `@ts-expect-error` present → no Craft −2.
- URL-encoded attach test present → no Design −1.

**Verdict: PASS (9.63 ≥ 7.0).**
