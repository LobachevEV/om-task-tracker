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
        // Include stage plans (single LEFT JOIN) so every read path returns
        // exactly 5 rows per feature without a second round-trip. Canonical
        // ordering by Stage is applied inside the Mapster projection so the
        // in-memory collection order cannot drift between providers.
        var feature = await db.Features.AsNoTracking()
            .Include(f => f.StagePlans)
            .FirstOrDefaultAsync(f => f.Id == request.Id, context.CancellationToken)
            ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {request.Id} not found"));

        var dto = feature.Adapt<FeatureDto>();
        dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(feature));
        return dto;
    }
}
