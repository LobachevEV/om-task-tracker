using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Create;

public class CreateFeatureHandler(FeaturesDbContext db, TimeProvider timeProvider) : FeatureCreator.FeatureCreatorBase
{
    public override async Task<FeatureDto> Create(CreateFeatureRequest request, ServerCallContext context)
    {
        var plannedStart = PlannedDate.Parse(request.PlannedStart);
        var plannedEnd   = PlannedDate.Parse(request.PlannedEnd);

        var feature = new Feature
        {
            Title         = request.Title.Trim(),
            Description   = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            State         = (int)FeatureState.CsApproving,
            PlannedStart  = plannedStart,
            PlannedEnd    = plannedEnd,
            LeadUserId    = request.LeadUserId > 0 ? request.LeadUserId : request.ManagerUserId,
            ManagerUserId = request.ManagerUserId,
        };

        FeatureStageLayout.Materialize(feature, timeProvider.GetUtcNow().UtcDateTime);

        db.Features.Add(feature);
        await db.SaveChangesAsync(context.CancellationToken);

        var dto = feature.Adapt<FeatureDto>();
        dto.Taxonomy = FeatureMappingConfig.BuildProtoTaxonomy(feature);
        return dto;
    }
}
