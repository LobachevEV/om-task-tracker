using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateStageOwnerCommand;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Update;

// Roster membership is validated at the gateway; this handler treats the id opaquely.
public sealed class UpdateStageOwnerHandler(
    FeaturesDbContext db,
    ILogger<UpdateStageOwnerHandler> logger) : StageOwnerUpdater.StageOwnerUpdaterBase
{
    public override async Task<FeatureDto> Update(UpdateStageOwnerRequest request, ServerCallContext context)
    {
        if (request.FeatureId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));

        if (!Enum.IsDefined(typeof(ProtoFeatureState), request.Stage))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "stage is required"));

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.FeatureId, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.FeatureId} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        var stageOrdinal = (int)request.Stage;
        var plan = feature.StagePlans.FirstOrDefault(sp => sp.Stage == stageOrdinal)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"stage {request.Stage} not found"));

        if (request.HasExpectedStageVersion && request.ExpectedStageVersion != plan.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(plan.Version)));

        var newOwner = request.StageOwnerUserId > 0 ? request.StageOwnerUserId : 0;
        var ownerBefore = plan.PerformerUserId;
        var stageVersionBefore = plan.Version;
        var featureVersionBefore = feature.Version;

        plan.PerformerUserId = newOwner;
        plan.Version = stageVersionBefore + 1;
        plan.UpdatedAt = DateTime.UtcNow;
        feature.Version = featureVersionBefore + 1;
        feature.UpdatedAt = plan.UpdatedAt;

        try
        {
            await db.SaveChangesAsync(context.CancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await db.Entry(plan).ReloadAsync(context.CancellationToken);
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(plan.Version)));
        }

        logger.LogInformation(
            "Feature inline edit applied: feature_id={FeatureId} stage={Stage} field=owner old_value={Old} new_value={New} actor_user_id={ActorUserId} stage_version_before={SV0} stage_version_after={SV1}",
            feature.Id, request.Stage, ownerBefore, newOwner, request.CallerUserId, stageVersionBefore, plan.Version);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
