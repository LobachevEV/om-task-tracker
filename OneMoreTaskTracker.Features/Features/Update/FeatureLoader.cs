using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class FeatureLoader
{
    public static async Task<Feature> LoadFeatureWithStagePlansAsync(
        this FeaturesDbContext db,
        int featureId,
        CancellationToken cancellationToken)
    {
        return await db.Features
                   .Include(f => f.StagePlans)
                   .FirstOrDefaultAsync(f => f.Id == featureId, cancellationToken)
               ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {featureId} not found"));
    }

    public static FeatureStagePlan ResolveStage(this Feature feature, int stageOrdinal, string stageDisplay)
    {
        return feature.StagePlans.FirstOrDefault(sp => sp.Stage == stageOrdinal)
               ?? throw new RpcException(new Status(StatusCode.NotFound, $"stage {stageDisplay} not found"));
    }
}
