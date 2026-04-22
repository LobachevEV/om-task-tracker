# GAN Feedback — specs 03 + 04 (Feature write + read handlers)

Mode: code-only. Evaluated against combined rubric (0.15 D + 0.15 O + 0.20 C + 0.50 F, threshold 7.0).

## Scores

| Dim | Score | Weight | Weighted |
|-----|------:|-------:|---------:|
| Design        | 9.5 | 0.15 | 1.425 |
| Originality   | 9.5 | 0.15 | 1.425 |
| Craft         | 9.0 | 0.20 | 1.800 |
| Functionality | 10.0 | 0.50 | 5.000 |
| **Total**     |      |      | **9.65** |

**Verdict: PASS** (9.65 ≥ 7.0).

## Functionality checks

| Check | Result |
|-------|--------|
| F1 `dotnet build OneMoreTaskTracker.Features` | green (0 warn / 0 err) |
| F2 `dotnet build` (solution)                  | green (0 warn / 0 err) |
| F3 Features.Tests (`--no-build`)              | **27/27 passed**, 0 skipped, 270 ms |
| F4 test coverage (per-file `public async Task` counts) | Create=7, Update=4, List=6, Get=3 — all required cases present |
| F5 `FeatureMappingConfig.Register` in Program.cs | 1 hit (line 16, between `AddGrpc()` and `builder.Build()`) |

No caps triggered (F1 pass, F3 pass, Mapster per-proto registrations present, window semantics present).

## Design (9.5 / 10)

- `CreateFeatureHandler`: validates title + `ManagerUserId`; defaults `LeadUserId = ManagerUserId` when caller omits it; parses optional dates via shared helper; enforces `end >= start`; inserts with `State = (int)FeatureState.CsApproving`; description `""`/whitespace → `null`. All spec §§24–49 requirements honoured.
- `UpdateFeatureHandler`: `NotFound` on missing id; title validated; `ManagerUserId` is explicitly NOT mutated (comment references spec §170); `UpdatedAt = DateTime.UtcNow` bump; `LeadUserId` preserved when request omits it.
- `ListFeaturesHandler`: `AsNoTracking()` applied; optional manager filter; window semantics match spec 04 §§61–65 exactly — `window_start` inclusive on `PlannedEnd` (`PlannedEnd == null || PlannedEnd >= start`), `window_end` exclusive on `PlannedStart` (`PlannedStart == null || PlannedStart < end`), unscheduled features always retained. Ordering uses `OrderBy(f => f.PlannedStart == null).ThenBy(PlannedStart).ThenBy(Id)` — correct nulls-last and **translates to both InMemory and Npgsql** (improvement over the spec's `?? DateOnly.MaxValue` sketch which Npgsql cannot translate).
- `GetFeatureHandler`: `Id <= 0 → InvalidArgument`, `NotFound` on miss, `AsNoTracking()`.

## Originality (9.5 / 10)

- Mapster config centralised in `Features/Data/FeatureMappingConfig.cs` and invoked once from `Program.cs` — mirrors the Tasks service idiom.
- Validation helpers extracted into `FeatureValidation.ParseOptionalDate` / `ValidateDateOrder` and reused from both Create and Update (spec §148 called this out explicitly).
- Primary-constructor DI (`(FeaturesDbContext db)`) used consistently across all four handlers.
- State mapping is a straight `(int)` cast both directions with `Enum.IsDefined` guard against out-of-range wire values — matches spec 03 §96 ("if 02 is implemented with shared ordinals, drop the + 1") and is stricter than the sketch's Unspecified-only guard.

## Craft (9.0 / 10)

- **Per-proto FeatureDto registrations present for all four proto targets** (`CreateDto`, `UpdateDto`, `ListDto`, `GetDto`) — the rubric's cap hazard ("if duplicated per-proto, Mapster config must be registered for each") is handled. No missing-mapping runtime surprise.
- Description `null → ""`, dates `null → ""` else `yyyy-MM-dd`, timestamps `ToString("O")` — all present and consistent across the four registrations.
- `CancellationToken` threaded through every async call (`SaveChangesAsync`, `FirstOrDefaultAsync`, `ToListAsync`).
- No `Database.EnsureCreated()` in production; `Program.cs` uses `Database.Migrate()` as required by spec 01.
- No silent exception swallowing.
- Minor nits (−1.0): `using Mapster;` and `using Microsoft.EntityFrameworkCore;` in `CreateFeatureHandler.cs` (EF using is unused there; harmless). `FeatureMappingConfig.Register()` is called in `Program.cs` AND also in every test constructor — not wrong, but a shared `FeatureMappingFixture : IAssemblyFixture` would drop N duplicate calls.

## Functionality (10 / 10)

All F1–F5 green. Test coverage matches the rubric spot-check list:
- Create: happy, empty/whitespace title (Theory ×2), missing manager, invalid date naming field, end<start, description=""→null, explicit LeadUserId honoured.
- Update: NotFound, happy round-trip with `UpdatedAt > CreatedAt`, out-of-range state → InvalidArgument, manager not mutated.
- List: empty DB, 3-feature nulls-last ordering, manager filter, window slice (with explicit `StartsAtEnd` row to prove exclusive upper bound), invalid window date, `AsNoTracking` verified via `ChangeTracker.Entries<Feature>()`.
- Get: id=0, missing, happy with full field round-trip.

## Top issues / suggestions

1. **Test-side Mapster registration duplication** — every `*HandlerTests` ctor calls `FeatureMappingConfig.Register()`. With Mapster's global `TypeAdapterConfig`, `.NewConfig()` resets each time; consider an `IAssemblyFixture` or a `ModuleInitializer` to register once per test run. Low priority — currently correct.
2. **`CreateFeatureHandler.cs` has an unused `using Microsoft.EntityFrameworkCore;`** — cosmetic.
3. **Spec drift (intentional)**: spec 03 §142 sketches `FeatureStateUnspecified` as the only invalid-state guard; the implementation uses `Enum.IsDefined` which also rejects unknown wire ordinals. This is stricter and better, and is explicitly tested. Worth a one-line note in the spec to reconcile if others read the sketch literally.
4. **Ordering idiom** — switching from `?? DateOnly.MaxValue` to `OrderBy(f => f.PlannedStart == null)` is the right call for Npgsql; worth back-porting to the spec text so future implementers don't copy the broken sketch.

Overall: a clean, production-ready implementation that exceeds the spec in ordering translatability and state validation strictness.
