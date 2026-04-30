using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureSubStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureSubStageHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureSubStageHandler> logger,
    IRequestClock clock) : FeatureSubStagePatcher.FeatureSubStagePatcherBase
{
    public override async Task<FeatureTaxonomyResponse> Patch(PatchFeatureSubStageRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTaxonomyAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var subStage = feature.ResolveSubStage(request.SubStageId)
                       ?? throw new RpcException(new Status(StatusCode.NotFound, $"sub-stage {request.SubStageId} not found"));

        FeatureVersionGuard.EnsureSubStageVersion(subStage, request.HasExpectedVersion, request.ExpectedVersion);

        var now = clock.GetUtcNow();
        var mutated = false;

        if (request.HasOwnerUserId)
        {
            subStage.AssignOwner(request.OwnerUserId, now);
            mutated = true;
        }

        if (request.HasPlannedStart)
        {
            subStage.SetPlannedStart(ParseOptionalDate(request.PlannedStart), now);
            mutated = true;
        }

        if (request.HasPlannedEnd)
        {
            subStage.SetPlannedEnd(ParseOptionalDate(request.PlannedEnd), now);
            mutated = true;
        }

        if (mutated)
        {
            feature.RecordSubStageMutation(now);
            await db.SaveSubStageAsync(subStage, context.CancellationToken);

            logger.LogInformation(
                "Feature sub-stage patched: feature_id={FeatureId} sub_stage_id={SubStageId} track={Track} phase={Phase} ordinal={Ordinal} owner_user_id={OwnerUserId} actor_user_id={ActorUserId} sub_stage_version={SubStageVersion} feature_version={FeatureVersion}",
                feature.Id,
                subStage.Id,
                subStage.Track,
                subStage.PhaseKind,
                subStage.Ordinal,
                subStage.OwnerUserId,
                request.CallerUserId,
                subStage.Version,
                feature.Version);
        }

        return new FeatureTaxonomyResponse
        {
            FeatureId      = feature.Id,
            FeatureVersion = feature.Version,
            Taxonomy       = FeatureMappingConfig.BuildProtoTaxonomy(feature),
        };
    }

    private static DateOnly? ParseOptionalDate(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
            return null;
        return DateOnly.ParseExact(raw, "yyyy-MM-dd");
    }
}
