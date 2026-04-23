using Grpc.Core;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Data;

// Shared validation helpers for Create and Update handlers (spec 03 §51–63).
public static class FeatureValidation
{
    // Canonical 5 FeatureState ordinals. Cached to avoid allocating on every call.
    private static readonly int[] CanonicalStageOrdinals =
    [
        (int)FeatureState.CsApproving,
        (int)FeatureState.Development,
        (int)FeatureState.Testing,
        (int)FeatureState.EthalonTesting,
        (int)FeatureState.LiveRelease,
    ];

    public static DateOnly? ParseOptionalDate(string raw, string field)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (!DateOnly.TryParseExact(raw, "yyyy-MM-dd", out var d))
            throw new RpcException(new Status(StatusCode.InvalidArgument, $"{field} must be YYYY-MM-DD"));
        return d;
    }

    public static void ValidateDateOrder(DateOnly? start, DateOnly? end)
    {
        if (start is { } s && end is { } e && e < s)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "planned_end must be on or after planned_start"));
    }

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
