using Grpc.Core;
using Mapster;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features.ListFeaturesQuery;

namespace OneMoreTaskTracker.Features.Features.List;

public class ListFeaturesHandler(FeaturesDbContext db) : FeaturesLister.FeaturesListerBase
{
    public override async Task<ListFeaturesResponse> List(ListFeaturesRequest request, ServerCallContext context)
    {
        // Include stage plans once per query — EF Core expands this into a single
        // LEFT JOIN with ~5x row fan-out, acceptable for iteration 1 (see
        // backend-plan.md Performance Budget). If feature count grows past 1000
        // this becomes a candidate for AsSplitQuery, not today.
        IQueryable<Feature> q = db.Features.AsNoTracking()
            .Include(f => f.StagePlans);

        if (request.ManagerUserId > 0)
            q = q.Where(f => f.ManagerUserId == request.ManagerUserId);

        // Window semantics (spec 04 §61–65):
        //   window_start inclusive on PlannedEnd   (exclude features that finished before the window began),
        //   window_end   exclusive on PlannedStart (exclude features that start at/after the window ends).
        //   Features with null planned dates are always included (unscheduled bucket).
        if (TryParseDate(request.WindowStart, out var start))
            q = q.Where(f => f.PlannedEnd   == null || f.PlannedEnd   >= start);
        if (TryParseDate(request.WindowEnd, out var end))
            q = q.Where(f => f.PlannedStart == null || f.PlannedStart <  end);

        // Order by PlannedStart nulls-last, then Id. DateOnly.MaxValue does not translate to
        // Npgsql, so we use the composite `(PlannedStart == null) ASC, PlannedStart ASC, Id ASC`
        // pattern which both providers (InMemory + Npgsql) translate correctly.
        q = q.OrderBy(f => f.PlannedStart == null)
             .ThenBy(f => f.PlannedStart)
             .ThenBy(f => f.Id);

        var rows = await q.ToListAsync(context.CancellationToken);

        var response = new ListFeaturesResponse();
        foreach (var row in rows)
        {
            var dto = row.Adapt<FeatureDto>();
            dto.StagePlans.Add(FeatureMappingConfig.BuildProtoStagePlans(row));
            response.Features.Add(dto);
        }
        return response;
    }

    private static bool TryParseDate(string raw, out DateOnly value)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            value = default;
            return false;
        }
        return DateOnly.TryParseExact(raw, "yyyy-MM-dd", out value);
    }
}
