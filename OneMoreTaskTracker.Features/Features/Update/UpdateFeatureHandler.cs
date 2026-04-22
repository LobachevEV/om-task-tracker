using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.UpdateFeatureCommand;
using ProtoFeatureState = OneMoreTaskTracker.Proto.Features.FeatureState;

namespace OneMoreTaskTracker.Features.Features.Update;

public class UpdateFeatureHandler(FeaturesDbContext db) : FeatureUpdater.FeatureUpdaterBase
{
    public override async Task<FeatureDto> Update(UpdateFeatureRequest request, ServerCallContext context)
    {
        var feature = await db.Features.FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        if (string.IsNullOrWhiteSpace(request.Title))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "title is required"));

        feature.Title        = request.Title.Trim();
        feature.Description  = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        feature.State        = ProtoStateToEntity(request.State);
        feature.PlannedStart = FeatureValidation.ParseOptionalDate(request.PlannedStart, "planned_start");
        feature.PlannedEnd   = FeatureValidation.ParseOptionalDate(request.PlannedEnd,   "planned_end");
        feature.LeadUserId   = request.LeadUserId > 0 ? request.LeadUserId : feature.LeadUserId;
        feature.UpdatedAt    = DateTime.UtcNow;
        // manager_user_id is intentionally NOT mutated — ownership transfer is out of scope (spec 03 §170).

        FeatureValidation.ValidateDateOrder(feature.PlannedStart, feature.PlannedEnd);

        await db.SaveChangesAsync(context.CancellationToken);
        return feature.Adapt<FeatureDto>();
    }

    // feature_state.proto shares ordinals with the C# FeatureState enum (no UNSPECIFIED member),
    // so the cast is a simple (int). We still guard against out-of-range values that would arise
    // if the wire carries an unknown enum value.
    private static int ProtoStateToEntity(ProtoFeatureState s)
    {
        if (!Enum.IsDefined(typeof(ProtoFeatureState), s))
            throw new RpcException(new Status(StatusCode.InvalidArgument, "state is required"));
        return (int)s;
    }
}
