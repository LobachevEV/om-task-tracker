# Spec 16 — docs and graphify refresh — feedback-001

Eval mode: `code-only`. Rubric: 0.15 D + 0.15 O + 0.20 C + 0.50 F. Threshold 7.0.

## Dimension scores

| Dimension        | Score | Weight | Weighted |
|------------------|------:|-------:|---------:|
| Design           |  9.0  |  0.15  |    1.35  |
| Originality      |  8.5  |  0.15  |    1.275 |
| Craft            |  9.0  |  0.20  |    1.80  |
| Functionality    |  9.5  |  0.50  |    4.75  |
| **Weighted total** |       |        | **9.175** |

Verdict: **PASS** (9.18 ≥ 7.0).

## Rubric table F1..F11

| # | Check | Result | Evidence |
|---|---|---|---|
| F1 | `OneMoreTaskTracker.Features` in `CLAUDE.md` ≥4 | PASS (4) | Bounded-context row, project tree, run command, Architecture bullet — exactly the four surgical insertions the spec asked for. |
| F2 | `features/` hits in `docs/CODEMAPS` | PASS (25) | README:1, api-gateway:4, plan-frontend:20 — acceptance §83 met, hits are in updated files not historical. |
| F3 | `ls docs/CODEMAPS/` = 5 files | PASS | `README.md`, `api-gateway.md`, `features-service.md`, `plan-frontend.md`, `tasks-service.md`. |
| F4 | `PlanController` in `api-gateway.md` ≥1 | PASS (3) | Controllers table, endpoint sub-table, FailedPrecondition note. |
| F5 | `TaskFeatureLinker`/`AttachTaskToFeatureHandler` in `tasks-service.md` ≥1 | PASS (2) | Handler row + proto description, both callout `PlanController` as sole consumer. |
| F6 | `FIXTURE_TODAY` in `plan-frontend.md` ≥1 | PASS (1) | Covered in "Fixtures for Storybook" section with rationale (deterministic timeline rendering). |
| F7 | All 5 feature states in `CLAUDE.md` | PASS | Both in the bounded-context row (line 20) and the Architecture bullet (line 91). |
| F8 | `5110` / `FeaturesService` in `docs/CODEMAPS/` ≥1 | PASS (3) | api-gateway.md:2 (config section), features-service.md:1 (header). |
| F9 | `FailedPrecondition` in `api-gateway.md` ≥1 | PASS (2) | Mapping table row + spec 07 annotation. |
| F10 | No `graphify-out/` staged | PASS | `git status --short` shows no graphify-out paths; folder is gitignored per CLAUDE.md. |
| F11 | `npx tsc -b --noEmit` green | PASS | Clean exit with no output on tail -15; docs-only change did not touch any code referenced by `tsconfig.references`. |

No caps triggered.

## Sub-criterion notes

### Design (0.15) — 9.0
- CLAUDE.md edits are genuinely surgical: `git diff --stat` shows **6 insertions / 2 deletions** across exactly the four sections the spec named (Bounded contexts, Project Structure, Build & Run, Architecture incl. Request flow). Tech Stack, Key Configuration, Docker, Knowledge Graph, Planning Workflow, Code Conventions are untouched.
- CODEMAPS directory: 1 README + 4 topic files (one per bounded context that has interesting code in this wave: Features, Tasks, Api, plus the plan frontend). Matches spec §42-50 exactly.
- Structure is consistent: every CODEMAP opens with a one-paragraph purpose, cites an Entry point, then Domain/Handlers or Controllers/Middleware/Clients. Variation between backend-service and frontend layouts is appropriate rather than mechanical.

### Originality (0.15) — 8.5
- CODEMAPS explicitly frame themselves as supplements to graphify (README line 5), not duplicates. Good — avoids the wiki-duplication trap.
- All file paths are project-relative (`OneMoreTaskTracker.Features/Program.cs`, `OneMoreTaskTracker.WebClient/src/features/gantt/GanttPage.tsx`) per spec §51.
- README indexes all four maps; cross-references exist between features-service ↔ tasks-service ↔ api-gateway (and tasks-service links to both features-service and api-gateway at the bottom). Minor: plan-frontend does not back-link to api-gateway, but it does name the `/api/plan/*` endpoints it calls.

### Craft (0.20) — 9.0
- Tables used wherever data is structured: handler→status in features-service, controller→route→upstreams in api-gateway, gRPC-status→HTTP in api-gateway, handler→file→role in tasks-service, proto→RPC in features-service, component→file→role in plan-frontend. This matches spec §Rubric-craft.
- File citations are concrete throughout — e.g. `OneMoreTaskTracker.Features/Features/Data/FeatureMappingConfig.cs`, not "the mapping file".
- No emojis anywhere in `docs/CODEMAPS/` (ripgrep for emoji ranges found zero files).
- Size is tight: api-gateway 76, features-service 50, plan-frontend 63, tasks-service 57 — all well under the 200-line ceiling and within the README's suggested 60–120 band.
- Minor nits: (1) features-service.md labels the `features-service.md` section "Contract (proto files)" with an entry for `feature_state.proto` that has `—` for the RPC-service column; slightly awkward but correct. (2) plan-frontend.md mentions `planApi.attachTask`/`detachTask` on the client but does not cite a source file — unclear if these are separate files or methods on `planApi.ts`.

### Functionality (0.50) — 9.5
- All 11 rubric checks PASS. tsc clean; no graphify-out leaks; acceptance criteria §80-83 all satisfied.
- −0.5 only because I could not independently verify every cited file path (e.g. `FeatureMappingConfig.cs`, `ListFeaturesQuery/list_features_query_handler.proto`) in one check — spot-check of `OneMoreTaskTracker.Features/` listing shows the service layout matches; spot-check of `src/features/gantt/` shows all claimed files exist (`FeatureDrawer.tsx`, `FeatureEditForm.tsx`, `ganttMath.ts`, `__fixtures__/FeatureFixtures.ts`).

## Top 3 issues

1. **plan-frontend.md — `attachTask`/`detachTask` client methods under-cited**. The "API client" line lists them inside `planApi.ts`, but the Features-service drawer CODEMAP never cross-links back to api-gateway.md's `POST/DELETE /api/plan/features/{id}/tasks/{jiraId}` rows. Easy polish: add a "gateway endpoint → [api-gateway.md]" pointer in that section.
2. **features-service.md proto table has an empty cell**. `feature_state.proto` gets a row with `—` for "RPC service" and "shared `FeatureState` enum" in the RPC column. Either drop the row (enum-only file is adequately described by the sentence right above), or split the table into two: RPC protos vs shared messages.
3. **README does not list the plan-frontend as a "frontend module" category**. The README calls CODEMAPS "per bounded context or per first-class frontend feature", but the Index treats all four files as peers without flagging that `plan-frontend.md` is the frontend entry. Minor — grouping by backend vs frontend would help future growth.

## Verdict

**PASS — ship.** Weighted total 9.18 clears the 7.0 threshold decisively. CLAUDE.md edits are model-surgical (6 insertions, 2 modifications — exactly the four sections the spec enumerated, nothing else touched). All 11 functionality checks pass. Docs-only scope respected (tsc green, no graphify-out staged). CODEMAPS directory is well-structured, consistent, cross-linked, and sized correctly. The three issues above are polish, not blockers.
