using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureStageHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureStageHandler> logger,
    IRequestClock clock) : FeatureStagePatcher.FeatureStagePatcherBase
{
    private static readonly string[] CanonicalStageNames =
    [
        nameof(FeatureState.CsApproving),
        nameof(FeatureState.Development),
        nameof(FeatureState.Testing),
        nameof(FeatureState.EthalonTesting),
        nameof(FeatureState.LiveRelease),
    ];

    public override async Task<FeatureDto> Patch(PatchFeatureStageRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithStagePlansAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var stageOrdinal = (int)request.Stage;
        var plan = feature.ResolveStage(stageOrdinal)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"stage {request.Stage.ToString()} not found"));
        FeatureVersionGuard.EnsureStageVersion(plan, request.HasExpectedStageVersion, request.ExpectedStageVersion);

        if (request.HasPlannedStart || request.HasPlannedEnd)
        {
            var prospectiveStart = request.HasPlannedStart ? PlannedDate.Parse(request.PlannedStart) : plan.PlannedStart;
            var prospectiveEnd = request.HasPlannedEnd ? PlannedDate.Parse(request.PlannedEnd) : plan.PlannedEnd;

            var snapshots = feature.StagePlans
                .Select(sp => sp.Stage == stageOrdinal
                    ? new StagePlanSnapshot(sp.Stage, prospectiveStart, prospectiveEnd)
                    : new StagePlanSnapshot(sp.Stage, sp.PlannedStart, sp.PlannedEnd))
                .ToList();
            EnsureStageOrder(snapshots, stageOrdinal);
        }

        var now = clock.GetUtcNow();
        var anyMutation = false;

        if (request.HasStageOwnerUserId)
        {
            plan.AssignOwner(request.StageOwnerUserId > 0 ? request.StageOwnerUserId : 0, now);
            anyMutation = true;
        }

        if (request.HasPlannedStart)
        {
            plan.SetPlannedStart(PlannedDate.Parse(request.PlannedStart), now);
            anyMutation = true;
        }

        if (request.HasPlannedEnd)
        {
            plan.SetPlannedEnd(PlannedDate.Parse(request.PlannedEnd), now);
            anyMutation = true;
        }

        if (anyMutation)
        {
            if (request.HasPlannedStart || request.HasPlannedEnd)
                StagePlanUpserter.RecomputeFeatureDates(feature);

            feature.RecordStageEdit(now);

            await db.SaveStageAsync(plan, context.CancellationToken);

            logger.LogInformation(
                "Feature stage patch applied: feature_id={FeatureId} stage={Stage} fields_owner={HasOwner} fields_planned_start={HasStart} fields_planned_end={HasEnd} owner={Owner} start={Start} end={End} actor_user_id={ActorUserId} stage_version={StageVersion} feature_version={FeatureVersion}",
                feature.Id,
                request.Stage,
                request.HasStageOwnerUserId,
                request.HasPlannedStart,
                request.HasPlannedEnd,
                plan.PerformerUserId,
                plan.PlannedStart,
                plan.PlannedEnd,
                request.CallerUserId,
                plan.Version,
                feature.Version);
        }

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }

    private static void EnsureStageOrder(IReadOnlyList<StagePlanSnapshot> stages, int mutatedOrdinal)
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

    private readonly record struct StagePlanSnapshot(
        int Ordinal,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd);
}