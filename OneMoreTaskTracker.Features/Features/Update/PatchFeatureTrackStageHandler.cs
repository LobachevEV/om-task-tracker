using Grpc.Core;
using OneMoreTaskTracker.Features.Features.Data;
using OneMoreTaskTracker.Proto.Features;
using OneMoreTaskTracker.Proto.Features.PatchFeatureTrackStageCommand;

namespace OneMoreTaskTracker.Features.Features.Update;

public sealed class PatchFeatureTrackStageHandler(
    FeaturesDbContext db,
    ILogger<PatchFeatureTrackStageHandler> logger,
    IRequestClock clock) : FeatureTrackStagePatcher.FeatureTrackStagePatcherBase
{
    public override async Task<FeatureTrackDto> Patch(PatchFeatureTrackStageRequest request, ServerCallContext context)
    {
        var feature = await db.LoadFeatureWithTracksAsync(request.FeatureId, context.CancellationToken);
        FeatureOwnershipGuard.EnsureManager(feature, request.CallerUserId);

        var kindOrdinal = (int)request.Kind;
        var track = feature.Tracks.FirstOrDefault(t => t.Kind == kindOrdinal);

        if (track is null)
        {
            var now = clock.GetUtcNow();
            track = FeatureTrack.Create(request.FeatureId, kindOrdinal, request.CallerUserId, now);
            db.FeatureTracks.Add(track);
            await db.SaveChangesAsync(context.CancellationToken);
        }

        var stageKeyOrdinal = (int)request.StageKey;

        if (request.HasPlannedStart || request.HasPlannedEnd)
        {
            var stage = track.Stages.FirstOrDefault(s => s.StageKey == stageKeyOrdinal);
            var prospectiveStart = request.HasPlannedStart
                ? PlannedDate.Parse(request.PlannedStart)
                : stage?.PlannedStart;
            var prospectiveEnd = request.HasPlannedEnd
                ? PlannedDate.Parse(request.PlannedEnd)
                : stage?.PlannedEnd;

            var snapshots = track.Stages
                .Select(s => s.StageKey == stageKeyOrdinal
                    ? new TrackStageSnapshot(s.StageKey, prospectiveStart, prospectiveEnd)
                    : new TrackStageSnapshot(s.StageKey, s.PlannedStart, s.PlannedEnd))
                .ToList();

            if (!snapshots.Any(s => s.StageKey == stageKeyOrdinal))
                snapshots.Add(new TrackStageSnapshot(stageKeyOrdinal, prospectiveStart, prospectiveEnd));

            EnsureStageOrder(snapshots, stageKeyOrdinal);
        }

        var existingStage = track.Stages.FirstOrDefault(s => s.StageKey == stageKeyOrdinal);

        if (existingStage is null)
        {
            var now = clock.GetUtcNow();
            var newStage = FeatureTrackStage.Create(track.Id, stageKeyOrdinal, now);
            db.FeatureTrackStages.Add(newStage);

            if (request.HasStageOwnerUserId)
                newStage.AssignOwner(request.StageOwnerUserId, now);
            if (request.HasPlannedStart)
                newStage.SetPlannedStart(PlannedDate.Parse(request.PlannedStart), now);
            if (request.HasPlannedEnd)
                newStage.SetPlannedEnd(PlannedDate.Parse(request.PlannedEnd), now);

            track.Touch(now);
            await db.SaveTrackStageAsync(newStage, context.CancellationToken);

            logger.LogInformation(
                "Feature track stage created: feature_id={FeatureId} kind={Kind} stage_key={StageKey} actor_user_id={ActorUserId} stage_version={StageVersion}",
                feature.Id, request.Kind, request.StageKey, request.CallerUserId, newStage.Version);

            await db.Entry(track).ReloadAsync(context.CancellationToken);
            return FeatureMappingConfig.BuildProtoTrack(track);
        }

        FeatureVersionGuard.EnsureTrackStageVersion(existingStage, request.HasExpectedStageVersion, request.ExpectedStageVersion);

        var anyMutation = false;
        var mutationNow = clock.GetUtcNow();

        if (request.HasStageOwnerUserId)
        {
            existingStage.AssignOwner(request.StageOwnerUserId, mutationNow);
            anyMutation = true;
        }

        if (request.HasPlannedStart)
        {
            existingStage.SetPlannedStart(PlannedDate.Parse(request.PlannedStart), mutationNow);
            anyMutation = true;
        }

        if (request.HasPlannedEnd)
        {
            existingStage.SetPlannedEnd(PlannedDate.Parse(request.PlannedEnd), mutationNow);
            anyMutation = true;
        }

        if (anyMutation)
        {
            track.Touch(mutationNow);
            await db.SaveTrackStageAsync(existingStage, context.CancellationToken);

            logger.LogInformation(
                "Feature track stage patch applied: feature_id={FeatureId} kind={Kind} stage_key={StageKey} actor_user_id={ActorUserId} stage_version={StageVersion}",
                feature.Id, request.Kind, request.StageKey, request.CallerUserId, existingStage.Version);
        }

        return FeatureMappingConfig.BuildProtoTrack(track);
    }

    private static void EnsureStageOrder(IReadOnlyList<TrackStageSnapshot> stages, int mutatedKey)
    {
        var ordered = stages.OrderBy(s => s.StageKey).ToArray();

        for (int i = 0; i < ordered.Length - 1; i++)
        {
            var earlier = ordered[i];
            var later = ordered[i + 1];

            if (earlier.PlannedEnd is not { } earlierEnd) continue;
            if (later.PlannedStart is not { } laterStart) continue;

            if (laterStart < earlierEnd)
            {
                var neighbourKeyOrdinal = mutatedKey == earlier.StageKey ? later.StageKey : earlier.StageKey;
                throw new RpcException(new Status(
                    StatusCode.FailedPrecondition,
                    ConflictDetail.StageOrderOverlap(StageKeyName(neighbourKeyOrdinal))));
            }
        }
    }

    private static string StageKeyName(int ordinal) => ordinal switch
    {
        1 => "SrApproving",
        2 => "CsApproving",
        3 => "Development",
        4 => "StandTesting",
        5 => "EthalonTesting",
        6 => "ReleaseToLive",
        _ => ordinal.ToString()
    };

    private readonly record struct TrackStageSnapshot(
        int StageKey,
        DateOnly? PlannedStart,
        DateOnly? PlannedEnd);
}
