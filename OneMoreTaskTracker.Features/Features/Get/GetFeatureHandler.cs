using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.GetFeatureQuery;

namespace OneMoreTaskTracker.Features.Features.Get;

public class GetFeatureHandler(FeaturesDbContext db) : FeatureGetter.FeatureGetterBase
{
    public override async Task<FeatureDto> Get(GetFeatureRequest request, ServerCallContext context)
    {
        if (request.Id <= 0)
            throw new RpcException(new Status(StatusCode.InvalidArgument, "id is required"));

        var feature = await db.Features.AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        return feature.Adapt<FeatureDto>();
    }
}
