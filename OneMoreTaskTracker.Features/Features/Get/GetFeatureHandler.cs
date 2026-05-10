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
        var feature = await db.Features.AsNoTracking()
            .Include(f => f.Tracks)
            .ThenInclude(t => t.Stages)
            .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        var dto = feature.Adapt<FeatureDto>();
        dto.Tracks.AddRange(FeatureMappingConfig.BuildProtoTracks(feature));
        return dto;
    }
}
