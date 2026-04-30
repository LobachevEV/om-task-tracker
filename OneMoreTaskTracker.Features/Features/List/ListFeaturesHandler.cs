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
        IQueryable<Feature> q = db.Features.AsNoTracking()
            .Include(f => f.StagePlans);

        if (request.ManagerUserId > 0)
            q = q.Where(f => f.ManagerUserId == request.ManagerUserId);

        if (!string.IsNullOrEmpty(request.State))
        {
            if (Enum.TryParse<FeatureState>(request.State, ignoreCase: true, out var stateFilter)
                && Enum.IsDefined(typeof(FeatureState), stateFilter))
            {
                var stateValue = (int)stateFilter;
                q = q.Where(f => f.State == stateValue);
            }
            else
            {
                q = q.Where(_ => false);
            }
        }

        if (string.Equals(request.Scope, "mine", StringComparison.OrdinalIgnoreCase) && request.CallerUserId > 0)
            q = q.Where(f => f.LeadUserId == request.CallerUserId || f.ManagerUserId == request.CallerUserId);

        if (TryParseDate(request.WindowStart, out var start))
            q = q.Where(f => f.PlannedEnd   == null || f.PlannedEnd   >= start);
        if (TryParseDate(request.WindowEnd, out var end))
            q = q.Where(f => f.PlannedStart == null || f.PlannedStart <  end);

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
