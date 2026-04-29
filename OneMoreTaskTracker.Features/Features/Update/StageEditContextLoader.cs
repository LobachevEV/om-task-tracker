using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class StageEditContextLoader
{
    public static async Task<StageEditContext> LoadAsync(
        FeaturesDbContext db,
        int featureId,
        ProtoFeatureState stage,
        int callerUserId,
        bool hasExpectedStageVersion,
        int expectedStageVersion,
        CancellationToken cancellationToken)
    {
        if (featureId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));

        if (!Enum.IsDefined(typeof(ProtoFeatureState), stage))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "stage is required"));

        var feature = await FeatureLoader.LoadWithStagePlansAsync(db, featureId, cancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, callerUserId);
        var stageOrdinal = (int)stage;
        var plan = FeatureLoader.ResolveStage(feature, stageOrdinal, stage.ToString());
        FeatureVersionGuard.EnsureStageVersion(plan, hasExpectedStageVersion, expectedStageVersion);
        return new StageEditContext(feature, plan, stageOrdinal);
    }
}
