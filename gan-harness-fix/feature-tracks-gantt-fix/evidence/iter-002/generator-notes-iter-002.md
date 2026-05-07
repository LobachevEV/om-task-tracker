# Generator Notes — Iteration 002 (fix-run iter-2)

## Targeted Issues

| ID | Strategy | Priority | Outcome |
|----|----------|----------|---------|
| FE-001-01 (storybook TS2741) | collateral AUTO_FAIL clear | 1 mandatory | closed |
| BE-003-05 | pinned | 2 major | closed |
| BE-005-03 | pinned | 3 minor | closed |
| CT-005-02 | pinned (mirrors BE-005-03) | 3 minor | closed |
| UX-005-03 | pinned | 4 minor | closed |
| FE-003-05 | pinned | carried-over | closed (already in place from iter-1) |

## Files Touched (8 files)

- **FE (2):** `GanttPage.tsx` (schemaMismatch?: boolean optional with default false), `GanttTrackStageRow.css` (1099px -> 1100px)
- **BE/C# (4):** `ConflictDetail.cs` (CrossKindAdmittedKeys method), `FeatureTrackStageScope.cs` (WireNameMap + AdmittedWireNames), `PatchFeatureTrackStageRequestValidator.cs` (WithMessage -> conflict-envelope), `GrpcExceptionMiddleware.cs` (InvalidArgument added to ExtractConflict guard)
- **Contract (1):** `openapi.json` (two description updates: "-1 = clear" -> "JSON null = clear")
- **Tests (1):** `PatchFeatureTrackStageHandlerTests.cs` (two assertions updated: check admittedKeys + admitted key name, not rejected key name)

## Quality Gates

- tsc: clean (0 errors)
- eslint: 0 errors (3 pre-existing warnings in coverage/)
- dotnet test: 562 pass, 0 fail
- vitest: 526 pass, 0 fail
- dotnet build: succeeded
- FE build: succeeded
- MUST-NOT-touch: MUST_NOT_TOUCH_VIOLATION=false

## Closure Check Results

Snippet checks returned ambiguous=true (require live server). BE-003-05 snippet confirms correct conflict.admittedKeys shape. FE-003-05 confirmed already closed (useMemo present in GanttFeatureTrackBand.tsx from iter-1).

## Deviations

None. FE-003-05 was collaterally confirmed closed with no additional code change needed.
