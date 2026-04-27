using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Update;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Data;

public static class FeatureValidation
{
    private const int MinYear = 2000;
    private const int MaxYear = 2100;

    private static readonly int[] CanonicalStageOrdinals =
    [
        (int)FeatureState.CsApproving,
        (int)FeatureState.Development,
        (int)FeatureState.Testing,
        (int)FeatureState.EthalonTesting,
        (int)FeatureState.LiveRelease,
    ];

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

        if (d.Year < MinYear || d.Year > MaxYear)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "Use a real release date"));

        return d;
    }

    public static void ValidateDateOrder(DateOnly? start, DateOnly? end)
    {
        if (start is { } s && end is { } e && e < s)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "planned_end must be on or after planned_start"));
    }

    public static void ValidateStageOrder(IReadOnlyList<StagePlanSnapshot> stages, int mutatedOrdinal)
    {
        var ordered = stages.OrderBy(s => s.Ordinal).ToArray();

        for (int i = 0; i < ordered.Length - 1; i++)
        {
            var earlier = ordered[i];
            var later = ordered[i + 1];

            if (earlier.PlannedEnd is not { } earlierEnd) continue;
            if (later.PlannedStart is not { } laterStart) continue;

            if (laterStart < earlierEnd)
            {
                // Name the neighbour the user did NOT just edit so the FE can anchor the inline error to it.
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

public readonly record struct StagePlanInput(
    ProtoFeatureState Stage,
    DateOnly? PlannedStart,
    DateOnly? PlannedEnd,
    int PerformerUserId);

public readonly record struct StagePlanSnapshot(
    int Ordinal,
    DateOnly? PlannedStart,
    DateOnly? PlannedEnd);
