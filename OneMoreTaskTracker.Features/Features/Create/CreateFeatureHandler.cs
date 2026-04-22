using Grpc.Core;
using Mapster;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.CreateFeatureCommand;

namespace OneMoreTaskTracker.Features.Features.Create;

public class CreateFeatureHandler(FeaturesDbContext db) : FeatureCreator.FeatureCreatorBase
{
    public override async Task<FeatureDto> Create(CreateFeatureRequest request, ServerCallContext context)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "title is required"));
        if (request.ManagerUserId <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "manager_user_id is required"));

        var feature = new Feature
        {
            Title         = request.Title.Trim(),
            Description   = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            State         = (int)FeatureState.CsApproving,
            PlannedStart  = FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start"),
            PlannedEnd    = FeatureValidation.ParseOptionalDate(request.PlannedEnd,   "planned_end"),
            LeadUserId    = request.LeadUserId > 0 ? request.LeadUserId : request.ManagerUserId,
            ManagerUserId = request.ManagerUserId,
        };

        FeatureValidation.ValidateDateOrder(feature.PlannedStart, feature.PlannedEnd);

        db.Features.Add(feature);
        await db.SaveChangesAsync(context.CancellationToken);

        return feature.Adapt<FeatureDto>();
    }
}
