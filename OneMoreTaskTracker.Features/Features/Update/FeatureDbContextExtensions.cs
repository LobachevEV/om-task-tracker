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
        
        public async Task<Feature> LoadFeatureWithTracksAsync(
            int featureId,
            CancellationToken cancellationToken)
        {
            return await db.Features
                       .Include(f => f.Tracks)
                       .ThenInclude(t => t.Stages)
                       .FirstOrDefaultAsync(f => f.Id == featureId, cancellationToken)
                   ?? throw new RpcException(new Status(StatusCode.NotFound, $"feature {featureId} not found"));
        }

        public async Task SaveTrackAsync(
            FeatureTrack track,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(track).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(track.Version)));
            }
        }

        public async Task SaveTrackStageAsync(
            FeatureTrackStage stage,
            CancellationToken cancellationToken)
        {
            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateConcurrencyException)
            {
                await db.Entry(stage).ReloadAsync(cancellationToken);
                throw new RpcException(new Status(StatusCode.AlreadyExists, ConflictDetail.VersionMismatch(stage.Version)));
            }
        }
    }
}
