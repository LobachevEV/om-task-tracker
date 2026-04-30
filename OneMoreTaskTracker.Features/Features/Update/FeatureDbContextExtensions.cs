using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;

namespace OneMoreTaskTracker.Features.Features.Update;

public static class FeatureDbContextExtensions
{
    extension(FeaturesDbContext db)
    {
        public async Task SaveFeatureAsync(
            Feature feature,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(feature).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(feature.Version)));
            }
        }
        
        public async Task SaveStageAsync(
            FeatureStagePlan plan,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(plan).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(plan.Version)));
            }
        }
        
        public async Task<Feature> LoadFeatureWithStagePlansAsync(
            int featureId,
            CancellationToken cancellationToken)
        {
            return await db.Features
                       .Include(f => f.StagePlans)
                       .FirstOrDefaultAsync(f => f.Id == featureId, cancellationToken)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {featureId} not found"));
        }
    }
}
