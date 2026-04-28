using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureStageCommand;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureStageHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureStageHandler> logger) : FeatureStagePatcher.FeatureStagePatcherBase
{
    public override async Task<FeatureDto> Patch(PatchFeatureStageRequest request, ServerCallContext context)
    {
        if (request.FeatureId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "feature_id is required"));

        if (!Enum.IsDefined(typeof(ProtoFeatureState), request.Stage))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "stage is required"));

        DateOnly? parsedStart = null;
        if (request.HasPlannedStart)
            parsedStart = FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start");

        DateOnly? parsedEnd = null;
        if (request.HasPlannedEnd)
            parsedEnd = FeatureValidation.ParseOptionalDate(request.PlannedEnd, "planned_end");

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

        if (request.HasPlannedStart || request.HasPlannedEnd)
        {
            var prospectiveStart = request.HasPlannedStart ? parsedStart : plan.PlannedStart;
            var prospectiveEnd = request.HasPlannedEnd ? parsedEnd : plan.PlannedEnd;
            FeatureValidation.ValidateDateOrder(prospectiveStart, prospectiveEnd);

            var snapshots = feature.StagePlans
                .Select(sp => sp.Stage == stageOrdinal
                    ? new StagePlanSnapshot(sp.Stage, prospectiveStart, prospectiveEnd)
                    : new StagePlanSnapshot(sp.Stage, sp.PlannedStart, sp.PlannedEnd))
                .ToList();
            FeatureValidation.ValidateStageOrder(snapshots, stageOrdinal);
        }

        var ownerBefore = plan.PerformerUserId;
        var startBefore = plan.PlannedStart;
        var endBefore = plan.PlannedEnd;
        var stageVersionBefore = plan.Version;
        var featureVersionBefore = feature.Version;

        var now = DateTime.UtcNow;
        var anyMutation = false;

        if (request.HasStageOwnerUserId)
        {
            var newOwner = request.StageOwnerUserId > 0 ? request.StageOwnerUserId : 0;
            plan.AssignOwner(newOwner, now);
            anyMutation = true;
        }

        if (request.HasPlannedStart)
        {
            plan.SetPlannedStart(parsedStart, now);
            anyMutation = true;
        }

        if (request.HasPlannedEnd)
        {
            plan.SetPlannedEnd(parsedEnd, now);
            anyMutation = true;
        }

        if (anyMutation)
        {
            if (request.HasPlannedStart || request.HasPlannedEnd)
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
                "Feature stage patch applied: feature_id={FeatureId} stage={Stage} fields_owner={HasOwner} fields_planned_start={HasStart} fields_planned_end={HasEnd} owner_before={OwnerBefore} owner_after={OwnerAfter} start_before={StartBefore} start_after={StartAfter} end_before={EndBefore} end_after={EndAfter} actor_user_id={ActorUserId} stage_version_before={SV0} stage_version_after={SV1} feature_version_before={FV0} feature_version_after={FV1}",
                feature.Id,
                request.Stage,
                request.HasStageOwnerUserId,
                request.HasPlannedStart,
                request.HasPlannedEnd,
                ownerBefore,
                plan.PerformerUserId,
                startBefore,
                plan.PlannedStart,
                endBefore,
                plan.PlannedEnd,
                request.CallerUserId,
                stageVersionBefore,
                plan.Version,
                featureVersionBefore,
                feature.Version);
        }

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
