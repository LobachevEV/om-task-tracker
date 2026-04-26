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

        var bounds = await db.Features.AsNoTracking()
            .Where(f => f.ManagerUserId == request.ManagerUserId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Earliest = g.Min(f => f.PlannedStart),
                Latest = g.Max(f => f.PlannedEnd),
            })
            .FirstOrDefaultAsync(context.CancellationToken);

        if (bounds?.Earliest is { } e)
            response.EarliestPlannedStart = e.ToString("yyyy-MM-dd");
        if (bounds?.Latest is { } l)
            response.LatestPlannedEnd = l.ToString("yyyy-MM-dd");

        return response;
    }
}
