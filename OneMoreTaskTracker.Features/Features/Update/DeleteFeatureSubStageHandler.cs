using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.DeleteFeatureSubStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class DeleteFeatureSubStageHandler(
    FeaturesDbContext db,
    ILogger<DeleteFeatureSubStageHandler> logger,
    IRequestClock clock) : FeatureSubStageDeleter.FeatureSubStageDeleterBase
{
    public override async Task<FeatureTaxonomyResponse> Delete(DeleteFeatureSubStageRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTaxonomyAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var subStage = feature.ResolveSubStage(request.SubStageId)
                       ?? throw new RpcException(new Status(StatusCode.NotFound, $"sub-stage {request.SubStageId} not found"));

        FeatureVersionGuard.EnsureSubStageVersion(subStage, request.HasExpectedVersion, request.ExpectedVersion);

        if (!FeatureStageLayout.IsMultiOwner(subStage.PhaseKind))
            throw new RpcException(new Status(StatusCode.FailedPrecondition,
                $"phase {subStage.PhaseKind} does not support sub-stage deletion"));

        if (FeatureStageLayout.CountSubStages(feature, subStage.Track, subStage.PhaseKind) <= 1)
            throw new RpcException(new Status(StatusCode.FailedPrecondition,
                "cannot delete the last sub-stage in this phase"));

        var now = clock.GetUtcNow();
        var track = subStage.Track;
        var phase = subStage.PhaseKind;

        feature.SubStages.Remove(subStage);
        db.FeatureSubStages.Remove(subStage);

        FeatureStageLayout.RecomputeOrdinals(feature, track, phase, now);
        feature.RecordSubStageMutation(now);

        await db.SaveFeatureAsync(feature, context.CancellationToken);

        logger.LogInformation(
            "Feature sub-stage deleted: feature_id={FeatureId} sub_stage_id={SubStageId} track={Track} phase={Phase} actor_user_id={ActorUserId} feature_version={FeatureVersion}",
            feature.Id,
            request.SubStageId,
            track,
            phase,
            request.CallerUserId,
            feature.Version);

        return new FeatureTaxonomyResponse
        {
            FeatureId      = feature.Id,
            FeatureVersion = feature.Version,
            Taxonomy       = FeatureMappingConfig.BuildProtoTaxonomy(feature),
        };
    }
}
