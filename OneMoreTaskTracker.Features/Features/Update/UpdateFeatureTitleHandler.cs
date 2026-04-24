using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureTitleCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

// Inline-edit per-field PATCH handler for `title`.
//
// Contract: api-contract.md § "PATCH /api/plan/features/{id}/title".
// Gateway forwards the authenticated caller id + If-Match version.
// This handler:
//   1. Loads the feature (404 if unknown).
//   2. Re-verifies feature ownership (PermissionDenied if caller != manager).
//   3. Trims title server-side; rejects empty-after-trim as InvalidArgument.
//   4. Bumps Feature.Version + UpdatedAt; translates
//      DbUpdateConcurrencyException → AlreadyExists (409) on version clash.
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

        // Double-defense: the Features service independently re-verifies ownership.
        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        // Advisory optimistic-concurrency check for iter 1: only reject when the
        // client sent an If-Match and it doesn't match. Missing header (0) falls
        // through to last-write-wins (api-contract.md § "Optimistic Concurrency").
        if (request.ExpectedVersion > 0 && request.ExpectedVersion != feature.Version)
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
            // Another writer bumped Version between our SELECT and UPDATE.
            // Surface as AlreadyExists → HTTP 409 (gateway middleware). We
            // re-read the freshly-committed version so the gateway can
            // propagate conflict.currentVersion without guessing.
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
