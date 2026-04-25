using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class UpdateFeatureTitleHandler(
    FeaturesDbContext db,
    ILogger<UpdateFeatureTitleHandler> logger) : FeatureTitleUpdater.FeatureTitleUpdaterBase
{
    private const int TitleMaxLength = 200;

    public override async Task<FeatureDto> Update(UpdateFeatureTitleRequest request, ServerCallContext context)
    {
        if (request.Id <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id is required"));

        var trimmedTitle = (request.Title ?? string.Empty).Trim();
        if (trimmedTitle.Length == 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "title is required"));
        if (trimmedTitle.Length > TitleMaxLength)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "title too long"));

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (request.HasExpectedVersion && request.ExpectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));

        var before = feature.Title;
        var versionBefore = feature.Version;
        feature.Title = trimmedTitle;
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
            "Feature inline edit applied: feature_id={FeatureId} field=title title_len_before={Before} title_len_after={After} actor_user_id={ActorUserId} version_before={V0} version_after={V1}",
            feature.Id, before.Length, feature.Title.Length, request.CallerUserId, versionBefore, feature.Version);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
