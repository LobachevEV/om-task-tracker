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
    private const int TitleMaxLength = 200;
    private const int DescriptionMaxLength = 4000;

    public override async Task<FeatureDto> Patch(PatchFeatureRequest request, ServerCallContext context)
    {
        if (request.Id <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id is required"));

        string? trimmedTitle = null;
        if (request.HasTitle)
        {
            trimmedTitle = (request.Title ?? string.Empty).Trim();
            if (trimmedTitle.Length == 0)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "title is required"));
            if (trimmedTitle.Length > TitleMaxLength)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "title too long"));
        }

        string? normalizedDescription = null;
        if (request.HasDescription)
        {
            var raw = request.Description ?? string.Empty;
            if (raw.Length > DescriptionMaxLength)
                throw new RpcException(new Status(StatusCode.InvalidArgument, "description too long"));
            var trimmed = raw.TrimEnd();
            normalizedDescription = string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

        if (request.HasLeadUserId && request.LeadUserId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "lead_user_id is required"));

        var feature = await db.Features
                          .Include(f => f.StagePlans)
                          .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
                      ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (request.CallerUserId <= 0 || feature.ManagerUserId != request.CallerUserId)
            throw new RpcException(new Status(StatusCode.PermissionDenied, "Not the feature owner"));

        if (request.HasExpectedVersion && request.ExpectedVersion != feature.Version)
            throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));

        var versionBefore = feature.Version;
        var titleLenBefore = feature.Title.Length;
        var descriptionLenBefore = feature.Description?.Length ?? 0;
        var leadBefore = feature.LeadUserId;

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
                "Feature patch applied: feature_id={FeatureId} fields_title={HasTitle} fields_description={HasDescription} fields_lead={HasLead} title_len_before={TitleBefore} title_len_after={TitleAfter} description_len_before={DescBefore} description_len_after={DescAfter} lead_before={LeadBefore} lead_after={LeadAfter} actor_user_id={ActorUserId} version_before={V0} version_after={V1}",
                feature.Id,
                request.HasTitle,
                request.HasDescription,
                request.HasLeadUserId,
                titleLenBefore,
                feature.Title.Length,
                descriptionLenBefore,
                feature.Description?.Length ?? 0,
                leadBefore,
                feature.LeadUserId,
                request.CallerUserId,
                versionBefore,
                feature.Version);
        }

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
