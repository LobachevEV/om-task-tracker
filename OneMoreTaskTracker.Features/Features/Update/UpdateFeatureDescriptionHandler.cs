using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureDescriptionCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

// Inline-edit per-field PATCH handler for `description`.
// Contract: api-contract.md § "PATCH /api/plan/features/{id}/description".
// Empty string → null (matches feature.Description nullable semantics).
// NEVER log the raw description (PII); log only length.
public sealed class UpdateFeatureDescriptionHandler(
    FeaturesDbContext db,
    ILogger<UpdateFeatureDescriptionHandler> logger) : FeatureDescriptionUpdater.FeatureDescriptionUpdaterBase
{
    private const int DescriptionMaxLength = 4000;

    public override async Task<FeatureDto> Update(UpdateFeatureDescriptionRequest request, ServerCallContext context)
    {
        if (request.Id <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id is required"));

        var raw = request.Description ?? string.Empty;
        if (raw.Length > DescriptionMaxLength)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "description too long"));

        // Trim trailing whitespace only (leading whitespace preserved for indented
        // markdown-free plaintext per api-contract.md); empty after trim → null.
        var trimmed = raw.TrimEnd();
        string? normalized = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (request.HasExpectedVersion && request.ExpectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));

        var versionBefore = feature.Version;
        var lenBefore = feature.Description?.Length ?? 0;
        feature.Description = normalized;
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

        // PII-safe log: length only, never the raw text (see backend-plan.md
        // § Observability and backend-eval-contract.md §73 description_length).
        var descriptionLength = feature.Description?.Length ?? 0;
        logger.LogInformation(
            "Feature inline edit applied: feature_id={FeatureId} field=description description_length={DescriptionLength} description_len_before={Before} description_len_after={After} actor_user_id={ActorUserId} version_before={V0} version_after={V1}",
            feature.Id, descriptionLength, lenBefore, descriptionLength, request.CallerUserId, versionBefore, feature.Version);

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
