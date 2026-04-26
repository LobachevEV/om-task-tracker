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

        // Aggregate from FeatureStagePlans, not Feature.PlannedStart/PlannedEnd:
        // the feature-level dates are denormalized and can hold stale legacy
        // values for features whose stages were never planned. Per the brief,
        // bounds = min/max of stage plannedStart/plannedEnd.
        var bounds = await (
                from sp in db.FeatureStagePlans.AsNoTracking()
                join f in db.Features.AsNoTracking() on sp.FeatureId equals f.Id
                where f.ManagerUserId == request.ManagerUserId
                group sp by 1 into g
                select new
                {
                    Earliest = g.Min(x => x.PlannedStart),
                    Latest = g.Max(x => x.PlannedEnd),
                })
            .FirstOrDefaultAsync(context.CancellationToken);

        if (bounds?.Earliest is { } e)
            response.EarliestPlannedStart = e.ToString("yyyy-MM-dd");
        if (bounds?.Latest is { } l)
            response.LatestPlannedEnd = l.ToString("yyyy-MM-dd");

        return response;
    }
}
