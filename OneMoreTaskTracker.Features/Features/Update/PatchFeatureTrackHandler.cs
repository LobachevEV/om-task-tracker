using Grpc.Core;
using Microsoft.EntityFrameworkCore;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureTrackHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureTrackHandler> logger,
    IRequestClock clock) : FeatureTrackPatcher.FeatureTrackPatcherBase
{
    public override async Task<FeatureTrackDto> Patch(PatchFeatureTrackRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTracksAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var kindOrdinal = (int)request.Kind;
        var track = feature.Tracks.FirstOrDefault(t => t.Kind == kindOrdinal);

        if (track is null)
        {
            var now = clock.GetUtcNow();
            track = FeatureTrack.Create(
                request.FeatureId,
                kindOrdinal,
                request.HasTrackOwnerUserId ? request.TrackOwnerUserId : request.CallerUserId,
                now);
            db.FeatureTracks.Add(track);
            await db.SaveTrackAsync(track, context.CancellationToken);

            logger.LogInformation(
                "Feature track created: feature_id={FeatureId} kind={Kind} owner_user_id={Owner} actor_user_id={ActorUserId} track_version={TrackVersion}",
                feature.Id, request.Kind, track.TrackOwnerUserId, request.CallerUserId, track.Version);

            return FeatureMappingConfig.BuildProtoTrack(track);
        }

        FeatureVersionGuard.EnsureTrackVersion(track, request.HasExpectedVersion, request.ExpectedVersion);

        var anyMutation = false;

        if (request.HasTrackOwnerUserId && request.TrackOwnerUserId != track.TrackOwnerUserId)
        {
            var now = clock.GetUtcNow();
            track.AssignOwner(request.TrackOwnerUserId, now);
            anyMutation = true;
        }

        if (anyMutation)
        {
            await db.SaveTrackAsync(track, context.CancellationToken);

            logger.LogInformation(
                "Feature track patch applied: feature_id={FeatureId} kind={Kind} owner_user_id={Owner} actor_user_id={ActorUserId} track_version={TrackVersion}",
                feature.Id, request.Kind, track.TrackOwnerUserId, request.CallerUserId, track.Version);
        }

        return FeatureMappingConfig.BuildProtoTrack(track);
    }
}
