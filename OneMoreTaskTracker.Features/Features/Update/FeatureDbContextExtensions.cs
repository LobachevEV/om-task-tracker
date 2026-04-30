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

        public async Task SaveGateAsync(
            FeatureGate gate,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(gate).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(gate.Version)));
            }
        }

        public async Task SaveSubStageAsync(
            FeatureSubStage subStage,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(subStage).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(subStage.Version)));
            }
        }

        public async Task<Feature> LoadFeatureWithTaxonomyAsync(
            int featureId,
            CancellationToken cancellationToken)
        {
            return await db.Features
                       .Include(f => f.Gates)
                       .Include(f => f.SubStages)
                       .FirstOrDefaultAsync(f => f.Id == featureId, cancellationToken)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {featureId} not found"));
        }
    }
}
