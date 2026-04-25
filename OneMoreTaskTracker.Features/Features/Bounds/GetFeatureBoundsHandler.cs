using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.GetFeatureBoundsQuery;

namespace OneMoreTaskTracker.Features.Features.Bounds;

public class GetFeatureBoundsHandler(FeaturesDbContext db) : BoundsGetter.BoundsGetterBase
{
    public override async Task<GetFeatureBoundsResponse> Get(GetFeatureBoundsRequest request, ServerCallContext context)
    {
        var response = new GetFeatureBoundsResponse
        {
            EarliestPlannedStart = string.Empty,
            LatestPlannedEnd = string.Empty,
        };

        if (request.ManagerUserId <= 0)
            return response;

        var query = db.Features.AsNoTracking()
            .Where(f => f.ManagerUserId == request.ManagerUserId);

        var earliest = await query
            .Where(f => f.PlannedStart != null)
            .MinAsync(f => (DateOnly?)f.PlannedStart, context.CancellationToken);

        var latest = await query
            .Where(f => f.PlannedEnd != null)
            .MaxAsync(f => (DateOnly?)f.PlannedEnd, context.CancellationToken);

        if (earliest is { } e)
            response.EarliestPlannedStart = e.ToString("yyyy-MM-dd");
        if (latest is { } l)
            response.LatestPlannedEnd = l.ToString("yyyy-MM-dd");

        return response;
    }
}
