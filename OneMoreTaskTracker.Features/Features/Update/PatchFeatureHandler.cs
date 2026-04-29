using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureHandler> logger) : FeaturePatcher.FeaturePatcherBase
{
    public override async Task<FeatureDto> Patch(PatchFeatureRequest request, ServerCallContext context)
    {
        string? trimmedTitle = request.HasTitle ? (request.Title ?? string.Empty).Trim() : null;

        string? normalizedDescription = null;
        if (request.HasDescription)
        {
            var trimmed = (request.Description ?? string.Empty).TrimEnd();
            normalizedDescription = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (request.HasExpectedVersion && request.ExpectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));

        var now = DateTime.UtcNow;
        var anyMutation = false;

        if (request.HasTitle)
        {
            feature.RenameTitle(trimmedTitle!, now);
            anyMutation = true;
        }

        if (request.HasDescription)
        {
            feature.SetDescription(normalizedDescription, now);
            anyMutation = true;
        }

        if (request.HasLeadUserId)
        {
            feature.AssignLead(request.LeadUserId, now);
            anyMutation = true;
        }

        if (anyMutation)
        {
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
                "Feature patch applied: feature_id={FeatureId} fields_title={HasTitle} fields_description={HasDescription} fields_lead={HasLead} title_len={TitleLen} description_len={DescLen} lead={Lead} actor_user_id={ActorUserId} version={Version}",
                feature.Id,
                request.HasTitle,
                request.HasDescription,
                request.HasLeadUserId,
                feature.Title.Length,
                feature.Description?.Length ?? 0,
                feature.LeadUserId,
                request.CallerUserId,
                feature.Version);
        }

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
