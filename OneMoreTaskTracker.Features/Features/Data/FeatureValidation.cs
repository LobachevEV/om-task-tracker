using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Update;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Data;

// Shared validation helpers for Create and Update handlers (spec 03 §51–63).
public static class FeatureValidation
{
    // Inclusive range guard on year per api-contract.md §4
    // ("2000 ≤ year ≤ 2100") and backend-eval-contract.md §4 (out-of-range row).
    private const int MinYear = 2000;
    private const int MaxYear = 2100;

    // Canonical 5 FeatureState ordinals. Cached to avoid allocating on every call.
    private static readonly int[] CanonicalStageOrdinals =
    [
        (int)FeatureState.CsApproving,
        (int)FeatureState.Development,
        (int)FeatureState.Testing,
        (int)FeatureState.EthalonTesting,
        (int)FeatureState.LiveRelease,
    ];

    // Canonical PascalCase names mirrored from FeatureState; used when emitting
    // the cross-stage `conflict.with` neighbour name. Indexed by ordinal so
    // StageOrderValidator can resolve a name in O(1).
    private static readonly string[] CanonicalStageNames =
    [
        nameof(FeatureState.CsApproving),
        nameof(FeatureState.Development),
        nameof(FeatureState.Testing),
        nameof(FeatureState.EthalonTesting),
        nameof(FeatureState.LiveRelease),
    ];

    public static DateOnly? ParseOptionalDate(string raw, string field)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var d))
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"{field} must be YYYY-MM-DD"));

        // 2000 ≤ year ≤ 2100 — both bounds enforced. The error message is the
        // public-facing string clients render verbatim per api-contract.md §4.
        if (d.Year < MinYear || d.Year > MaxYear)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Use a real release date"));

        return d;
    }

    public static void ValidateDateOrder(DateOnly? start, DateOnly? end)
    {
        if (start is { } s && end is { } e && e < s)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "planned_end must be on or after planned_start"));
    }

    // Cross-stage chronological-order check (api-contract.md §4 / §6 in the
    // design brief and backend-eval-contract.md §4 422 row). For the stage
    // being mutated, walk the canonical FeatureState order and assert that
    // each populated `plannedEnd` is on or before the next populated
    // `plannedStart`. The first violation throws FailedPrecondition with the
    // neighbour-stage name embedded in ConflictDetail.StageOrderOverlap so the
    // gateway middleware can surface `{ error, conflict: { kind, with } }`.
    //
    // `mutatedOrdinal` is the FeatureState ordinal of the stage that was just
    // changed; the validator uses it to pick which neighbour to name in the
    // error so the FE can highlight the offending pair deterministically.
    public static void ValidateStageOrder(IReadOnlyList<StagePlanSnapshot> stages, int mutatedOrdinal)
    {
        // Sort once into the canonical order rather than relying on caller order.
        var ordered = stages.OrderBy(s => s.Ordinal).ToArray();

        // Walk neighbour pairs (i, i+1). When both have populated dates we
        // require ordered[i].PlannedEnd <= ordered[i+1].PlannedStart. The
        // mutated stage's adjacent neighbour is named in `with` so the FE can
        // anchor the inline error to a concrete row.
        for (int i = 0; i < ordered.Length - 1; i++)
        {
            var earlier = ordered[i];
            var later = ordered[i + 1];

            if (earlier.PlannedEnd is not { } earlierEnd) continue;
            if (later.PlannedStart is not { } laterStart) continue;

            if (laterStart < earlierEnd)
            {
                // Pick the neighbour name from the perspective of the mutated
                // stage so the surfaced `with` field always points at the
                // counterpart the user did NOT just edit.
                var neighbourOrdinal = mutatedOrdinal == earlier.Ordinal
                    ? later.Ordinal
                    : earlier.Ordinal;

                throw new RpcException(new Status(
                    StatusCode.FailedPrecondition,
                    ConflictDetail.StageOrderOverlap(StageName(neighbourOrdinal))));
            }
        }
    }

    private static string StageName(int ordinal) =>
        ordinal >= 0 && ordinal < CanonicalStageNames.Length
            ? CanonicalStageNames[ordinal]
            : ordinal.ToString();

    // Validate a proto-level stage plan input set as required by api-contract.md:
    //   - exactly 5 entries
    //   - each `stage` is a defined FeatureState value
    //   - no duplicate stages (one row per FeatureState ordinal)
    //   - per-row date order (plannedEnd >= plannedStart when both present)
    //
    // Throws RpcException(InvalidArgument) on the first violation; callers rely
    // on GrpcExceptionMiddleware to translate to HTTP 400 with a generic body.
    public static void ValidateStagePlans(IReadOnlyList<StagePlanInput> inputs)
    {
        if (inputs.Count != CanonicalStageOrdinals.Length)
            throw new RpcException(new Status(StatusCode.InvalidArgument,
                $"stage_plans must contain exactly {CanonicalStageOrdinals.Length} entries"));

        var seen = new HashSet<int>();
        foreach (var input in inputs)
        {
            if (!Enum.IsDefined(typeof(ProtoFeatureState), input.Stage))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "stage_plans entry has an unknown stage value"));

            if (!seen.Add((int)input.Stage))
                throw new RpcException(new Status(StatusCode.InvalidArgument, "stage_plans contains duplicate stage values"));

            ValidateDateOrder(input.PlannedStart, input.PlannedEnd);
        }
    }
}

// Neutral input record consumed by the Update handler / upserter so that proto
// types never leak into domain validation code (per microservices-contracts.md
// "generated transport types do not leak into domain"). The proto-to-input
// mapping lives in UpdateFeatureHandler.
public readonly record struct StagePlanInput(
    ProtoFeatureState Stage,
    DateOnly? PlannedStart,
    DateOnly? PlannedEnd,
    int PerformerUserId);

// Snapshot of a single stage row for cross-stage order validation. The handler
// passes one of these per stage (including the tentative new value for the
// stage being mutated) into FeatureValidation.ValidateStageOrder. Kept as a
// neutral record so the validator stays free of EF entity types.
public readonly record struct StagePlanSnapshot(
    int Ordinal,
    DateOnly? PlannedStart,
    DateOnly? PlannedEnd);
