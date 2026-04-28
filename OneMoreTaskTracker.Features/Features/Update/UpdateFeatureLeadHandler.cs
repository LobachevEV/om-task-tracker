using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureLeadCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class UpdateFeatureLeadHandler(
    FeaturesDbContext db,
    ILogger<UpdateFeatureLeadHandler> logger) : FeatureLeadUpdater.FeatureLeadUpdaterBase
{
    public override async Task<FeatureDto> Update(UpdateFeatureLeadRequest request, ServerCallContext context)
    {
        if (request.Id <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id is required"));

        if (request.LeadUserId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "lead_user_id is required"));

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (request.HasExpectedVersion && request.ExpectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));

        var before = feature.LeadUserId;
        var versionBefore = feature.Version;
        feature.LeadUserId = request.LeadUserId;
        feature.Version = versionBefore + 1;
        feature.UpdatedAt = DateTime.UtcNow;

        try
        {
            await db.SaveChangesAsync(context.CancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            await db.Entry(feature).ReloadAsync(context.CancellationToken);
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));
        }

        logger.LogInformation(
            "Feature inline edit applied: feature_id={FeatureId} field=lead lead_before={Before} lead_after={After} actor_user_id={ActorUserId} version_before={V0} version_after={V1}",
            feature.Id, before, feature.LeadUserId, request.CallerUserId, versionBefore, feature.Version);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
