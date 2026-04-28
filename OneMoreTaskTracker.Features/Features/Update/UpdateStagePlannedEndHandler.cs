using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateStagePlannedEndCommand;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class UpdateStagePlannedEndHandler(
    FeaturesDbContext db,
    ILogger<UpdateStagePlannedEndHandler> logger) : StagePlannedEndUpdater.StagePlannedEndUpdaterBase
{
    public override async Task<FeatureDto> Update(UpdateStagePlannedEndRequest request, ServerCallContext context)
    {
        if (request.FeatureId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));

        if (!Enum.IsDefined(typeof(ProtoFeatureState), request.Stage))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "stage is required"));

        var parsed = FeatureValidation.ParseOptionalDate(request.PlannedEnd, "planned_end");

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

        FeatureValidation.ValidateDateOrder(plan.PlannedStart, parsed);

        var snapshots = feature.StagePlans
            .Select(sp => sp.Stage == stageOrdinal
                ? new StagePlanSnapshot(sp.Stage, sp.PlannedStart, parsed)
                : new StagePlanSnapshot(sp.Stage, sp.PlannedStart, sp.PlannedEnd))
            .ToList();
        FeatureValidation.ValidateStageOrder(snapshots, stageOrdinal);

        var endBefore = plan.PlannedEnd;
        var stageVersionBefore = plan.Version;

        var now = DateTime.UtcNow;
        plan.SetPlannedEnd(parsed, now);

        StagePlanUpserter.RecomputeFeatureDates(feature);
        feature.RecordStageEdit(now);

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
            "Feature inline edit applied: feature_id={FeatureId} stage={Stage} field=plannedEnd old_value={Old} new_value={New} actor_user_id={ActorUserId} stage_version_before={SV0} stage_version_after={SV1}",
            feature.Id, request.Stage, endBefore, parsed, request.CallerUserId, stageVersionBefore, plan.Version);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
