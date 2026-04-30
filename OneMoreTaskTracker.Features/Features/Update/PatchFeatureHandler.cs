using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.PatchFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureHandler> logger,
    IRequestClock clock) : FeaturePatcher.FeaturePatcherBase
{
    public override async Task<FeatureDto> Patch(PatchFeatureRequest request, ServerCallContext context)
    {
        var feature = await FeatureLoader.LoadWithStagePlansAsync(db, request.Id, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);
        FeatureVersionGuard.EnsureFeatureVersion(feature, request.HasExpectedVersion, request.ExpectedVersion);

        var now = clock.GetUtcNow();
        var anyMutation = false;

        if (request.HasTitle)
        {
            feature.RenameTitle((request.Title ?? string.Empty).Trim(), now);
            anyMutation = true;
        }

        if (request.HasDescription)
        {
            var trimmed = (request.Description ?? string.Empty).TrimEnd();
            feature.SetDescription(string.IsNullOrWhiteSpace(trimmed) ? null : trimmed, now);
            anyMutation = true;
        }

        if (request.HasLeadUserId)
        {
            feature.AssignLead(request.LeadUserId, now);
            anyMutation = true;
        }

        if (anyMutation)
        {
            await FeatureConcurrencySaver.SaveFeatureAsync(db, feature, context.CancellationToken);

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
